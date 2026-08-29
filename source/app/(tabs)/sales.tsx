import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton, AppScreen, EmptyState, PageHeader, formatMoney, palette } from "@/components/accounting-ui";
import { useAccounting } from "@/lib/accounting/accounting-context";
import type { SaleDocument } from "@/lib/accounting/types";

export default function SalesScreen() {
  const { state } = useAccounting();
  const sales = state.documents.filter((document): document is SaleDocument => document.kind === "sale").sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const currency = state.profile?.currencySymbol || "ر.س";
  return <AppScreen scroll={false}><View style={styles.page}><PageHeader title="المبيعات" subtitle="فواتير البيع النقدية والآجلة" action={{ icon: "add", label: "فاتورة بيع جديدة", onPress: () => router.push("/sales/new") }} /><FlatList data={sales} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListHeaderComponent={<View style={styles.headerBlock}><Text style={styles.totalLabel}>إجمالي الفواتير المرحّلة</Text><Text style={styles.total}>{formatMoney(sales.filter((item) => item.status === "posted").reduce((sum, item) => sum + item.total, 0), currency)}</Text><AppButton title="إنشاء فاتورة بيع" icon="add-shopping-cart" onPress={() => router.push("/sales/new")} /></View>} renderItem={({ item }) => <SaleRow sale={item} currency={currency} />} ListEmptyComponent={<EmptyState icon="receipt-long" title="لا توجد مبيعات بعد" body="أضف أول فاتورة بيع بعد إدخال المخزون الافتتاحي." action={{ title: "فاتورة بيع جديدة", onPress: () => router.push("/sales/new") }} />} /></View></AppScreen>;
}

function SaleRow({ sale, currency }: { sale: SaleDocument; currency: string }) {
  const contact = sale.paymentMethod === "credit" ? "بيع آجل" : sale.paymentMethod === "bank" ? "تحصيل عبر البنك أو الشبكة" : "بيع نقدي";
  return <Pressable onPress={() => router.push(`/documents/${sale.id}`)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowTop}><View><Text style={styles.rowNumber}>{sale.number}</Text><Text style={styles.rowDate}>{sale.issueDate} · {contact}</Text></View><View style={[styles.status, sale.status === "reversed" && styles.statusReversed]}><Text style={[styles.statusText, sale.status === "reversed" && styles.statusTextReversed]}>{sale.status === "posted" ? "مرحّلة" : "معكوسة"}</Text></View></View><View style={styles.rowBottom}><Text style={styles.rowAmount}>{formatMoney(sale.total, currency)}</Text><View style={styles.linesInfo}><MaterialIcons name="local-gas-station" size={16} color={palette.muted} /><Text style={styles.rowDate}>{sale.lines.length} أصناف</Text></View></View></Pressable>;
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 18 }, list: { paddingBottom: 30, gap: 10 }, headerBlock: { backgroundColor: palette.softGreen, borderColor: "#C7E9D3", borderWidth: 1, borderRadius: 18, padding: 16, gap: 9, marginBottom: 6 }, totalLabel: { color: palette.green, textAlign: "right", fontSize: 13, fontWeight: "700" }, total: { color: palette.ink, textAlign: "right", fontSize: 25, fontWeight: "900" }, row: { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 }, pressed: { opacity: 0.72 }, rowTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, rowNumber: { color: palette.ink, fontSize: 15, fontWeight: "800", textAlign: "right" }, rowDate: { color: palette.muted, fontSize: 12, textAlign: "right", marginTop: 3 }, status: { backgroundColor: palette.softGreen, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 }, statusReversed: { backgroundColor: palette.softRed }, statusText: { color: palette.green, fontSize: 11, fontWeight: "800" }, statusTextReversed: { color: palette.red }, rowBottom: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 10 }, rowAmount: { color: palette.ink, fontSize: 16, fontWeight: "800" }, linesInfo: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
});
