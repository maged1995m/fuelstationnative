import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton, AppScreen, EmptyState, PageHeader, formatMoney, palette } from "@/components/accounting-ui";
import { useAccounting } from "@/lib/accounting/accounting-context";
import type { PurchaseDocument } from "@/lib/accounting/types";

export default function PurchasesScreen() {
  const { state } = useAccounting();
  const purchases = state.documents.filter((document): document is PurchaseDocument => document.kind === "purchase").sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const currency = state.profile?.currencySymbol || "ر.س";
  return <AppScreen scroll={false}><View style={styles.page}><PageHeader title="المشتريات" subtitle="توريدات الوقود والمصروفات" action={{ icon: "add", label: "فاتورة شراء جديدة", onPress: () => router.push("/purchases/new") }} /><FlatList data={purchases} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListHeaderComponent={<View style={styles.headerBlock}><Text style={styles.totalLabel}>إجمالي التوريدات المرحّلة</Text><Text style={styles.total}>{formatMoney(purchases.filter((item) => item.status === "posted").reduce((sum, item) => sum + item.total, 0), currency)}</Text><AppButton title="إضافة توريد" icon="add-business" onPress={() => router.push("/purchases/new")} variant="secondary" /></View>} renderItem={({ item }) => <PurchaseRow purchase={item} currency={currency} />} ListEmptyComponent={<EmptyState icon="local-shipping" title="لا توجد توريدات بعد" body="سجّل توريد وقود جديداً لزيادة المخزون وتحديث التكلفة." action={{ title: "إضافة توريد", onPress: () => router.push("/purchases/new") }} />} /></View></AppScreen>;
}

function PurchaseRow({ purchase, currency }: { purchase: PurchaseDocument; currency: string }) {
  const method = purchase.paymentMethod === "credit" ? "شراء آجل" : purchase.paymentMethod === "bank" ? "دفع بنكي أو شبكة" : "شراء نقدي";
  const expenseTotal = purchase.expenses.reduce((sum, item) => sum + item.amount, 0);
  return <Pressable onPress={() => router.push(`/documents/${purchase.id}`)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowTop}><View><Text style={styles.rowNumber}>{purchase.number}</Text><Text style={styles.rowDate}>{purchase.issueDate} · {method}</Text></View><View style={[styles.status, purchase.status === "reversed" && styles.statusReversed]}><Text style={[styles.statusText, purchase.status === "reversed" && styles.statusTextReversed]}>{purchase.status === "posted" ? "مرحّلة" : "معكوسة"}</Text></View></View><View style={styles.rowBottom}><Text style={styles.rowAmount}>{formatMoney(purchase.total, currency)}</Text><View style={styles.linesInfo}><MaterialIcons name="receipt-long" size={16} color={palette.muted} /><Text style={styles.rowDate}>{purchase.lines.length} أصناف · مصاريف {formatMoney(expenseTotal, currency)}</Text></View></View></Pressable>;
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 18 }, list: { paddingBottom: 30, gap: 10 }, headerBlock: { backgroundColor: palette.softGold, borderColor: "#F4DCAB", borderWidth: 1, borderRadius: 18, padding: 16, gap: 9, marginBottom: 6 }, totalLabel: { color: "#916000", textAlign: "right", fontSize: 13, fontWeight: "700" }, total: { color: palette.ink, textAlign: "right", fontSize: 25, fontWeight: "900" }, row: { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 }, pressed: { opacity: 0.72 }, rowTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, rowNumber: { color: palette.ink, fontSize: 15, fontWeight: "800", textAlign: "right" }, rowDate: { color: palette.muted, fontSize: 12, textAlign: "right", marginTop: 3 }, status: { backgroundColor: palette.softGreen, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 }, statusReversed: { backgroundColor: palette.softRed }, statusText: { color: palette.green, fontSize: 11, fontWeight: "800" }, statusTextReversed: { color: palette.red }, rowBottom: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 10, gap: 8 }, rowAmount: { color: palette.ink, fontSize: 16, fontWeight: "800" }, linesInfo: { flex: 1, flexDirection: "row-reverse", justifyContent: "flex-start", alignItems: "center", gap: 4 },
});
