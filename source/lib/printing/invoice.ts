import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import type {
  LocalAccountingState,
  PurchaseDocument,
  SaleDocument,
} from "@/lib/accounting/types";

type InvoiceDocument = SaleDocument | PurchaseDocument;

const escapeHtml = (value: string | number) =>
  String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] || character,
  );
const number = (value: number) =>
  Number(value || 0).toLocaleString("ar-SA", { maximumFractionDigits: 2 });
const money = (value: number, currency: string) =>
  `${number(value)} ${escapeHtml(currency)}`;

export function createInvoiceHtml(
  document: InvoiceDocument,
  state: LocalAccountingState,
) {
  const currency = state.profile?.currencySymbol || "ر.س";
  const isSale = document.kind === "sale";
  const contact = state.contacts.find((item) => item.id === document.contactId);
  const pump =
    isSale && document.pumpId
      ? state.pumps.find((item) => item.id === document.pumpId)
      : undefined;
  const lines = document.lines
    .map((line) => {
      const product = state.products.find((item) => item.id === line.productId);
      return `<tr><td>${escapeHtml(product?.name || "صنف وقود")}</td><td>${number(line.quantity)}</td><td>${money(line.unitPrice, currency)}</td><td>${money(line.quantity * line.unitPrice, currency)}</td></tr>`;
    })
    .join("");
  const payment =
    document.paymentMethod === "cash"
      ? "نقدي"
      : document.paymentMethod === "bank"
        ? "شبكة / بنك"
        : "آجل";
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>@page{size:80mm auto;margin:3mm}*{box-sizing:border-box}body{width:74mm;margin:0 auto;color:#172628;font-family:Arial,sans-serif;font-size:11px;direction:rtl}.head{text-align:center;border-bottom:1px dashed #52676a;padding-bottom:8px;margin-bottom:8px}.name{font-weight:800;font-size:17px;color:#0E4C5A}.kind{font-weight:700;margin-top:4px}.meta{display:flex;justify-content:space-between;gap:8px;margin:4px 0}table{width:100%;border-collapse:collapse;margin:8px 0}th{text-align:right;color:#52676a;font-size:10px;border-bottom:1px solid #a9b7b8;padding:5px 0}td{text-align:right;border-bottom:1px dotted #c7d0d1;padding:6px 0;font-size:10px}.total{border-top:1px solid #172628;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-weight:800;font-size:15px}.note{margin-top:10px;text-align:center;color:#52676a;font-size:9px}.badge{color:#916000;font-weight:700}</style></head><body><section class="head"><div class="name">${escapeHtml(state.profile?.name || "دفاتر الوقود")}</div><div class="kind">${isSale ? "فاتورة بيع" : "فاتورة شراء"}</div><div class="badge">${escapeHtml(document.number)}</div></section><div class="meta"><span>التاريخ</span><b>${escapeHtml(document.issueDate)}</b></div><div class="meta"><span>طريقة السداد</span><b>${payment}</b></div>${contact ? `<div class="meta"><span>${isSale ? "العميل" : "المورد"}</span><b>${escapeHtml(contact.name)}</b></div>` : ""}${pump ? `<div class="meta"><span>المضخة</span><b>${escapeHtml(pump.code)} — ${escapeHtml(pump.name)}</b></div>` : ""}${pump && document.meterReading !== undefined ? `<div class="meta"><span>قراءة العداد</span><b>${number(document.meterReading)}</b></div>` : ""}<table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${lines}</tbody></table><div class="total"><span>الإجمالي</span><span>${money(document.total, currency)}</span></div><div class="note">إيصال محلي صادر من تطبيق دفاتر الوقود</div></body></html>`;
}

export async function printInvoice(
  document: InvoiceDocument,
  state: LocalAccountingState,
) {
  await Print.printAsync({
    html: createInvoiceHtml(document, state),
    width: 226,
    height: 1000,
  });
}

export async function shareThermalInvoicePdf(
  document: InvoiceDocument,
  state: LocalAccountingState,
) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("المشاركة المحلية غير مدعومة على هذا الجهاز.");
  const { uri } = await Print.printToFileAsync({
    html: createInvoiceHtml(document, state),
    width: 226,
    height: 1000,
  });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: `مشاركة إيصال ${document.number}`,
  });
}
