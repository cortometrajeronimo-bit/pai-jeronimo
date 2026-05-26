import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "pai-jeronimo-offline";
// v2: agregadas contracts, contract_templates, payments, daily_reports,
//     incidents, attendance, logbook, contactos, transport, catering,
//     project_documents (Fase 2)
const DB_VERSION = 2;

const TABLAS_CACHE = [
  "crew",
  "expenses",
  "cashflow",
  "equipment",
  "contracts",
  "contract_templates",
  "payments",
  "daily_reports",
  "incidents",
  "attendance",
  "logbook",
  "contactos",
  "transport",
  "catering",
  "project_documents",
] as const;

export type TablaCache = (typeof TABLAS_CACHE)[number];

export interface SyncItem {
  id?: number;
  table: string;
  action: "insert" | "update" | "delete";
  payload: unknown;
  timestamp: number;
}

export interface CachedRow {
  id: string;
  data: unknown;
  cachedAt: number;
}

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("sync-queue")) {
        const store = db.createObjectStore("sync-queue", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp");
      }
      for (const table of TABLAS_CACHE) {
        const storeName = `cache-${table}`;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "id" });
        }
      }
    },
  });
  return _db;
}

export async function enqueueChange(
  table: string,
  action: SyncItem["action"],
  payload: unknown
): Promise<void> {
  const db = await getDB();
  await db.add("sync-queue", { table, action, payload, timestamp: Date.now() });
}

export async function dequeueAll(): Promise<SyncItem[]> {
  const db = await getDB();
  return db.getAll("sync-queue");
}

export async function removeFromQueue(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("sync-queue", id);
}

export async function queueSize(): Promise<number> {
  const db = await getDB();
  return db.count("sync-queue");
}

export async function cacheRows(
  table: string,
  rows: { id: string; [key: string]: unknown }[]
): Promise<void> {
  const db = await getDB();
  const store = `cache-${table}`;
  if (!db.objectStoreNames.contains(store)) return;
  const tx = db.transaction(store, "readwrite");
  await tx.store.clear();
  for (const row of rows) {
    await tx.store.put({ id: row.id, data: row, cachedAt: Date.now() });
  }
  await tx.done;
}

export async function getCachedRows(table: string): Promise<unknown[]> {
  const db = await getDB();
  const store = `cache-${table}`;
  if (!db.objectStoreNames.contains(store)) return [];
  const all = await db.getAll(store);
  return all.map((r: CachedRow) => r.data);
}
