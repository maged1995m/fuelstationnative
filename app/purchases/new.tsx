import { router } from "expo-router";
import { useRef, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";

import {
  AppButton,
  AppScreen,
  Card,
  EmptyState,
  FormInput,
  PageHeader,
  SelectField,
  formatMoney,
  palette,
  today,
} from "@/components/accounting-ui";
import { useAccounting } from "@/lib/accounting/accounting-context";
import type { PaymentMethod } from "@/lib/accounting/types";

export default function NewPurchaseScreen() {
  const { state, addPurchase, inventory } = useAccounting();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [contactId, setContactId] = useState("");
  const [productId, setProductId] = useState("");
  const [tankId, setTankId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [date, setDate] = useState(today());
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseFundingAccountId, setExpenseFundingAccountId] = useState(
    state.accountMap?.cashAccountId || "",
  );
  const [capitalized, setCapitalized] = useState(true);
  const [saving, setSaving] = useState(false);
  const submitted = useRef(false);

  const products = state.products.filter((item) => item.isActive);
  const tanks = state.tanks.filter(
    (item) => item.isActive && (!productId || item.productId === productId),
  );
  const suppliers = state.contacts.filter(
    (item) => item.isActive && item.type === "supplier",
  );
  const fundingAccounts = state.accounts.filter(
    (item) =>
      item.isActive && ["asset", "liability", "equity"].includes(item.type),
  );
  const currency = state.profile?.currencySymbol || "ر.س";
  const fuelSubtotal = Number(quantity || 0) * Number(unitPrice || 0);
  const total = fuelSubtotal + Number(expenseAmount || 0);
  const selectedTank = state.tanks.find((item) => item.id === tankId);
  const balance = inventory.find((item) => item.tankId === tankId);

  const resetForm = () => {
    setPaymentMethod("cash");
    setContactId("");
    setProductId("");
    setTankId("");
    setQuantity("");
    setUnitPrice("");
    setDate(today());
    setExpenseDescription("");
    setExpenseAmount("");
    setExpenseFundingAccountId(state.accountMap?.cashAccountId || "");
    setCapitalized(true);
  };
  const save = async () => {
    if (submitted.current || saving) return;
    submitted.current = true;
    try {
      setSaving(true);
      const expenses =
        Number(expenseAmount) > 0
          ? [
              {
                id: `draft-expense-${Date.now()}`,
                description: expenseDescription || "مصروف توريد",
                amount: Number(expenseAmount),
                fundingAccountId: expenseFundingAccountId,
                capitalized,
              },
            ]
          : [];
      await addPurchase({
        issueDate: date,
        paymentMethod,
        contactId: paymentMethod === "credit" ? contactId : undefined,
        lines: [
          {
            productId,
            tankId,
            quantity: Number(quantity),
            unitPrice: Number(unitPrice),
          },
        ],
        expenses,
      });
      resetForm();
      Alert.alert(
        "تم حفظ الفاتورة",
        "حُفظ توريد الوقود وحركة المخزون والقيد المحاسبي المتوازن. تم تصفير النموذج لتوريد جديد.",
      );
    } catch (error) {
      Alert.alert(
        "تعذر الترحيل",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    } finally {
      submitted.current = false;
      setSaving(false);
    }
  };

  if (!products.length || !state.tanks.length) {
    return (
      <AppScreen>
        <PageHeader
          title="فاتورة شراء"
          subtitle="ابدأ بالبيانات الأساسية"
          back
        />
        <EmptyState
          icon="local-shipping"
          title="لا توجد أصناف أو خزانات"
          body="أضف صنف وقود وخزاناً أولاً ثم أعد فتح فاتورة الشراء."
          action={{
            title: "إدارة البيانات الأساسية",
            onPress: () => router.push("/settings/masters" as never),
          }}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <PageHeader
        title="توريد وقود جديد"
        subtitle="تحديث المخزون والتكلفة والقيد المحاسبي"
        back
      />
      <Card tone="gold">
        <Text style={styles.noticeTitle}>التكلفة الفعلية</Text>
        <Text style={styles.notice}>
          يمكن رسملة مصروف النقل أو التفريغ ضمن تكلفة المخزون. أما المصروف غير
          المرسمل فيسجل في حساب مصروف مستقل ولا يرفع قيمة الوقود.
        </Text>
      </Card>
      <Card>
        <FormInput
          label="تاريخ التوريد"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />
        <SelectField
          label="طريقة الدفع"
          value={paymentMethod}
          placeholder="اختر الطريقة"
          options={[
            { label: "نقدي — صندوق", value: "cash" },
            { label: "بنك أو شبكة", value: "bank" },
            { label: "آجل — ذمم الموردين", value: "credit" },
          ]}
          onChange={(value) => {
            setPaymentMethod(value as PaymentMethod);
            setContactId("");
          }}
        />
        {paymentMethod === "credit" ? (
          <SelectField
            label="المورد"
            value={contactId}
            placeholder="اختر المورد"
            options={suppliers.map((item) => ({
              label: item.name,
              value: item.id,
              note: item.accountId ? "حساب مخصص" : "ذمم الموردين",
            }))}
            onChange={setContactId}
          />
        ) : null}
        <SelectField
          label="صنف الوقود"
          value={productId}
          placeholder="اختر الصنف"
          options={products.map((item) => ({
            label: item.name,
            value: item.id,
            note: item.sku,
          }))}
          onChange={(value) => {
            setProductId(value);
            setTankId("");
          }}
        />
        <SelectField
          label="الخزان"
          value={tankId}
          placeholder="اختر الخزان"
          options={tanks.map((item) => {
            const stock =
              inventory.find((record) => record.tankId === item.id)?.quantity ||
              0;
            return {
              label: item.name,
              value: item.id,
              note: `المتاح: ${stock.toLocaleString("ar-SA")} من ${item.capacity.toLocaleString("ar-SA")}`,
            };
          })}
          onChange={setTankId}
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <FormInput
              label="الكمية"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.half}>
            <FormInput
              label="سعر الشراء للوحدة"
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
        </View>
        {selectedTank ? (
          <Text style={styles.capacity}>
            المساحة المتاحة في الخزان:{" "}
            {Math.max(
              0,
              selectedTank.capacity - (balance?.quantity || 0),
            ).toLocaleString("ar-SA")}
          </Text>
        ) : null}
      </Card>
      <Card tone="petrol">
        <Text style={styles.expenseTitle}>مصروف إضافي اختياري</Text>
        <FormInput
          label="وصف المصروف"
          value={expenseDescription}
          onChangeText={setExpenseDescription}
          placeholder="مثال: نقل أو تفريغ"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <FormInput
              label="القيمة"
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.half}>
            <SelectField
              label="مصدر الدفع"
              value={expenseFundingAccountId}
              placeholder="اختر الحساب"
              options={fundingAccounts.map((item) => ({
                label: `${item.code} — ${item.name}`,
                value: item.id,
                note: item.type,
              }))}
              onChange={setExpenseFundingAccountId}
            />
          </View>
        </View>
        <View style={styles.switchRow}>
          <Switch
            value={capitalized}
            onValueChange={setCapitalized}
            trackColor={{ false: "#C7D4D6", true: "#70A7B0" }}
            thumbColor={capitalized ? palette.petroleum : "#FFFFFF"}
          />
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>
              إضافة المصروف إلى تكلفة الوقود
            </Text>
            <Text style={styles.switchBody}>
              {capitalized
                ? "سيُرسمل ضمن المخزون."
                : "سيُسجل مصروف فترة مستقلاً."}
            </Text>
          </View>
        </View>
      </Card>
      <Card>
        <Text style={styles.total}>
          إجمالي المستند: {formatMoney(total, currency)}
        </Text>
        <AppButton
          title={saving ? "جارٍ الترحيل…" : "ترحيل فاتورة الشراء"}
          icon="check-circle"
          disabled={saving}
          onPress={save}
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  noticeTitle: {
    color: "#916000",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  notice: {
    color: palette.ink,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "right",
  },
  row: { flexDirection: "row-reverse", gap: 10 },
  half: { flex: 1 },
  capacity: { color: palette.muted, textAlign: "right", fontSize: 12 },
  expenseTitle: {
    color: palette.petroleum,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  switchRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
  },
  switchText: { flex: 1 },
  switchTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  switchBody: {
    color: palette.muted,
    fontSize: 11,
    textAlign: "right",
    marginTop: 2,
  },
  total: {
    color: palette.green,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },
});
