// Helper de Google Drive API v3 + Sheets API v4 con Service Account (sin OAuth flow).
// Soporta lectura Y escritura para sincronización bidireccional PAI ↔ Drive.
//
// Configuración requerida en env:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL   email del service account
//   GOOGLE_SERVICE_ACCOUNT_KEY     private_key del JSON (con \n literales OK)
//   GOOGLE_DRIVE_ROOT_FOLDER_ID    ID de la carpeta raíz del proyecto
//
// La carpeta de Drive debe compartirse con el service account en modo EDITOR
// (no Lector) para que la escritura funcione.
//
// Si faltan credenciales, las funciones de lectura retornan mocks; las de escritura
// retornan sin hacer nada.

import crypto from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DOCS_API  = "https://docs.googleapis.com/v1";
const SHEETS_API = "https://sheets.googleapis.com/v4";

// Scopes de escritura necesarios para backup bidireccional
const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

export type DriveFileLite = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
};

// Cache de access token en memoria de la lambda (válido 1h)
let cachedToken: { token: string; expiresAt: number } | null = null;
// Cache del ID del spreadsheet de backup
let cachedBackupSheetId: string | null = null;

export function driveDisponible(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  );
}

// ==================================================
// JWT manual con RS256 (sin dependencias extra)
// ==================================================
function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function obtenerAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "").replace(/\\n/g, "\n");
  const now        = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claim  = { iss: email, scope: SCOPES, aud: TOKEN_URL, exp: now + 3600, iat: now };

  const h = base64url(JSON.stringify(header));
  const c = base64url(JSON.stringify(claim));
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${h}.${c}`);
  sign.end();
  const jwt = `${h}.${c}.${base64url(sign.sign(privateKey))}`;

  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });

  if (!r.ok) throw new Error(`Google token error: ${r.status} ${await r.text()}`);
  const data = (await r.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

// ==================================================
// HTTP helpers (GET / POST / PUT / PATCH)
// ==================================================
async function getApi(url: string): Promise<unknown> {
  const token = await obtenerAccessToken();
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Drive GET error ${r.status}: ${await r.text()}`);
  return r.json();
}

async function postApi(url: string, body: unknown): Promise<unknown> {
  const token = await obtenerAccessToken();
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Drive POST error ${r.status}: ${await r.text()}`);
  return r.json();
}

async function putApi(url: string, body: unknown): Promise<unknown> {
  const token = await obtenerAccessToken();
  const r = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Drive PUT error ${r.status}: ${await r.text()}`);
  return r.json();
}

async function patchApi(url: string, body: unknown): Promise<unknown> {
  const token = await obtenerAccessToken();
  const r = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Drive PATCH error ${r.status}: ${await r.text()}`);
  return r.json();
}

// ==================================================
// Listado de archivos en carpeta (lectura)
// ==================================================
export async function listarArchivos(folderId?: string): Promise<DriveFileLite[]> {
  if (!driveDisponible()) return mockArchivos();
  const id = folderId ?? process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
  const q  = encodeURIComponent(`'${id}' in parents and trashed = false`);
  const f  = encodeURIComponent("files(id,name,mimeType,webViewLink,modifiedTime,size)");
  const data = (await getApi(
    `${DRIVE_API}/files?q=${q}&fields=${f}&pageSize=100&orderBy=modifiedTime desc`
  )) as { files: DriveFileLite[] };
  return data.files ?? [];
}

// ==================================================
// Leer contenido — Docs, Sheets, texto plano (lectura)
// ==================================================
export async function leerContenido(fileId: string, mimeType: string): Promise<string> {
  if (!driveDisponible()) return "";

  if (mimeType === "application/vnd.google-apps.document") {
    const data = (await getApi(`${DOCS_API}/documents/${fileId}`)) as {
      body?: { content?: Array<{ paragraph?: { elements?: Array<{ textRun?: { content?: string } }> } }> };
    };
    const partes: string[] = [];
    for (const elem of data.body?.content ?? []) {
      for (const p of elem.paragraph?.elements ?? []) {
        if (p.textRun?.content) partes.push(p.textRun.content);
      }
    }
    return partes.join("").trim();
  }

  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    const meta = (await getApi(
      `${SHEETS_API}/spreadsheets/${fileId}?fields=sheets.properties.title`
    )) as { sheets: Array<{ properties: { title: string } }> };
    const partes: string[] = [];
    for (const s of meta.sheets) {
      const range   = encodeURIComponent(s.properties.title);
      const valores = (await getApi(`${SHEETS_API}/spreadsheets/${fileId}/values/${range}`)) as { values?: string[][] };
      partes.push(`### Hoja: ${s.properties.title}`);
      for (const fila of valores.values ?? []) partes.push(fila.join("\t"));
    }
    return partes.join("\n");
  }

  if (mimeType.startsWith("text/")) {
    const token = await obtenerAccessToken();
    const r = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return "";
    return r.text();
  }

  return "";
}

// ==================================================
// Parser de Sheets a filas estructuradas (para import a cash_flow)
// ==================================================
export type FilaSheet = Record<string, string>;

export async function leerSheetComoFilas(fileId: string): Promise<FilaSheet[]> {
  if (!driveDisponible()) return [];
  const meta = (await getApi(
    `${SHEETS_API}/spreadsheets/${fileId}?fields=sheets.properties.title`
  )) as { sheets: Array<{ properties: { title: string } }> };
  const primera = meta.sheets[0]?.properties.title;
  if (!primera) return [];

  const range   = encodeURIComponent(primera);
  const valores = (await getApi(`${SHEETS_API}/spreadsheets/${fileId}/values/${range}`)) as { values?: string[][] };
  const filas   = valores.values ?? [];
  if (filas.length < 2) return [];

  const headers = filas[0].map((h) => h.toLowerCase().trim());
  return filas.slice(1).map((fila) => {
    const obj: FilaSheet = {};
    headers.forEach((h, i) => { obj[h] = fila[i] ?? ""; });
    return obj;
  });
}

// ==================================================
// Leer una pestaña específica del backup sheet (por nombre de tab)
// ==================================================
export async function leerTabDeSheet(
  spreadsheetId: string,
  tabName: string
): Promise<string[][]> {
  if (!driveDisponible()) return [];
  const range   = encodeURIComponent(`${tabName}`);
  const valores = (await getApi(
    `${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${range}`
  )) as { values?: string[][] };
  return valores.values ?? [];
}

// ==================================================
// Subcarpeta — encuentra o crea una carpeta dentro de otra
// ==================================================
export async function obtenerOCrearSubcarpeta(
  nombre: string,
  parentId: string
): Promise<string> {
  const q = encodeURIComponent(
    `name='${nombre}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const found = (await getApi(
    `${DRIVE_API}/files?q=${q}&fields=files(id)&pageSize=1`
  )) as { files: Array<{ id: string }> };
  if (found.files.length > 0) return found.files[0].id;

  const folder = (await postApi(`${DRIVE_API}/files`, {
    name: nombre,
    mimeType: "application/vnd.google-apps.folder",
    parents: [parentId],
  })) as { id: string };
  return folder.id;
}

// Busca un archivo (cualquier tipo) por nombre exacto dentro de una carpeta.
// Devuelve el ID si existe, null si no.
export async function buscarArchivoEnCarpeta(
  nombre: string,
  parentId: string
): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${nombre}' and '${parentId}' in parents and trashed=false`
  );
  const found = (await getApi(
    `${DRIVE_API}/files?q=${q}&fields=files(id)&pageSize=1`
  )) as { files: Array<{ id: string }> };
  return found.files[0]?.id ?? null;
}

// Crea un spreadsheet con las pestañas indicadas directamente en la carpeta destino.
export async function crearSpreadsheetEnCarpeta(
  nombre: string,
  tabs: string[],
  parentId: string
): Promise<string> {
  const sheet = (await postApi(`${SHEETS_API}/spreadsheets`, {
    properties: { title: nombre },
    sheets: tabs.map((t, i) => ({ properties: { title: t, sheetId: i } })),
  })) as { spreadsheetId: string };

  await patchApi(
    `${DRIVE_API}/files/${sheet.spreadsheetId}?addParents=${parentId}&removeParents=root`,
    {}
  );
  return sheet.spreadsheetId;
}

// ==================================================
// Backup sheet — encuentra o crea "PAI-Backup-JERONIMO"
// con 4 pestañas: Crew · Presupuesto · Equipos · CashFlow
// ==================================================
const BACKUP_NOMBRE = "PAI-Backup-JERONIMO";

export async function obtenerOCrearBackupSheet(): Promise<string> {
  if (cachedBackupSheetId) return cachedBackupSheetId;

  const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

  // Buscar hoja existente en la carpeta
  const q       = encodeURIComponent(`name='${BACKUP_NOMBRE}' and '${folderId}' in parents and trashed=false`);
  const found   = (await getApi(`${DRIVE_API}/files?q=${q}&fields=files(id)&pageSize=1`)) as { files: Array<{ id: string }> };
  if (found.files.length > 0) {
    cachedBackupSheetId = found.files[0].id;
    return cachedBackupSheetId!;
  }

  // Crear nueva hoja con las 4 pestañas
  const sheet = (await postApi(`${SHEETS_API}/spreadsheets`, {
    properties: { title: BACKUP_NOMBRE },
    sheets: [
      { properties: { title: "Crew",        sheetId: 0 } },
      { properties: { title: "Presupuesto", sheetId: 1 } },
      { properties: { title: "Equipos",     sheetId: 2 } },
      { properties: { title: "CashFlow",    sheetId: 3 } },
    ],
  })) as { spreadsheetId: string };

  // Mover al folder del proyecto (sacar de root del service account)
  await patchApi(
    `${DRIVE_API}/files/${sheet.spreadsheetId}?addParents=${folderId}&removeParents=root`,
    {}
  );

  cachedBackupSheetId = sheet.spreadsheetId;
  return cachedBackupSheetId!;
}

// ==================================================
// Escribir filas en una pestaña del backup sheet
// Limpia el contenido anterior antes de escribir.
// ==================================================
export type FilaValores = (string | number | boolean)[];

export async function escribirTabEnSheet(
  spreadsheetId: string,
  tabName: string,
  valores: FilaValores[]
): Promise<void> {
  const range = encodeURIComponent(tabName);

  // Limpiar pestaña
  await postApi(
    `${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${range}:clear`,
    {}
  );

  // Escribir datos
  await putApi(
    `${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    { values: valores }
  );
}

// ==================================================
// Mock data (cuando no hay credenciales configuradas)
// ==================================================
function mockArchivos(): DriveFileLite[] {
  return [
    { id: "mock-1", name: "Guion JERÓNIMO v3.docx (demo)", mimeType: "application/vnd.google-apps.document",   webViewLink: "#", modifiedTime: "2026-05-01T10:00:00Z" },
    { id: "mock-2", name: "Presupuesto Maestro.xlsx (demo)", mimeType: "application/vnd.google-apps.spreadsheet", webViewLink: "#", modifiedTime: "2026-05-05T15:30:00Z" },
    { id: "mock-3", name: "Carpeta Locaciones (demo)",       mimeType: "application/vnd.google-apps.folder",      webViewLink: "#", modifiedTime: "2026-04-20T09:00:00Z" },
  ];
}
