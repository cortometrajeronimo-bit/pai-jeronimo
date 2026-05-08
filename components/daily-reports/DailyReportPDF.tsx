"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { DailyReport } from "@/lib/types";
import { formatCOP, formatDate } from "@/lib/utils";

// Estética idéntica al CallSheetPDF: oscuro #1a1a1a + dorado #d4af37
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
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 14 },
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
  twoCol: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
    paddingVertical: 2,
  },
  cellName: { flex: 2, color: "#fff" },
  cellRole: { flex: 2, color: "#a3a3a3" },
  block: {
    backgroundColor: "#262626",
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    color: "#e6e6e6",
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#525252",
    textAlign: "center",
  },
  badgePresente: {
    color: "#16a34a",
    fontSize: 7,
    fontWeight: 700,
  },
  badgeAusente: {
    color: "#ef4444",
    fontSize: 7,
    fontWeight: 700,
  },
});

type CrewLite = { id: string; name: string; role: string };

function PDFDocument({
  report,
  proyecto,
  ubicacion,
  presentes,
  ausentes,
}: {
  report: DailyReport;
  proyecto: string;
  ubicacion: string;
  presentes: CrewLite[];
  ausentes: CrewLite[];
}) {
  const total = presentes.length + ausentes.length;
  const pct = total > 0 ? Math.round((presentes.length / total) * 100) : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.proyecto}>{proyecto}</Text>
            <Text style={styles.sub}>DAILY REPORT</Text>
          </View>
          <View>
            <Text style={styles.meta}>{formatDate(report.date)}</Text>
            <Text style={styles.meta}>{ubicacion}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            <Text style={styles.metaLabel}>Asistencia: </Text>
            {presentes.length}/{total} ({pct}%)
          </Text>
          <Text style={styles.meta}>
            <Text style={styles.metaLabel}>Gasto del día: </Text>
            {formatCOP(Number(report.expenses_total))}
          </Text>
          {report.scenes_completed && (
            <Text style={styles.meta}>
              <Text style={styles.metaLabel}>Escenas: </Text>
              {report.scenes_completed}
            </Text>
          )}
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Crew Presente ({presentes.length})</Text>
            {presentes.map((c) => (
              <View key={c.id} style={styles.row}>
                <Text style={styles.cellName}>{c.name}</Text>
                <Text style={styles.cellRole}>{c.role}</Text>
                <Text style={styles.badgePresente}>✓</Text>
              </View>
            ))}
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Crew Ausente ({ausentes.length})</Text>
            {ausentes.map((c) => (
              <View key={c.id} style={styles.row}>
                <Text style={styles.cellName}>{c.name}</Text>
                <Text style={styles.cellRole}>{c.role}</Text>
                <Text style={styles.badgeAusente}>✗</Text>
              </View>
            ))}
          </View>
        </View>

        {report.incidents && (
          <>
            <Text style={styles.sectionTitle}>Incidentes</Text>
            <View style={styles.block}>
              <Text>{report.incidents}</Text>
            </View>
          </>
        )}

        {report.notes && (
          <>
            <Text style={styles.sectionTitle}>Notas</Text>
            <View style={styles.block}>
              <Text>{report.notes}</Text>
            </View>
          </>
        )}

        <Text style={styles.footer}>
          Generado por P.A.I. — {new Date().toLocaleString("es-CO")}
        </Text>
      </Page>
    </Document>
  );
}

export async function generarDailyReportPDF(args: {
  report: DailyReport;
  proyecto: string;
  ubicacion: string;
  presentes: CrewLite[];
  ausentes: CrewLite[];
}) {
  const blob = await pdf(<PDFDocument {...args} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `daily-report-${args.report.date}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
