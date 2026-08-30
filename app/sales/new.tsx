import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

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

export default function NewSaleScreen() {
  const { state, addSale, inventory } = useAccounting();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [contactId, setContactId] = useState("");
  const [pumpId, setPumpId] = useState("");
  const [meterReading, setMeterReading] = useState("");
  const [productId, setProductId] = useState("");
  const [tankId, setTankId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const submitted = useRef(false);
  const products = state.products.filter((item) => item.isActive);
  const tanks = state.tanks.filter(
    (item) => item.isActive && (!productId || item.productId === productId),
  );
  const pumps = state.pumps.filter((item) => item.isActive);
  const customers = state.contacts.filter(
    (item) => item.isActive && item.type === "customer",
  );
  const selectedPump = pumps.find((item) => item.id === pumpId);
  const selectedBalance = inventory.find(
    (item) => item.productId === productId && item.tankId === tankId,
  );
  const subtotal = Number(quantity || 0) * Number(unitPrice || 0);
  const currency = state.profile?.currencySymbol || "ر.س";
  useEffect(() => {
    const product = state.products.find((item) => item.id === productId);
    if (product && !unitPrice) setUnitPrice(String(product.salesPrice));
  }, [productId, state.products, unitPrice]);
  const resetForm = () => {
    setPaymentMethod("cash");
    setContactId("");
    setPumpId("");
    setMeterReading("");
    setProductId("");
    setTankId("");
    setQuantity("");
    setUnitPrice("");
    setDate(today());
  };
  const selectPump = (value: string) => {
    const pump = pumps.find((item) => item.id === value);
    setPumpId(value);
    setMeterReading("");
    if (pump) {
      const tank = state.tanks.find((item) => item.id === pump.tankId);
      setTankId(pump.tankId);
      setProductId(tank?.productId || "");
      setUnitPrice(
        String(
          state.products.find((item) => item.id === tank?.productId)
            ?.salesPrice || "",
        ),
      );
      setQuantity("");
    }
  };
  useEffect(() => {
    if (!pumpId && pumps.length) selectPump(pumps[0].id);
  }, [pumpId, pumps.length]);
  const changeMeter = (value: string) => {
    setMeterReading(value);
    if (selectedPump && Number(value) >= selectedPump.lastMeterReading)
      setQuantity(String(Number(value) - selectedPump.lastMeterReading));
  };
  const save = async () => {
    if (submitted.current || saving) return;
    submitted.current = true;
    setSaving(true);
    try {
      await addSale({
        issueDate: date,
        paymentMethod,
        contactId: paymentMethod === "credit" ? contactId : undefined,
        pumpId: pumpId || undefined,
        meterReading: pumpId ? Number(meterReading) : undefined,
        lines: [
          {
            productId,
            tankId,
            quantity: Number(quantity),
            unitPrice: Number(unitPrice),
          },
        ],
      });
      resetForm();
      Alert.alert(
        "تم حفظ الفاتورة",
        pumpId
          ? "حُفظت فاتورة البيع وقراءة المضخة وحركة المخزون والقيود معاً. تم تصفير النموذج لعملية بيع جديدة."
          : "حُفظت فاتورة البيع وحركة المخزون وقيد الإيراد والتكلفة معاً. تم تصفير النموذج لعملية بيع جديدة.",
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
  if (!products.length || !state.tanks.length)
    return (
      <AppScreen>
        <PageHeader
          title="فاتورة بيع"
          subtitle="ابدأ بالبيانات الأساسية"
          back
        />
        <EmptyState
          icon="local-gas-station"
          title="لا توجد أصناف أو خزانات"
          body="أضف صنف وقود وخزاناً، ثم أثبت رصيداً افتتاحياً قبل تسجيل أول بيع."
          action={{
            title: "إدارة البيانات الأساسية",
            onPress: () => router.push("/settings/masters" as never),
          }}
        />
      </AppScreen>
    );
  return (
    <AppScreen>
      <PageHeader
        title="فاتورة بيع جديدة"
        subtitle="يمكن ربط البيع بقراءة عداد مضخة"
        back
      />
      <Card tone="petrol">
        <Text style={styles.ruleTitle}>قاعدة الترحيل</Text>
        <Text style={styles.rule}>
          عند اختيار مضخة، يجب أن يطابق فرق العداد كمية البيع، وتُربط المضخة
          بالخزان تلقائياً. لا يوجد أي نظام ورديات.
        </Text>
      </Card>
      <Card>
        <FormInput
          label="تاريخ الفاتورة"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />
        <SelectField
          label="طريقة التحصيل"
          value={paymentMethod}
          placeholder="اختر الطريقة"
          options={[
            { label: "نقدي — صندوق", value: "cash" },
            { label: "بنك أو شبكة", value: "bank" },
            { label: "آجل — ذمم العملاء", value: "credit" },
          ]}
          onChange={(value) => {
            setPaymentMethod(value as PaymentMethod);
            setContactId("");
          }}
        />
        {paymentMethod === "credit" ? (
          <SelectField
            label="العميل"
            value={contactId}
            placeholder="اختر العميل"
            options={customers.map((item) => ({
              label: item.name,
              value: item.id,
              note: item.accountId ? "حساب مخصص" : "ذمم العملاء",
            }))}
            onChange={setContactId}
          />
        ) : null}
        {pumps.length ? (
          <>
            <SelectField
              label="المضخة (اختياري)"
              value={pumpId}
              placeholder="بيع مباشر دون مضخة"
              options={pumps.map((item) => ({
                label: `${item.code} — ${item.name}`,
                value: item.id,
                note: `آخر عداد: ${item.lastMeterReading.toLocaleString("ar-SA")}`,
              }))}
              onChange={selectPump}
            />
            {selectedPump ? (
              <FormInput
                label={`قراءة العداد الحالية — آخر قراءة ${selectedPump.lastMeterReading.toLocaleString("ar-SA")}`}
                value={meterReading}
                onChangeText={changeMeter}
                placeholder="0"
                keyboardType="numeric"
              />
            ) : null}
          </>
        ) : null}
        <SelectField
          label="صنف الوقود"
          value={productId}
          placeholder="اختر الصنف"
          options={products.map((item) => ({
            label: item.name,
            value: item.id,
            note: `سعر افتراضي: ${formatMoney(item.salesPrice, currency)}`,
          }))}
          onChange={(value) => {
            setProductId(value);
            setTankId("");
            setPumpId("");
            setMeterReading("");
            setUnitPrice(
              String(
                state.products.find((item) => item.id === value)?.salesPrice ||
                  "",
              ),
            );
          }}
        />
        <SelectField
          label="الخزان"
          value={tankId}
          placeholder="اختر الخزان"
          options={tanks.map((item) => {
            const balance = inventory.find(
              (record) => record.tankId === item.id,
            );
            return {
              label: item.name,
              value: item.id,
              note: `المتاح: ${(balance?.quantity || 0).toLocaleString("ar-SA")}`,
            };
          })}
          onChange={(value) => {
            setTankId(value);
            if (selectedPump?.tankId !== value) {
              setPumpId("");
              setMeterReading("");
            }
          }}
        />
        <FormInput
          label={selectedPump ? "الكمية — تُستنتج من فرق العداد" : "الكمية"}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          keyboardType="numeric"
          editable={!selectedPump}
        />
        <FormInput
          label="سعر البيع للوحدة"
          value={unitPrice}
          onChangeText={setUnitPrice}
          placeholder="0.00"
          keyboardType="numeric"
        />
        <Text style={styles.stock}>
          الرصيد المتاح:{" "}
          {(selectedBalance?.quantity || 0).toLocaleString("ar-SA")} · التكلفة
          المثبتة:{" "}
          {formatMoney(selectedBalance?.averageUnitCost || 0, currency)}
        </Text>
        <Text style={styles.total}>
          إجمالي الفاتورة: {formatMoney(subtotal, currency)}
        </Text>
        <AppButton
          title={saving ? "جارٍ الترحيل…" : "ترحيل فاتورة البيع"}
          icon="check-circle"
          disabled={saving}
          onPress={save}
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  ruleTitle: {
    color: palette.petroleum,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  rule: {
    color: palette.ink,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "right",
  },
  stock: { color: palette.muted, textAlign: "right", fontSize: 12 },
  total: {
    color: palette.green,
    textAlign: "right",
    fontSize: 17,
    fontWeight: "800",
    paddingTop: 5,
    borderTopColor: palette.border,
    borderTopWidth: 1,
  },
});
