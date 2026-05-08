"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { CrewMember } from "@/lib/types";
import { departamentoDeRol } from "@/lib/departamentos";

// Estética oscura + dorado que replica el dashboard
const styles = StyleSheet.create({
  page: {
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#d4af37",
    paddingBottom: 8,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  proyecto: { fontSize: 22, fontWeight: 700, color: "#d4af37" },
  sub: { fontSize: 8, color: "#a3a3a3", letterSpacing: 1 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  meta: { fontSize: 9, color: "#a3a3a3" },
  metaLabel: { color: "#ffffff", fontWeight: 700 },
  sectionTitle: {
    color: "#d4af37",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 8,
    textTransform: "uppercase",
  },
  deptoTitle: {
    color: "#a3a3a3",
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  table: { width: "100%" },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#3a3a3a",
    paddingVertical: 3,
  },
  th: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d4af37",
    paddingVertical: 3,
  },
  cellName: { width: "26%", fontSize: 9 },
  cellRole: { width: "26%", fontSize: 9, color: "#a3a3a3" },
  cellTel: { width: "22%", fontSize: 9, color: "#a3a3a3" },
  cellMail: { width: "26%", fontSize: 9, color: "#a3a3a3" },
  thText: {
    color: "#a3a3a3",
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesBox: {
    backgroundColor: "#0a0a0a",
    borderWidth: 0.5,
    borderColor: "#3a3a3a",
    padding: 8,
    marginTop: 4,
  },
  notesText: { fontSize: 9, color: "#a3a3a3", lineHeight: 1.4 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#737373",
    textAlign: "center",
  },
});

function formatearFechaPDF(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export type CallSheetPDFProps = {
  proyecto: string;
  date: string;
  location: string;
  callTime: string;
  crew: CrewMember[];
  safetyNotes: string;
  weatherPlanB: string;
};

export function CallSheetPDFDoc(props: CallSheetPDFProps) {
  const { proyecto, date, location, callTime, crew, safetyNotes, weatherPlanB } =
    props;

  const grupos: Record<string, CrewMember[]> = {};
  for (const m of crew) {
    const d = departamentoDeRol(m.role);
    if (!grupos[d]) grupos[d] = [];
    grupos[d].push(m);
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.proyecto}>{proyecto}</Text>
          <Text style={styles.sub}>CALL SHEET</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            <Text style={styles.metaLabel}>Fecha: </Text>
            {formatearFechaPDF(date)}
          </Text>
          <Text style={styles.meta}>
            <Text style={styles.metaLabel}>  Locación: </Text>
            {location || "—"}
          </Text>
          <Text style={styles.meta}>
            <Text style={styles.metaLabel}>  Llamado: </Text>
            {callTime || "—"}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Crew · {crew.length}</Text>

        {Object.entries(grupos).map(([depto, miembros]) => (
          <View key={depto} wrap={false}>
            <Text style={styles.deptoTitle}>{depto}</Text>
            <View style={styles.table}>
              <View style={styles.th}>
                <Text style={[styles.cellName, styles.thText]}>Nombre</Text>
                <Text style={[styles.cellRole, styles.thText]}>Rol</Text>
                <Text style={[styles.cellTel, styles.thText]}>Tel</Text>
                <Text style={[styles.cellMail, styles.thText]}>Email</Text>
              </View>
              {miembros.map((m) => (
                <View key={m.id} style={styles.tr}>
                  <Text style={styles.cellName}>{m.name}</Text>
                  <Text style={styles.cellRole}>{m.role}</Text>
                  <Text style={styles.cellTel}>{m.phone ?? "—"}</Text>
                  <Text style={styles.cellMail}>{m.email ?? "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {safetyNotes ? (
          <View>
            <Text style={styles.sectionTitle}>Notas de seguridad</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{safetyNotes}</Text>
            </View>
          </View>
        ) : null}

        {weatherPlanB ? (
          <View>
            <Text style={styles.sectionTitle}>Plan B clima</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{weatherPlanB}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Generado por P.A.I. · Producer Assistant Intelligence
        </Text>
      </Page>
    </Document>
  );
}

// Genera y descarga el PDF en el navegador
export async function descargarCallSheetPDF(props: CallSheetPDFProps) {
  const blob = await pdf(<CallSheetPDFDoc {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = `call-sheet-${props.date || "borrador"}.pdf`;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
