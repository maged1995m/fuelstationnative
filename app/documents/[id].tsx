import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import {
  AppButton,
  AppScreen,
  Card,
  EmptyState,
  PageHeader,
  SectionTitle,
  confirmDanger,
  formatMoney,
  palette,
  today,
} from "@/components/accounting-ui";
import { useAccounting } from "@/lib/accounting/accounting-context";
import type { PurchaseDocument, SaleDocument } from "@/lib/accounting/types";
import { printInvoice, shareThermalInvoicePdf } from "@/lib/printing/invoice";

const documentLabel = (kind: string) => {
  if (kind === "sale") return "فاتورة بيع";
  if (kind === "purchase") return "فاتورة شراء";
  if (kind === "opening-balance") return "مخزون افتتاحي";
  if (kind === "inventory-adjustment") return "تسوية مخزون";
  if (kind === "reversal") return "سند عكس";
  return "قيد يدوي";
};

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, reverseDocument } = useAccounting();
  const [printing, setPrinting] = useState(false);
  const document = state.documents.find((item) => item.id === id);
  const currency = state.profile?.currencySymbol || "ر.س";

  if (!document)
    return (
      <AppScreen>
        <PageHeader title="تفاصيل المستند" back />
        <EmptyState
          icon="error-outline"
          title="المستند غير موجود"
          body="قد يكون المستند أزيل من النسخة المحلية أو تم فتح رابط قديم."
        />
      </AppScreen>
    );

  const journal = state.journalEntries.find(
    (item) => item.id === document.journalEntryId,
  );
  const amount =
    "total" in document
      ? document.total
      : journal?.lines.reduce((sum, line) => sum + line.debit, 0) || 0;
  const invoice =
    document.kind === "sale" || document.kind === "purchase"
      ? (document as SaleDocument | PurchaseDocument)
      : undefined;
  const reverse = () =>
    confirmDanger(
      "عكس مستند مرحّل",
      "سيُنشئ التطبيق مستند عكس وقيداً معاكساً وحركات مخزون عكسية، ولا يمكن إلغاء هذه العملية من الشاشة.",
      () => {
        reverseDocument({
          documentId: document.id,
          issueDate: today(),
          reason: "عكس بواسطة المستخدم",
        })
          .then(() => Alert.alert("تم العكس", "حُفظ مستند عكس موثق محلياً."))
          .catch((error) =>
            Alert.alert(
              "تعذر العكس",
              error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
            ),
          );
      },
    );
  const print = async () => {
    if (!invoice || printing) return;
    setPrinting(true);
    try {
      await printInvoice(invoice, state);
    } catch (error) {
      Alert.alert(
        "تعذرت الطباعة",
        error instanceof Error
          ? error.message
          : "تعذر فتح واجهة الطباعة المحلية.",
      );
    } finally {
      setPrinting(false);
    }
  };
  const shareReceipt = async () => {
    if (!invoice || printing) return;
    setPrinting(true);
    try {
      await shareThermalInvoicePdf(invoice, state);
    } catch (error) {
      Alert.alert(
        "تعذرت المشاركة",
        error instanceof Error
          ? error.message
          : "تعذر إنشاء ملف الإيصال المحلي.",
      );
    } finally {
      setPrinting(false);
    }
  };

  return (
    <AppScreen>
      <PageHeader title="تفاصيل المستند" subtitle={document.number} back />
      <Card tone={document.status === "reversed" ? "red" : "green"}>
        <View style={styles.statusRow}>
          <Text
            style={[
              styles.status,
              document.status === "reversed" && styles.statusReversed,
            ]}
          >
            {document.status === "posted" ? "مرحّل" : "معكوس"}
          </Text>
          <Text style={styles.type}>{documentLabel(document.kind)}</Text>
        </View>
        <Text style={styles.amount}>{formatMoney(amount, currency)}</Text>
        <Text style={styles.date}>تاريخ المستند: {document.issueDate}</Text>
        {document.kind === "sale" && document.pumpId ? (
          <Text style={styles.date}>
            المضخة:{" "}
            {state.pumps.find((pump) => pump.id === document.pumpId)?.name ||
              "مضخة"}{" "}
            · قراءة العداد:{" "}
            {document.meterReading?.toLocaleString("ar-SA") || "—"}
          </Text>
        ) : null}
      </Card>
      {invoice ? (
        <>
          <SectionTitle title="تفاصيل الأصناف" />
          {invoice.lines.map((line) => {
            const product = state.products.find(
              (item) => item.id === line.productId,
            );
            const saleLine = "unitCostAtPosting" in line ? line : undefined;
            return (
              <Card key={line.id}>
                <Text style={styles.lineTitle}>{product?.name || "صنف"}</Text>
                <Text style={styles.lineMeta}>
                  الكمية: {line.quantity.toLocaleString("ar-SA")} · السعر:{" "}
                  {formatMoney(line.unitPrice, currency)}
                </Text>
                {saleLine ? (
                  <Text style={styles.lineMeta}>
                    تكلفة البيع المثبتة:{" "}
                    {formatMoney(saleLine.unitCostAtPosting, currency)}
                  </Text>
                ) : null}
              </Card>
            );
          })}
        </>
      ) : null}
      {document.kind === "opening-balance" ? (
        <>
          <SectionTitle title="تفاصيل المخزون" />
          <Card>
            <Text style={styles.lineTitle}>
              كمية افتتاحية: {document.quantity.toLocaleString("ar-SA")}
            </Text>
            <Text style={styles.lineMeta}>
              تكلفة الوحدة: {formatMoney(document.unitCost, currency)}
            </Text>
          </Card>
        </>
      ) : null}
      {document.kind === "inventory-adjustment" ? (
        <>
          <SectionTitle title="تفاصيل التسوية" />
          <Card>
            <Text style={styles.lineTitle}>
              الرصيد الدفتري: {document.bookQuantity.toLocaleString("ar-SA")} ·
              الفعلي: {document.actualQuantity.toLocaleString("ar-SA")}
            </Text>
            <Text style={styles.lineMeta}>
              الفرق: {document.differenceQuantity > 0 ? "+" : ""}
              {document.differenceQuantity.toLocaleString("ar-SA")} · تكلفة
              الوحدة: {formatMoney(document.unitCost, currency)}
            </Text>
            <Text style={styles.lineMeta}>السبب: {document.reason}</Text>
          </Card>
        </>
      ) : null}
      {invoice ? (
        <>
          <SectionTitle title="طباعة محلية" />
          <Card tone="gold">
            <Text style={styles.printNote}>
              يفتح زر الطباعة قائمة طباعة Android لاختيار طابعة حرارية أو بلوتوث
              مُعدّة على الهاتف. ويمكن مشاركة PDF المختصر مع تطبيق الطابعة
              مباشرة.
            </Text>
            <AppButton
              title={printing ? "جارٍ تجهيز الإيصال…" : "طباعة الإيصال"}
              icon="print"
              disabled={printing}
              onPress={print}
            />
            <AppButton
              title="مشاركة إيصال حراري PDF"
              icon="share"
              variant="outline"
              disabled={printing}
              onPress={shareReceipt}
            />
          </Card>
        </>
      ) : null}
      <SectionTitle title="القيد المحاسبي" />
      {journal ? (
        <Card>
          <Text style={styles.journalTitle}>{journal.description}</Text>
          {journal.lines.map((line) => {
            const account = state.accounts.find(
              (item) => item.id === line.accountId,
            );
            return (
              <View key={line.id} style={styles.journalRow}>
                <Text style={styles.accountName}>
                  {account ? `${account.code} — ${account.name}` : "حساب"}
                </Text>
                <Text style={styles.journalNumbers}>
                  مدين {formatMoney(line.debit, currency)} · دائن{" "}
                  {formatMoney(line.credit, currency)}
                </Text>
              </View>
            );
          })}
        </Card>
      ) : (
        <Card>
          <Text style={styles.lineMeta}>لا يوجد قيد مرتبط بهذا المستند.</Text>
        </Card>
      )}
      {document.status === "posted" && document.kind !== "reversal" ? (
        <AppButton
          title="إنشاء عكس موثق"
          icon="undo"
          onPress={reverse}
          variant="danger"
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: "row-reverse", justifyContent: "space-between" },
  status: { color: palette.green, fontSize: 13, fontWeight: "800" },
  statusReversed: { color: palette.red },
  type: { color: palette.ink, fontSize: 14, fontWeight: "800" },
  amount: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "right",
  },
  date: { color: palette.muted, fontSize: 12, textAlign: "right" },
  lineTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  lineMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "right",
  },
  printNote: {
    color: palette.ink,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "right",
  },
  journalTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    paddingBottom: 8,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
  },
  journalRow: {
    paddingVertical: 9,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    gap: 3,
  },
  accountName: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  journalNumbers: { color: palette.muted, fontSize: 11, textAlign: "right" },
});
