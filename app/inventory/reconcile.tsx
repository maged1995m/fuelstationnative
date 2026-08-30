import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import {
  AppButton,
  AppScreen,
  Card,
  EmptyState,
  FormInput,
  PageHeader,
  SectionTitle,
  SelectField,
  formatMoney,
  palette,
  today,
} from "@/components/accounting-ui";
import { useAccounting } from "@/lib/accounting/accounting-context";
import type { SaleDocument } from "@/lib/accounting/types";

export default function InventoryReconciliationScreen() {
  const { state, inventory, addInventoryAdjustment } = useAccounting();
  const [tankId, setTankId] = useState("");
  const [actualQuantity, setActualQuantity] = useState("");
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const submitted = useRef(false);
  const currency = state.profile?.currencySymbol || "ر.س";
  const selectedTank = state.tanks.find((item) => item.id === tankId);
  const product = state.products.find(
    (item) => item.id === selectedTank?.productId,
  );
  const balance = inventory.find((item) => item.tankId === tankId);
  const hasActualQuantity = actualQuantity.trim() !== "";
  const enteredActual = Number(actualQuantity);
  const difference =
    hasActualQuantity && Number.isFinite(enteredActual)
      ? enteredActual - (balance?.quantity || 0)
      : 0;

  const reconciliation = useMemo(() => {
    if (!tankId)
      return {
        meterQuantity: 0,
        pumpInvoiceQuantity: 0,
        totalSaleQuantity: 0,
        movementQuantity: 0,
      };
    const pumpIds = state.pumps
      .filter((pump) => pump.tankId === tankId)
      .map((pump) => pump.id);
    const sales = state.documents.filter(
      (document): document is SaleDocument =>
        document.kind === "sale" &&
        document.status === "posted" &&
        document.issueDate <= date,
    );
    return {
      meterQuantity: state.pumpReadings
        .filter(
          (reading) =>
            pumpIds.includes(reading.pumpId) && reading.issueDate <= date,
        )
        .reduce((sum, reading) => sum + reading.quantity, 0),
      pumpInvoiceQuantity: sales
        .filter(
          (document) =>
            Boolean(document.pumpId) && pumpIds.includes(document.pumpId!),
        )
        .reduce(
          (sum, document) =>
            sum +
            document.lines.reduce(
              (lineSum, line) =>
                lineSum + (line.tankId === tankId ? line.quantity : 0),
              0,
            ),
          0,
        ),
      totalSaleQuantity: sales.reduce(
        (sum, document) =>
          sum +
          document.lines.reduce(
            (lineSum, line) =>
              lineSum + (line.tankId === tankId ? line.quantity : 0),
            0,
          ),
        0,
      ),
      movementQuantity: state.inventoryMovements
        .filter(
          (movement) =>
            movement.tankId === tankId && movement.occurredAt <= date,
        )
        .reduce(
          (sum, movement) => sum + movement.quantityIn - movement.quantityOut,
          0,
        ),
    };
  }, [
    date,
    state.documents,
    state.inventoryMovements,
    state.pumpReadings,
    state.pumps,
    tankId,
  ]);

  const save = async () => {
    if (submitted.current || saving) return;
    submitted.current = true;
    setSaving(true);
    try {
      await addInventoryAdjustment({
        issueDate: date,
        productId: product?.id || "",
        tankId,
        actualQuantity: enteredActual,
        reason,
      });
      setActualQuantity("");
      setReason("");
      Alert.alert(
        "تم ترحيل التسوية",
        "حُفظت حركة الفرق وقيدها المحاسبي المتوازن. أصبحت الشاشة جاهزة لتسوية جديدة.",
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

  if (!state.tanks.length) {
    return (
      <AppScreen>
        <PageHeader title="تسوية المخزون" subtitle="مطابقة الجرد الفعلي" back />
        <EmptyState
          icon="inventory"
          title="لا توجد خزانات"
          body="أضف صنفاً وخزاناً أولاً، ثم أدخل الرصيد الافتتاحي قبل بدء الجرد الفعلي."
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
        title="تسوية المخزون"
        subtitle="الجرد الفعلي ومطابقة المضخات دون ورديات"
        back
      />
      <Card tone="gold">
        <Text style={styles.noticeTitle}>
          تسوية موثقة وليست تعديلاً مباشراً
        </Text>
        <Text style={styles.notice}>
          أدخل قياس الخزان الفعلي. يُنشئ التطبيق حركة مخزون وقيداً متوازناً
          لفائض أو عجز الجرد، ويمكن عكس المستند من التفاصيل عند الحاجة.
        </Text>
      </Card>
      <Card>
        <FormInput
          label="تاريخ الجرد"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />
        <SelectField
          label="الخزان"
          value={tankId}
          placeholder="اختر الخزان المراد جرده"
          options={state.tanks
            .filter((item) => item.isActive)
            .map((item) => ({
              label: item.name,
              value: item.id,
              note:
                state.products.find((record) => record.id === item.productId)
                  ?.name || "",
            }))}
          onChange={(value) => {
            setTankId(value);
            setActualQuantity("");
          }}
        />
        {selectedTank ? (
          <>
            <View style={styles.metricGrid}>
              <Metric
                title="الرصيد الدفتري"
                value={(balance?.quantity || 0).toLocaleString("ar-SA")}
              />
              <Metric
                title="سعة الخزان"
                value={selectedTank.capacity.toLocaleString("ar-SA")}
              />
            </View>
            <FormInput
              label="الكمية الفعلية من قياس الخزان"
              value={actualQuantity}
              onChangeText={setActualQuantity}
              placeholder="0"
              keyboardType="numeric"
            />
            <Text
              style={[
                styles.difference,
                difference > 0
                  ? styles.excess
                  : difference < 0
                    ? styles.shortage
                    : styles.zero,
              ]}
            >
              فرق الجرد: {difference > 0 ? "+" : ""}
              {difference.toLocaleString("ar-SA")} وحدة · أثر تقريبي{" "}
              {formatMoney(
                Math.abs(difference) * (balance?.averageUnitCost || 0),
                currency,
              )}
            </Text>
            <FormInput
              label="سبب التسوية"
              value={reason}
              onChangeText={setReason}
              placeholder="مثال: فرق قياس خزان أو تبخر أو إدخال سابق"
              multiline
            />
          </>
        ) : null}
        <AppButton
          title={saving ? "جارٍ الترحيل…" : "ترحيل تسوية المخزون"}
          icon="fact-check"
          disabled={!tankId || !hasActualQuantity || saving}
          onPress={save}
        />
      </Card>
      {selectedTank ? (
        <>
          <SectionTitle title="مطابقة حركة الخزان حتى تاريخ الجرد" />
          <Card tone="petrol">
            <MatchRow
              label="الرصيد الناتج من حركات المخزون"
              value={reconciliation.movementQuantity}
            />
            <MatchRow
              label="فرق عدادات المضخات المرتبطة"
              value={reconciliation.meterQuantity}
            />
            <MatchRow
              label="فواتير البيع المرتبطة بالمضخات"
              value={reconciliation.pumpInvoiceQuantity}
              alert={
                Math.abs(
                  reconciliation.meterQuantity -
                    reconciliation.pumpInvoiceQuantity,
                ) > 0.009
              }
            />
            <MatchRow
              label="إجمالي فواتير البيع من الخزان"
              value={reconciliation.totalSaleQuantity}
            />
            <Text style={styles.explain}>
              يجب أن يتساوى فرق العدادات مع كمية الفواتير المرتبطة بالمضخات. إذا
              ظهر اختلاف، راجع الفواتير غير المرتبطة أو قراءات العدادات قبل
              تنفيذ التسوية.
            </Text>
          </Card>
        </>
      ) : null}
    </AppScreen>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}
function MatchRow({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <View style={styles.matchRow}>
      <Text style={styles.matchLabel}>{label}</Text>
      <Text style={[styles.matchValue, alert && styles.shortage]}>
        {value.toLocaleString("ar-SA")}
      </Text>
    </View>
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
  metricGrid: { flexDirection: "row-reverse", gap: 10 },
  metric: {
    flex: 1,
    padding: 12,
    backgroundColor: palette.softPetrol,
    borderRadius: 14,
  },
  metricTitle: { color: palette.muted, fontSize: 11, textAlign: "right" },
  metricValue: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 4,
  },
  difference: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    padding: 11,
    borderRadius: 12,
  },
  excess: { color: palette.green, backgroundColor: palette.softGreen },
  shortage: { color: palette.red, backgroundColor: palette.softRed },
  zero: { color: palette.petroleum, backgroundColor: palette.softPetrol },
  matchRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomColor: "#C6E2E5",
    borderBottomWidth: 1,
  },
  matchLabel: { flex: 1, color: palette.ink, fontSize: 13, textAlign: "right" },
  matchValue: { color: palette.petroleum, fontSize: 14, fontWeight: "900" },
  explain: {
    color: palette.muted,
    fontSize: 12,
    textAlign: "right",
    lineHeight: 20,
    paddingTop: 10,
  },
});
