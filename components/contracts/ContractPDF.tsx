"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { Contract } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#d4af37",
    paddingBottom: 10,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  proyecto: { fontSize: 24, fontWeight: 700, color: "#d4af37" },
  sub: { fontSize: 9, color: "#666666", letterSpacing: 1 },
  meta: { fontSize: 9, color: "#555555", marginBottom: 14 },
  metaLabel: { fontWeight: 700, color: "#1a1a1a" },
  separador: {
    borderBottomWidth: 1,
    borderBottomColor: "#d4af37",
    marginBottom: 16,
    marginTop: 4,
  },
  body: {
    fontSize: 10,
    color: "#1a1a1a",
    lineHeight: 1.6,
    marginBottom: 4,
  },
  parrafo: {
    marginBottom: 8,
    fontSize: 10,
    lineHeight: 1.6,
  },
  firmasSection: {
    marginTop: 48,
    borderTopWidth: 1,
    borderTopColor: "#cccccc",
    paddingTop: 16,
  },
  firmasTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#888888",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 24,
  },
  firmasRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 40,
  },
  firmaCol: {
    flex: 1,
  },
  firmaLinea: {
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    marginBottom: 6,
    marginTop: 36,
  },
  firmaLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: "#1a1a1a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  firmaCampo: {
    fontSize: 8,
    color: "#666666",
    marginBottom: 3,
  },
  disclaimer: {
    marginTop: 32,
    borderTopWidth: 0.5,
    borderTopColor: "#cccccc",
    paddingTop: 10,
  },
  disclaimerText: {
    fontSize: 7,
    color: "#888888",
    lineHeight: 1.5,
    textAlign: "justify",
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 48,
    right: 48,
    fontSize: 7,
    color: "#aaaaaa",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#eeeeee",
    paddingTop: 6,
  },
});

export type ContractPDFProps = {
  contrato: Contract;
  proyecto: string;
};

export function ContractPDFDoc({ contrato, proyecto }: ContractPDFProps) {
  const hoy = new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Dividir el contenido en párrafos respetando saltos de línea
  const parrafos = (contrato.notes ?? "").split("\n").filter((p) => p.trim() !== "");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.proyecto}>{proyecto}</Text>
          <Text style={styles.sub}>CONTRATO</Text>
        </View>

        {/* Metadatos */}
        <Text style={styles.meta}>
          <Text style={styles.metaLabel}>Tipo: </Text>
          {contrato.type.toUpperCase()}{"   "}
          <Text style={styles.metaLabel}>  Generado: </Text>
          {hoy}
        </Text>

        <View style={styles.separador} />

        {/* Cuerpo del contrato */}
        {parrafos.map((p, i) => (
          <Text key={i} style={styles.parrafo}>{p}</Text>
        ))}

        {/* Bloque de firmas */}
        <View style={styles.firmasSection} wrap={false}>
          <Text style={styles.firmasTitle}>Firmas</Text>
          <View style={styles.firmasRow}>
            <View style={styles.firmaCol}>
              <View style={styles.firmaLinea} />
              <Text style={styles.firmaLabel}>El Contratante</Text>
              <Text style={styles.firmaCampo}>Nombre: ________________________</Text>
              <Text style={styles.firmaCampo}>Cédula: _________________________</Text>
              <Text style={styles.firmaCampo}>Fecha: __________________________</Text>
            </View>
            <View style={styles.firmaCol}>
              <View style={styles.firmaLinea} />
              <Text style={styles.firmaLabel}>El Contratado</Text>
              <Text style={styles.firmaCampo}>Nombre: ________________________</Text>
              <Text style={styles.firmaCampo}>Cédula: _________________________</Text>
              <Text style={styles.firmaCampo}>Fecha: __________________________</Text>
            </View>
          </View>
        </View>

        {/* Disclaimer legal */}
        <View style={styles.disclaimer} wrap={false}>
          <Text style={styles.disclaimerText}>
            AVISO LEGAL: Este documento fue generado con P.A.I. (Producer Assistant Intelligence) como herramienta de apoyo administrativo. No constituye asesoría jurídica profesional ni reemplaza la revisión de un abogado titulado. Las partes contratantes son responsables de verificar la validez y el cumplimiento legal de este contrato conforme a la normatividad colombiana vigente, incluyendo el Código Civil, el Código Sustantivo del Trabajo y las leyes especiales aplicables. P.A.I. y sus desarrolladores no asumen responsabilidad por el contenido legal de los documentos generados.
          </Text>
        </View>

        <Text style={styles.footer}>
          Generado por P.A.I. · Producer Assistant Intelligence · {proyecto}
        </Text>
      </Page>
    </Document>
  );
}

// Descarga el PDF en el navegador
export async function descargarContratoPDF(contrato: Contract, proyecto: string) {
  const blob = await pdf(<ContractPDFDoc contrato={contrato} proyecto={proyecto} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const nombre = contrato.name.replace(/[^a-zA-Z0-9\s\-áéíóúÁÉÍÓÚñÑ]/g, "").slice(0, 80);
  a.download = `contrato-${nombre}-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Genera el buffer del PDF (para envío por email desde servidor)
export async function contratoABuffer(contrato: Contract, proyecto: string): Promise<Buffer> {
  const blob = await pdf(<ContractPDFDoc contrato={contrato} proyecto={proyecto} />).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
