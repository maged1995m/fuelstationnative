import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AppButton,
  AppScreen,
  Card,
  FormInput,
  MetricCard,
  PageHeader,
  SectionTitle,
  formatMoney,
  palette,
  today,
} from "@/components/accounting-ui";
import { useAccounting } from "@/lib/accounting/accounting-context";
import {
  exportDailyReportExcel,
  exportDailyReportPdf,
  type DailyReportKind,
} from "@/lib/exports/daily-reports";

export default function ReportsScreen() {
  const { account } = useLocalSearchParams<{ account?: string }>();
  const { state, accountBalances, inventory } = useAccounting();
  const [reportDate, setReportDate] = useState(today());
  const [exporting, setExporting] = useState<
    "sales-pdf" | "sales-excel" | "inventory-pdf" | "inventory-excel" | null
  >(null);
  const currency = state.profile?.currencySymbol || "ر.س";
  const accountById = new Map(state.accounts.map((item) => [item.id, item]));
  const balanceForType = (type: string) =>
    accountBalances
      .filter((item) => accountById.get(item.accountId)?.type === type)
      .reduce((sum, item) => sum + item.balance, 0);
  const revenue = balanceForType("revenue");
  const expenses = balanceForType("expense");
  const profit = revenue - expenses;
  const assets = balanceForType("asset");
  const liabilities = balanceForType("liability");
  const equity = balanceForType("equity");
  const rows = account
    ? accountBalances.filter((item) => item.accountId === account)
    : accountBalances;
  const exportReport = async (
    kind: DailyReportKind,
    format: "pdf" | "excel",
  ) => {
    const key = `${kind}-${format}` as NonNullable<typeof exporting>;
    if (exporting) return;
    setExporting(key);
    try {
      const file =
        format === "pdf"
          ? await exportDailyReportPdf(state, kind, reportDate)
          : await exportDailyReportExcel(state, kind, reportDate);
      Alert.alert(
        "تم إنشاء التقرير",
        `حُفظ ${file.fileName} في ${file.locationLabel} وفتحت قائمة المشاركة المحلية.`,
      );
    } catch (error) {
      Alert.alert(
        "تعذر تصدير التقرير",
        error instanceof Error ? error.message : "تعذر إنشاء الملف المحلي.",
      );
    } finally {
      setExporting(null);
    }
  };
  return (
    <AppScreen>
      <PageHeader
        title="التقارير"
        subtitle={
          account ? "تفاصيل رصيد حساب محدد" : "نتائج مستنتجة من القيود المرحّلة"
        }
        back={Boolean(account)}
      />
      {!account ? (
        <>
          <View style={styles.metrics}>
            <MetricCard
              label="إجمالي الإيرادات"
              value={formatMoney(revenue, currency)}
              icon="trending-up"
              tone="green"
            />
            <MetricCard
              label="صافي النتيجة"
              value={formatMoney(profit, currency)}
              icon="account-balance-wallet"
              tone={profit >= 0 ? "petrol" : "red"}
            />
          </View>
          <View style={styles.metrics}>
            <MetricCard
              label="الأصول"
              value={formatMoney(assets, currency)}
              icon="account-balance"
            />
            <MetricCard
              label="قيمة المخزون"
              value={formatMoney(
                inventory.reduce((sum, item) => sum + item.value, 0),
                currency,
              )}
              icon="inventory-2"
              tone="gold"
            />
          </View>
          <SectionTitle title="تصدير التقرير اليومي" />
          <Card tone="petrol">
            <Text style={styles.exportNote}>
              اختر التاريخ ثم أنشئ PDF أو Excel. يُحفظ الملف في Documents الخاص
              بالتطبيق، أو في مجلد Documents الذي اخترته من الإعدادات، ثم تظهر
              لك قائمة المشاركة.
            </Text>
            <FormInput
              label="تاريخ التقرير"
              value={reportDate}
              onChangeText={setReportDate}
              placeholder="YYYY-MM-DD"
            />
            <Text style={styles.exportLabel}>المبيعات اليومية</Text>
            <View style={styles.exportActions}>
              <View style={styles.action}>
                <AppButton
                  title={
                    exporting === "sales-pdf"
                      ? "جارٍ إنشاء PDF…"
                      : "PDF المبيعات"
                  }
                  icon="picture-as-pdf"
                  disabled={Boolean(exporting)}
                  onPress={() => exportReport("sales", "pdf")}
                />
              </View>
              <View style={styles.action}>
                <AppButton
                  title={
                    exporting === "sales-excel"
                      ? "جارٍ إنشاء Excel…"
                      : "Excel المبيعات"
                  }
                  icon="table-view"
                  variant="outline"
                  disabled={Boolean(exporting)}
                  onPress={() => exportReport("sales", "excel")}
                />
              </View>
            </View>
            <Text style={styles.exportLabel}>المخزون اليومي</Text>
            <View style={styles.exportActions}>
              <View style={styles.action}>
                <AppButton
                  title={
                    exporting === "inventory-pdf"
                      ? "جارٍ إنشاء PDF…"
                      : "PDF المخزون"
                  }
                  icon="picture-as-pdf"
                  disabled={Boolean(exporting)}
                  onPress={() => exportReport("inventory", "pdf")}
                />
              </View>
              <View style={styles.action}>
                <AppButton
                  title={
                    exporting === "inventory-excel"
                      ? "جارٍ إنشاء Excel…"
                      : "Excel المخزون"
                  }
                  icon="table-view"
                  variant="outline"
                  disabled={Boolean(exporting)}
                  onPress={() => exportReport("inventory", "excel")}
                />
              </View>
            </View>
          </Card>
          <SectionTitle title="ملخص المركز المالي" />
          <Card>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>الالتزامات</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(liabilities, currency)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>حقوق الملكية</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(equity, currency)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>المصروفات</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(expenses, currency)}
              </Text>
            </View>
            <Text style={styles.explain}>
              تُعرض هذه النتائج من القيود التي تم ترحيلها فقط؛ ولا توجد أرقام
              تجريبية أو أرصدة قابلة للتعديل المباشر.
            </Text>
          </Card>
          <SectionTitle title="ميزان المراجعة" />
        </>
      ) : null}
      <FlatList
        data={rows}
        scrollEnabled={false}
        keyExtractor={(item) => item.accountId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const record = accountById.get(item.accountId);
          return (
            <Pressable
              onPress={() =>
                router.push(`/reports?account=${item.accountId}` as never)
              }
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.account}>
                {record ? `${record.code} — ${record.name}` : "حساب"}
              </Text>
              <View style={styles.numbers}>
                <Text style={styles.debit}>
                  مدين {formatMoney(item.debit, currency)}
                </Text>
                <Text style={styles.credit}>
                  دائن {formatMoney(item.credit, currency)}
                </Text>
              </View>
              <Text style={styles.balance}>
                الرصيد: {formatMoney(item.balance, currency)}
              </Text>
            </Pressable>
          );
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row-reverse", gap: 10 },
  exportNote: {
    color: palette.ink,
    fontSize: 12,
    textAlign: "right",
    lineHeight: 20,
  },
  exportLabel: {
    color: palette.petroleum,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    paddingTop: 4,
  },
  exportActions: { flexDirection: "row-reverse", gap: 8 },
  action: { flex: 1 },
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
  },
  summaryLabel: { color: palette.muted, fontSize: 13 },
  summaryValue: { color: palette.ink, fontSize: 14, fontWeight: "800" },
  explain: {
    color: palette.muted,
    fontSize: 11,
    textAlign: "right",
    lineHeight: 18,
    paddingTop: 10,
  },
  list: { gap: 8, paddingBottom: 30 },
  row: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 15,
    padding: 13,
    gap: 6,
  },
  account: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
  },
  numbers: {
    flexDirection: "row-reverse",
    gap: 12,
    justifyContent: "flex-start",
  },
  debit: { color: palette.petroleum, fontSize: 11 },
  credit: { color: palette.gold, fontSize: 11 },
  balance: {
    color: palette.ink,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: { opacity: 0.7 },
});
