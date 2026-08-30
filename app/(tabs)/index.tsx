import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppButton, AppScreen, Card, MetricCard, PageHeader, SectionTitle, formatMoney, palette } from "@/components/accounting-ui";
import { useAccounting } from "@/lib/accounting/accounting-context";

export default function HomeScreen() {
  const { state, inventory, accountBalances } = useAccounting();
  const currency = state.profile?.currencySymbol || "ر.س";
  const today = new Date().toISOString().slice(0, 10);
  const postedToday = state.documents.filter((document) => document.status === "posted" && document.issueDate === today);
  const salesToday = postedToday.filter((document) => document.kind === "sale").reduce((sum, document) => sum + document.total, 0);
  const purchasesToday = postedToday.filter((document) => document.kind === "purchase").reduce((sum, document) => sum + document.total, 0);
  const inventoryValue = inventory.reduce((sum, balance) => sum + balance.value, 0);
  const lowStockCount = inventory.filter((balance) => {
    const tank = state.tanks.find((item) => item.id === balance.tankId);
    return tank && balance.quantity <= tank.minimumQuantity;
  }).length;
  const receivables = accountBalances.find((item) => item.accountId === state.accountMap?.receivablesAccountId)?.balance || 0;
  const payables = accountBalances.find((item) => item.accountId === state.accountMap?.payablesAccountId)?.balance || 0;

  return <AppScreen>
    <PageHeader title={state.profile?.name || "دفاتر الوقود"} subtitle={state.profile ? "البيانات محفوظة على هذا الجهاز فقط" : "ابدأ بإعداد المحطة والبيانات الأساسية"} action={{ icon: "settings", label: "إعدادات", onPress: () => router.push("/settings") }} />
    {!state.profile ? <Card tone="gold"><View style={styles.setupRow}><View style={styles.setupText}><Text style={styles.setupTitle}>ابدأ من الإعدادات</Text><Text style={styles.setupBody}>أدخل اسم المحطة والعملة، ثم أضف صنف الوقود وخزاناً ومخزوناً افتتاحياً.</Text></View><MaterialIcons name="auto-awesome" size={28} color={palette.gold} /></View><AppButton title="تهيئة المحطة" icon="arrow-back" onPress={() => router.push("/settings")} variant="secondary" /></Card> : null}
    <View style={styles.metricGrid}><MetricCard label="مبيعات اليوم" value={formatMoney(salesToday, currency)} icon="point-of-sale" tone="green" /><MetricCard label="مشتريات اليوم" value={formatMoney(purchasesToday, currency)} icon="local-shipping" tone="gold" /></View>
    <View style={styles.metricGrid}><MetricCard label="قيمة المخزون" value={formatMoney(inventoryValue, currency)} note={`${inventory.reduce((sum, item) => sum + item.quantity, 0).toLocaleString("ar-SA")} وحدة متاحة`} icon="inventory-2" /><MetricCard label="تنبيهات المخزون" value={`${lowStockCount} خزانات`} note={lowStockCount ? "تحتاج إلى مراجعة" : "الأرصدة ضمن الحدود"} icon="warning-amber" tone={lowStockCount ? "red" : "green"} /></View>
    <SectionTitle title="إجراءات سريعة" />
    <View style={styles.actions}><AppButton title="فاتورة بيع" icon="add-shopping-cart" onPress={() => router.push("/sales/new")} /><AppButton title="فاتورة شراء" icon="add-business" onPress={() => router.push("/purchases/new")} variant="secondary" /></View>
    <SectionTitle title="ملخص الذمم" />
    <Card><View style={styles.balanceRow}><View><Text style={styles.balanceValue}>{formatMoney(receivables, currency)}</Text><Text style={styles.balanceLabel}>ذمم العملاء</Text></View><View style={styles.divider} /><View><Text style={styles.balanceValue}>{formatMoney(payables, currency)}</Text><Text style={styles.balanceLabel}>ذمم الموردين</Text></View></View><AppButton title="عرض القيود والتقارير" icon="analytics" variant="outline" onPress={() => router.push("/reports")} /></Card>
    <SectionTitle title="دليل الاستخدام المختصر" />
    <Card tone="petrol"><Text style={styles.guideTitle}>دورة العمل الصحيحة</Text><Text style={styles.guideBody}>عرّف الأصناف والخزانات، ثم أثبت المخزون الافتتاحي. بعد ذلك سجّل الشراء أو البيع؛ سيُنشئ التطبيق حركة مخزون وقيداً مزدوجاً متوازناً لكل مستند مرحّل. لا يوجد نظام ورديات في هذا التطبيق.</Text></Card>
  </AppScreen>;
}

const styles = StyleSheet.create({
  setupRow: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  setupText: { flex: 1 }, setupTitle: { color: palette.ink, fontSize: 16, fontWeight: "800", textAlign: "right" }, setupBody: { color: palette.muted, fontSize: 13, lineHeight: 20, textAlign: "right", marginTop: 4 },
  metricGrid: { flexDirection: "row-reverse", gap: 10 }, actions: { gap: 10 }, balanceRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-around", paddingVertical: 4 }, balanceValue: { color: palette.ink, fontSize: 17, fontWeight: "800", textAlign: "center" }, balanceLabel: { color: palette.muted, fontSize: 12, textAlign: "center", marginTop: 4 }, divider: { width: 1, alignSelf: "stretch", backgroundColor: palette.border }, guideTitle: { color: palette.petroleum, textAlign: "right", fontWeight: "800", fontSize: 15 }, guideBody: { color: palette.ink, textAlign: "right", lineHeight: 21, fontSize: 13 },
});
