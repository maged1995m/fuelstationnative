import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import { AppButton, AppScreen, Card, EmptyState, FormInput, PageHeader, SelectField, palette, today } from "@/components/accounting-ui";
import { useAccounting } from "@/lib/accounting/accounting-context";

export default function OpeningInventoryScreen() {
  const { state, addOpeningBalance } = useAccounting();
  const [productId, setProductId] = useState(""); const [tankId, setTankId] = useState(""); const [quantity, setQuantity] = useState(""); const [unitCost, setUnitCost] = useState(""); const [date, setDate] = useState(today()); const [saving, setSaving] = useState(false);
  const productOptions = state.products.filter((item) => item.isActive).map((item) => ({ label: item.name, value: item.id, note: item.sku }));
  const tankOptions = state.tanks.filter((item) => item.isActive && (!productId || item.productId === productId)).map((item) => ({ label: item.name, value: item.id, note: `السعة: ${item.capacity.toLocaleString("ar-SA")}` }));
  const save = async () => { try { setSaving(true); await addOpeningBalance({ issueDate: date, productId, tankId, quantity: Number(quantity), unitCost: Number(unitCost) }); Alert.alert("تم الترحيل", "أُثبت المخزون الافتتاحي وحُفظ قيده المزدوج محلياً.", [{ text: "حسناً", onPress: () => router.replace("/(tabs)/inventory" as never) }]); } catch (error) { Alert.alert("تعذر الترحيل", error instanceof Error ? error.message : "حدث خطأ غير متوقع."); } finally { setSaving(false); } };
  if (!state.products.length || !state.tanks.length) return <AppScreen><PageHeader title="مخزون افتتاحي" subtitle="تحتاج إلى صنف وخزان" back /><EmptyState icon="inventory" title="عرّف البيانات الأساسية أولاً" body="لا يمكن إدخال رصيد افتتاحي قبل إضافة صنف وقود وخزان مرتبط به." action={{ title: "إدارة البيانات الأساسية", onPress: () => router.push("/settings/masters" as never) }} /></AppScreen>;
  return <AppScreen><PageHeader title="مخزون افتتاحي" subtitle="عملية محاسبية تُنفذ مرة واحدة لكل خزان وصنف" back /><Card tone="gold"><Text style={styles.noticeTitle}>تنبيه محاسبي</Text><Text style={styles.notice}>بعد الترحيل لا يمكن تعديل الرصيد الافتتاحي أو حذفه. عند الخطأ، أنشئ عكساً موثقاً من تفاصيل المستند ثم أدخل الرصيد الصحيح.</Text></Card><Card><FormInput label="تاريخ بدء الرصيد" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" /><SelectField label="صنف الوقود" value={productId} placeholder="اختر الصنف" options={productOptions} onChange={(value) => { setProductId(value); setTankId(""); }} /><SelectField label="الخزان" value={tankId} placeholder="اختر الخزان" options={tankOptions} onChange={setTankId} /><FormInput label="الكمية الافتتاحية" value={quantity} onChangeText={setQuantity} placeholder="0" keyboardType="numeric" /><FormInput label="تكلفة الوحدة" value={unitCost} onChangeText={setUnitCost} placeholder="0.00" keyboardType="numeric" /><AppButton title={saving ? "جارٍ الترحيل…" : "ترحيل المخزون الافتتاحي"} icon="verified" disabled={saving} onPress={save} /></Card></AppScreen>;
}

const styles = StyleSheet.create({ noticeTitle: { color: "#916000", fontSize: 15, fontWeight: "800", textAlign: "right" }, notice: { color: palette.ink, fontSize: 13, lineHeight: 21, textAlign: "right" } });
