import type { LocalAccountingState, SaleDocument } from "../accounting/types";
import { getAllInventoryBalances } from "../accounting/engine";

export type DailyReportKind = "sales" | "inventory";

interface ReportLine {
  cells: Array<string | number>;
}

export interface DailyReportData {
  kind: DailyReportKind;
  title: string;
  date: string;
  headers: string[];
  lines: ReportLine[];
  summary: Array<{ label: string; value: string }>;
}

const number = (value: number) =>
  Number(value || 0).toLocaleString("ar-SA", { maximumFractionDigits: 2 });
const paymentLabel = (method: SaleDocument["paymentMethod"]) =>
  method === "cash" ? "نقدي" : method === "bank" ? "شبكة / بنك" : "آجل";

export function buildDailySalesReport(
  state: LocalAccountingState,
  date: string,
): DailyReportData {
  const currency = state.profile?.currencySymbol || "ر.س";
  const invoices = state.documents.filter(
    (document): document is SaleDocument =>
      document.kind === "sale" &&
      document.status === "posted" &&
      document.issueDate === date,
  );
  const lines = invoices.flatMap((invoice) =>
    invoice.lines.map((line) => {
      const product = state.products.find((item) => item.id === line.productId);
      const tank = state.tanks.find((item) => item.id === line.tankId);
      const pump = invoice.pumpId
        ? state.pumps.find((item) => item.id === invoice.pumpId)
        : undefined;
      return {
        cells: [
          invoice.number,
          product?.name || "صنف",
          tank?.name || "خزان",
          pump?.code || "—",
          paymentLabel(invoice.paymentMethod),
          line.quantity,
          line.unitPrice,
          line.quantity * line.unitPrice,
          line.quantity * line.unitCostAtPosting,
          line.quantity * (line.unitPrice - line.unitCostAtPosting),
        ],
      };
    }),
  );
  const total = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const cost = invoices.reduce((sum, invoice) => sum + invoice.totalCost, 0);
  const quantity = invoices.reduce(
    (sum, invoice) =>
      sum + invoice.lines.reduce((lineSum, line) => lineSum + line.quantity, 0),
    0,
  );
  return {
    kind: "sales",
    title: "التقرير اليومي للمبيعات",
    date,
    headers: [
      "الفاتورة",
      "الصنف",
      "الخزان",
      "المضخة",
      "التحصيل",
      "الكمية",
      "سعر الوحدة",
      "المبيعات",
      "التكلفة",
      "الربح الإجمالي",
    ],
    lines,
    summary: [
      { label: "عدد الفواتير", value: number(invoices.length) },
      { label: "الكمية المباعة", value: number(quantity) },
      { label: "إجمالي المبيعات", value: `${number(total)} ${currency}` },
      { label: "إجمالي التكلفة", value: `${number(cost)} ${currency}` },
      { label: "الربح الإجمالي", value: `${number(total - cost)} ${currency}` },
    ],
  };
}

export function buildDailyInventoryReport(
  state: LocalAccountingState,
  date: string,
): DailyReportData {
  const currency = state.profile?.currencySymbol || "ر.س";
  const balances = getAllInventoryBalances(state);
  const lines = balances.map((balance) => {
    const product = state.products.find(
      (item) => item.id === balance.productId,
    );
    const tank = state.tanks.find((item) => item.id === balance.tankId);
    const pumpIds = state.pumps
      .filter((pump) => pump.tankId === balance.tankId)
      .map((pump) => pump.id);
    const meterQuantity = state.pumpReadings
      .filter(
        (reading) =>
          reading.issueDate === date && pumpIds.includes(reading.pumpId),
      )
      .reduce((sum, reading) => sum + reading.quantity, 0);
    const salesQuantity = state.documents
      .filter(
        (document): document is SaleDocument =>
          document.kind === "sale" &&
          document.status === "posted" &&
          document.issueDate === date,
      )
      .reduce(
        (sum, document) =>
          sum +
          document.lines.reduce(
            (lineSum, line) =>
              lineSum + (line.tankId === balance.tankId ? line.quantity : 0),
            0,
          ),
        0,
      );
    return {
      cells: [
        product?.name || "صنف",
        tank?.name || "خزان",
        tank?.capacity || 0,
        balance.quantity,
        balance.averageUnitCost,
        balance.value,
        meterQuantity,
        salesQuantity,
        meterQuantity - salesQuantity,
      ],
    };
  });
  const value = balances.reduce((sum, balance) => sum + balance.value, 0);
  const quantity = balances.reduce((sum, balance) => sum + balance.quantity, 0);
  return {
    kind: "inventory",
    title: "التقرير اليومي للمخزون",
    date,
    headers: [
      "الصنف",
      "الخزان",
      "السعة",
      "الرصيد الدفتري",
      "متوسط التكلفة",
      "القيمة",
      "فرق العدادات اليوم",
      "مبيعات اليوم",
      "فرق العداد / الفواتير",
    ],
    lines,
    summary: [
      { label: "عدد الخزانات", value: number(balances.length) },
      { label: "إجمالي الرصيد", value: number(quantity) },
      { label: "قيمة المخزون", value: `${number(value)} ${currency}` },
    ],
  };
}
