import * as Print from "expo-print";
import * as XLSX from "xlsx";

import {
  copyLocalFileToDocuments,
  saveLocalBytesFile,
  shareLocalFile,
  type SavedLocalFile,
} from "./local-files";
import {
  buildDailyInventoryReport,
  buildDailySalesReport,
  type DailyReportData,
  type DailyReportKind,
} from "./daily-report-data";
import type { LocalAccountingState } from "@/lib/accounting/types";

export {
  buildDailyInventoryReport,
  buildDailySalesReport,
  type DailyReportKind,
} from "./daily-report-data";

const number = (value: number) =>
  Number(value || 0).toLocaleString("ar-SA", { maximumFractionDigits: 2 });
const escapeHtml = (value: string | number) =>
  String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] || character,
  );

function reportHtml(state: LocalAccountingState, report: DailyReportData) {
  const rows =
    report.lines
      .map(
        (line) =>
          `<tr>${line.cells.map((cell) => `<td>${escapeHtml(typeof cell === "number" ? number(cell) : cell)}</td>`).join("")}</tr>`,
      )
      .join("") ||
    `<tr><td colspan="${report.headers.length}">لا توجد بيانات مرحّلة في هذا التاريخ.</td></tr>`;
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8" /><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172628;font-size:10px;direction:rtl}.head{border-bottom:2px solid #0E4C5A;padding-bottom:10px;margin-bottom:12px}.station{font-size:20px;font-weight:800;color:#0E4C5A}.title{font-size:16px;font-weight:700;margin-top:5px}.date{color:#52676a;margin-top:3px}table{border-collapse:collapse;width:100%;margin-top:12px}th{background:#0E4C5A;color:#fff;padding:7px 5px;text-align:right;font-size:9px}td{border:1px solid #D7E0E1;padding:6px 5px;text-align:right;font-size:9px}.summary{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}.summary div{background:#F3F8F8;border:1px solid #C6E2E5;border-radius:6px;padding:8px 10px;min-width:130px}.summary span{color:#52676a;display:block;font-size:9px}.summary b{color:#172628;font-size:12px;margin-top:3px;display:block}.foot{margin-top:10px;color:#52676a;font-size:9px}</style></head><body><section class="head"><div class="station">${escapeHtml(state.profile?.name || "دفاتر الوقود")}</div><div class="title">${escapeHtml(report.title)}</div><div class="date">التاريخ: ${escapeHtml(report.date)}</div></section><table><thead><tr>${report.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table><section class="summary">${report.summary.map((item) => `<div><span>${escapeHtml(item.label)}</span><b>${escapeHtml(item.value)}</b></div>`).join("")}</section><div class="foot">تقرير محلي مُستخرج من البيانات المرحّلة في تطبيق دفاتر الوقود.</div></body></html>`;
}

async function shareSavedReport(
  file: SavedLocalFile,
  mimeType: string,
  title: string,
) {
  await shareLocalFile(file, mimeType, title);
  return file;
}

export async function exportDailyReportPdf(
  state: LocalAccountingState,
  kind: DailyReportKind,
  date: string,
) {
  const report =
    kind === "sales"
      ? buildDailySalesReport(state, date)
      : buildDailyInventoryReport(state, date);
  const { uri } = await Print.printToFileAsync({
    html: reportHtml(state, report),
  });
  const file = await copyLocalFileToDocuments(
    uri,
    `${kind === "sales" ? "daily-sales" : "daily-inventory"}-${date}.pdf`,
  );
  return shareSavedReport(file, "application/pdf", `مشاركة ${report.title}`);
}

export async function exportDailyReportExcel(
  state: LocalAccountingState,
  kind: DailyReportKind,
  date: string,
) {
  const report =
    kind === "sales"
      ? buildDailySalesReport(state, date)
      : buildDailyInventoryReport(state, date);
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    [state.profile?.name || "دفاتر الوقود"],
    [report.title],
    [`التاريخ: ${report.date}`],
    [],
    report.headers,
    ...report.lines.map((line) => line.cells),
    [],
    ["الملخص"],
    ...report.summary.map((item) => [item.label, item.value]),
  ]);
  sheet["!cols"] = report.headers.map((header) => ({
    wch: Math.max(14, header.length + 4),
  }));
  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    kind === "sales" ? "المبيعات" : "المخزون",
  );
  const bytes = new Uint8Array(
    XLSX.write(workbook, { bookType: "xlsx", type: "array" }),
  );
  const file = await saveLocalBytesFile(
    `${kind === "sales" ? "daily-sales" : "daily-inventory"}-${date}.xlsx`,
    bytes,
  );
  return shareSavedReport(
    file,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    `مشاركة ${report.title}`,
  );
}
