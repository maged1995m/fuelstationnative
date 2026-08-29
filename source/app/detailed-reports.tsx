import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import {
  AppButton,
  AppScreen,
  Card,
  PageHeader,
  SelectField,
  SectionTitle,
  formatMoney,
  palette,
} from "@/components/accounting-ui";
import { useAccounting } from "@/lib/accounting/accounting-context";
import {
  buildAccountStatement,
  buildContactStatement,
  buildInventoryMovementReport,
  type InventoryMovementRow,
  type StatementRow,
} from "@/lib/accounting/detailed-reports";

export default function DetailedReportsScreen() {
  const { state } = useAccounting();
  const [mode, setMode] = useState<"account" | "contact" | "inventory">("account");
  const [accountId, setAccountId] = useState(state.accounts[0]?.id || "");
  const [contactId, setContactId] = useState("");
  const [productId, setProductId] = useState("");
  const currency = state.profile?.currencySymbol || "ر.س";
  const account = state.accounts.find((item) => item.id === accountId);
  const contact = state.contacts.find((item) => item.id === contactId);
  const accountRows = useMemo(
    () => (accountId ? buildAccountStatement(state, accountId) : []),
    [state, accountId],
  );
  const contactRows = useMemo(
    () => (contact ? buildContactStatement(state, contact) : []),
    [state, contact],
  );
  const inventoryRows = useMemo(
    () => buildInventoryMovementReport(state, productId || undefined),
    [state, productId],
  );
  const rows = (mode === "account" ? accountRows : mode === "contact" ? contactRows : inventoryRows) as Array<StatementRow | InventoryMovementRow>;

  return (
    <AppScreen>
      <PageHeader title="الكشوف التفصيلية" subtitle="حركة الحسابات والجهات والأصناف" back />
      <View style={styles.tabs}>
        <View style={styles.tab}>
          <AppButton title="الحسابات" icon="account-balance" variant={mode === "account" ? "primary" : "outline"} onPress={() => setMode("account")} />
        </View>
        <View style={styles.tab}>
          <AppButton title="الجهات" icon="groups" variant={mode === "contact" ? "primary" : "outline"} onPress={() => setMode("contact")} />
        </View>
        <View style={styles.tab}>
          <AppButton title="الأصناف" icon="inventory-2" variant={mode === "inventory" ? "primary" : "outline"} onPress={() => setMode("inventory")} />
        </View>
      </View>
      <Card>
        {mode === "account" ? (
          <SelectField label="الحساب" value={accountId} placeholder="اختر الحساب" options={state.accounts.filter((item) => item.isActive).map((item) => ({ label: `${item.code} — ${item.name}`, value: item.id }))} onChange={setAccountId} />
        ) : null}
        {mode === "contact" ? (
          <SelectField label="جهة التعامل" value={contactId} placeholder="اختر العميل أو المورد" options={state.contacts.filter((item) => item.isActive).map((item) => ({ label: `${item.name} — ${item.type === "customer" ? "عميل" : "مورد"}`, value: item.id }))} onChange={setContactId} />
        ) : null}
        {mode === "inventory" ? (
          <SelectField label="صنف الوقود" value={productId} placeholder="كل الأصناف" options={state.products.filter((item) => item.isActive).map((item) => ({ label: item.name, value: item.id }))} onChange={setProductId} />
        ) : null}
      </Card>
      <SectionTitle title={mode === "inventory" ? "حركة الأصناف" : `كشف ${mode === "contact" ? "جهة التعامل" : "الحساب"}`} />
      <FlatList
        data={rows as never[]}
        scrollEnabled={false}
        keyExtractor={(item) => (item as StatementRow | InventoryMovementRow).id}
        ListEmptyComponent={<Text style={styles.empty}>لا توجد حركات أو قيود لهذه التصفية.</Text>}
        renderItem={({ item }) => {
          if (mode === "inventory") {
            const movement = item as InventoryMovementRow;
            return (
              <Card>
                <Text style={styles.title}>{movement.number} · {movement.productName} · {movement.tankName}</Text>
                <Text style={styles.meta}>{movement.date} · {movement.kind === "purchase" || movement.kind === "opening" ? "وارد" : "صادر"}</Text>
                <Text style={styles.value}>وارد: {movement.quantityIn.toLocaleString("ar-SA")} | صادر: {movement.quantityOut.toLocaleString("ar-SA")} | الرصيد: {movement.balanceQuantity.toLocaleString("ar-SA")}</Text>
                <Text style={styles.meta}>قيمة الحركة: {formatMoney(movement.value, currency)} · تكلفة الوحدة: {formatMoney(movement.unitCost, currency)}</Text>
              </Card>
            );
          }
          const statement = item as StatementRow;
          return (
            <Card>
              <Text style={styles.title}>{statement.number}</Text>
              <Text style={styles.meta}>{statement.date} · {statement.description}</Text>
              <View style={styles.line}>
                <Text style={styles.value}>مدين {formatMoney(statement.debit, currency)}</Text>
                <Text style={styles.value}>دائن {formatMoney(statement.credit, currency)}</Text>
              </View>
              <Text style={styles.balance}>الرصيد المتراكم: {formatMoney(statement.balance, currency)}</Text>
            </Card>
          );
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row-reverse", gap: 6 },
  tab: { flex: 1 },
  title: { color: palette.ink, textAlign: "right", fontWeight: "800", fontSize: 14 },
  meta: { color: palette.muted, textAlign: "right", fontSize: 11, lineHeight: 18 },
  line: { flexDirection: "row-reverse", justifyContent: "space-between" },
  value: { color: palette.petroleum, textAlign: "right", fontSize: 12, fontWeight: "700" },
  balance: { color: palette.green, textAlign: "right", fontSize: 13, fontWeight: "800" },
  empty: { color: palette.muted, textAlign: "center", padding: 24 },
});
