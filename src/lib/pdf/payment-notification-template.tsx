import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { registerFonts } from "./fonts";

registerFonts();

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 10,
    padding: 40,
    color: "#1a1a1a",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 8,
    marginBottom: 4,
  },
  headerLine: {
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 9,
    color: "#555",
    width: 60,
  },
  metaValue: {
    fontSize: 9,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sectionBox: {
    width: "47%",
  },
  sectionTitle: {
    fontSize: 9,
    color: "#555",
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 2,
  },
  sectionText: {
    fontSize: 9,
    marginBottom: 2,
    lineHeight: 1.5,
  },
  nameText: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 3,
  },
  periodSection: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingVertical: 6,
    marginBottom: 15,
    textAlign: "center",
  },
  periodText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  colNo: { width: "8%", textAlign: "center", fontSize: 9 },
  colProject: { width: "22%", fontSize: 9 },
  colTitle: { width: "30%", fontSize: 9 },
  colCode: { width: "20%", fontSize: 9 },
  colAmount: { width: "20%", textAlign: "right", fontSize: 9 },
  colNoHeader: { width: "8%", textAlign: "center", fontSize: 8, fontWeight: "bold" },
  colProjectHeader: { width: "22%", fontSize: 8, fontWeight: "bold" },
  colTitleHeader: { width: "30%", fontSize: 8, fontWeight: "bold" },
  colCodeHeader: { width: "20%", fontSize: 8, fontWeight: "bold" },
  colAmountHeader: { width: "20%", textAlign: "right", fontSize: 8, fontWeight: "bold" },
  summarySection: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
    width: 250,
  },
  summaryLabel: {
    fontSize: 10,
    width: 150,
    textAlign: "right",
    paddingRight: 10,
  },
  summaryValue: {
    fontSize: 10,
    width: 100,
    textAlign: "right",
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 250,
    borderTopWidth: 2,
    borderTopColor: "#333",
    paddingTop: 5,
    marginTop: 3,
  },
  summaryTotalLabel: {
    fontSize: 11,
    fontWeight: "bold",
    width: 150,
    textAlign: "right",
    paddingRight: 10,
  },
  summaryTotalValue: {
    fontSize: 11,
    fontWeight: "bold",
    width: 100,
    textAlign: "right",
  },
  bankSection: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
  },
  bankTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 5,
  },
  bankText: {
    fontSize: 9,
    marginBottom: 2,
  },
  noteSection: {
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 8,
  },
  noteTitle: {
    fontSize: 8,
    color: "#555",
    marginBottom: 3,
  },
  noteText: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },
});

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export interface LineItem {
  no: number;
  projectName: string;
  videoTitle: string;
  videoCode: string;
  amount: number;
}

export interface PaymentNotificationPdfData {
  notificationNumber: string;
  issueDate: string;
  year: number;
  month: number;
  // Creator info
  creatorName: string;
  businessName?: string | null;
  creatorPostalCode?: string | null;
  creatorAddress?: string | null;
  creatorInvoiceNumber?: string | null;
  // Company info
  companyName: string;
  companyPostalCode?: string | null;
  companyAddress?: string | null;
  companyTel?: string | null;
  companyInvoiceNumber?: string | null;
  // Line items
  lineItems: LineItem[];
  subtotal: number;
  withholdingTax: number;
  netAmount: number;
  isIndividual: boolean;
  // Bank info
  bankName?: string | null;
  bankBranch?: string | null;
  bankAccountType?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
}

export function PaymentNotificationDocument({
  data,
}: {
  data: PaymentNotificationPdfData;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLine} />
          <Text style={styles.title}>支 払 通 知 書</Text>
          <View style={styles.headerLine} />
        </View>

        {/* Meta info */}
        <View style={{ marginBottom: 15 }}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>通知番号:</Text>
            <Text style={styles.metaValue}>{data.notificationNumber}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>発行日:</Text>
            <Text style={styles.metaValue}>{data.issueDate}</Text>
          </View>
        </View>

        {/* Payee / Payer */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>支払先</Text>
            <Text style={styles.nameText}>{data.creatorName} 様</Text>
            {data.businessName && (
              <Text style={styles.sectionText}>
                屋号: {data.businessName}
              </Text>
            )}
            {data.creatorPostalCode && (
              <Text style={styles.sectionText}>
                〒{data.creatorPostalCode}
              </Text>
            )}
            {data.creatorAddress && (
              <Text style={styles.sectionText}>{data.creatorAddress}</Text>
            )}
            {data.creatorInvoiceNumber && (
              <Text style={styles.sectionText}>
                登録番号: {data.creatorInvoiceNumber}
              </Text>
            )}
          </View>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>支払元</Text>
            <Text style={styles.nameText}>{data.companyName}</Text>
            {data.companyPostalCode && (
              <Text style={styles.sectionText}>
                〒{data.companyPostalCode}
              </Text>
            )}
            {data.companyAddress && (
              <Text style={styles.sectionText}>{data.companyAddress}</Text>
            )}
            {data.companyTel && (
              <Text style={styles.sectionText}>
                TEL: {data.companyTel}
              </Text>
            )}
            {data.companyInvoiceNumber && (
              <Text style={styles.sectionText}>
                登録番号: {data.companyInvoiceNumber}
              </Text>
            )}
          </View>
        </View>

        {/* Period */}
        <View style={styles.periodSection}>
          <Text style={styles.periodText}>
            対象期間: {data.year}年{data.month}月
          </Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNoHeader}>No.</Text>
            <Text style={styles.colProjectHeader}>案件名</Text>
            <Text style={styles.colTitleHeader}>動画タイトル</Text>
            <Text style={styles.colCodeHeader}>動画コード</Text>
            <Text style={styles.colAmountHeader}>金額（税抜）</Text>
          </View>
          {data.lineItems.map((item) => (
            <View key={item.no} style={styles.tableRow}>
              <Text style={styles.colNo}>{item.no}</Text>
              <Text style={styles.colProject}>{item.projectName}</Text>
              <Text style={styles.colTitle}>{item.videoTitle}</Text>
              <Text style={styles.colCode}>{item.videoCode}</Text>
              <Text style={styles.colAmount}>{formatYen(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>報酬（税抜）:</Text>
            <Text style={styles.summaryValue}>
              {formatYen(data.subtotal)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>消費税(10%):</Text>
            <Text style={styles.summaryValue}>
              {formatYen(Math.floor(data.subtotal * 0.1))}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>小計:</Text>
            <Text style={styles.summaryValue}>
              {formatYen(data.subtotal + Math.floor(data.subtotal * 0.1))}
            </Text>
          </View>
          {data.isIndividual && data.withholdingTax > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                源泉徴収税(10.21%):
              </Text>
              <Text style={styles.summaryValue}>
                ▲{formatYen(data.withholdingTax)}
              </Text>
            </View>
          )}
          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalLabel}>振込額:</Text>
            <Text style={styles.summaryTotalValue}>
              {formatYen(
                data.subtotal +
                  Math.floor(data.subtotal * 0.1) -
                  data.withholdingTax
              )}
            </Text>
          </View>
        </View>

        {/* Bank Info */}
        {data.bankName && (
          <View style={styles.bankSection}>
            <Text style={styles.bankTitle}>振込先</Text>
            <Text style={styles.bankText}>
              {data.bankName} {data.bankBranch}{" "}
              {data.bankAccountType} {data.bankAccountNumber}
            </Text>
            {data.bankAccountHolder && (
              <Text style={styles.bankText}>
                口座名義: {data.bankAccountHolder}
              </Text>
            )}
          </View>
        )}

        {/* Notes */}
        {data.isIndividual && (
          <View style={styles.noteSection}>
            <Text style={styles.noteTitle}>備考:</Text>
            <Text style={styles.noteText}>
              ・源泉徴収税は報酬（税抜）に対し所得税法第204条に基づき計算
            </Text>
            <Text style={styles.noteText}>
              ・振込額 = 報酬（税抜）+ 消費税 − 源泉徴収税
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
