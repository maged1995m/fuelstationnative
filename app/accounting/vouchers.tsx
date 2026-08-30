import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AppButton, AppScreen, Card, FormInput, PageHeader, SelectField, SectionTitle, palette, today, formatMoney } from "@/components/accounting-ui";
import { useAccounting } from "@/lib/accounting/accounting-context";

export default function VouchersScreen() {
  const { state, addReceipt, addPayment } = useAccounting();
  const [kind, setKind] = useState<"receipt" | "payment">("receipt");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [settlementAccountId, setSettlementAccountId] = useState(state.accountMap?.cashAccountId || "");
  const [accountId, setAccountId] = useState("");
  const [contactId, setContactId] = useState("");
  const currency = state.profile?.currencySymbol || "ر.س";
  const accounts = state.accounts.filter((item) => item.isActive);
  const contacts = state.contacts.filter((item) => item.isActive && item.type === (kind === "receipt" ? "customer" : "supplier"));
  const selectedContact = contacts.find((item) => item.id === contactId);
  const accountOptions = useMemo(() => accounts.map((item) => ({ label: `${item.code} — ${item.name}`, value: item.id })), [accounts]);
  const save = async () => {
    try {
      const input = { issueDate: date, amount: Number(amount), settlementAccountId, accountId: accountId || undefined, contactId: contactId || undefined, description };
      if (kind === "receipt") await addReceipt(input); else await addPayment(input);
      Alert.alert("تم الحفظ", `تم ترحيل سند ${kind === "receipt" ? "القبض" : "الصرف"} محليًا.`);
      setAmount(""); setDescription(""); setAccountId(""); setContactId("");
    } catch (error) { Alert.alert("تعذر الترحيل", error instanceof Error ? error.message : "حدث خطأ غير متوقع."); }
  };
  return <AppScreen>
    <PageHeader title="سندات القبض والصرف" subtitle="ترحيل محلي على مستوى الجهات أو الحسابات" back />
    <View style={styles.tabs}>
      <View style={styles.tab}><AppButton title="سند قبض" icon="call-received" variant={kind === "receipt" ? "primary" : "outline"} onPress={() => { setKind("receipt"); setContactId(""); setAccountId(""); }} /></View>
      <View style={styles.tab}><AppButton title="سند صرف" icon="call-made" variant={kind === "payment" ? "primary" : "outline"} onPress={() => { setKind("payment"); setContactId(""); setAccountId(""); }} /></View>
    </View>
    <Card tone={kind === "receipt" ? "green" : "gold"}>
      <Text style={styles.note}>{kind === "receipt" ? "القبض: مدين للصندوق أو البنك ودائن على جهة التعامل أو الحساب." : "الصرف: مدين على جهة التعامل أو الحساب ودائن للصندوق أو البنك."}</Text>
    </Card>
    <Card>
      <FormInput label="تاريخ السند" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      <FormInput label="المبلغ" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" />
      <SelectField label={kind === "receipt" ? "العميل (اختياري)" : "المورد (اختياري)"} value={contactId} placeholder="اختر جهة التعامل أو اتركه فارغًا" options={contacts.map((item) => ({ label: item.name, value: item.id, note: item.accountId ? "حساب مخصص" : "الحساب العام" }))} onChange={(value) => { setContactId(value); const contact = contacts.find((item) => item.id === value); if (contact?.accountId) setAccountId(contact.accountId); }} />
      <SelectField label="الحساب المقابل" value={accountId} placeholder="اختر الحساب" options={accountOptions} onChange={setAccountId} />
      <SelectField label="حساب التسوية" value={settlementAccountId} placeholder="اختر الصندوق أو البنك" options={accountOptions.filter((item) => item.value === state.accountMap?.cashAccountId || item.value === state.accountMap?.bankAccountId)} onChange={setSettlementAccountId} />
      <FormInput label="البيان" value={description} onChangeText={setDescription} placeholder="سبب السند أو تفاصيله" multiline />
      <Text style={styles.preview}>القيمة: {formatMoney(Number(amount || 0), currency)}</Text>
      <AppButton title={`ترحيل سند ${kind === "receipt" ? "القبض" : "الصرف"}`} icon="check-circle" onPress={save} />
    </Card>
    <SectionTitle title="ملاحظة" />
    <Text style={styles.footer}>يمكن ربط السند بجهة تعامل أو اختيار حساب مباشرة. يتم حفظ القيد في الدفتر المحلي ويمكن عكسه من تفاصيل المستند.</Text>
  </AppScreen>;
}
const styles = StyleSheet.create({ tabs: { flexDirection: "row-reverse", gap: 8 }, tab: { flex: 1 }, note: { color: palette.ink, textAlign: "right", lineHeight: 21 }, preview: { color: palette.green, textAlign: "right", fontSize: 16, fontWeight: "800" }, footer: { color: palette.muted, textAlign: "right", lineHeight: 21, fontSize: 12 }, });
