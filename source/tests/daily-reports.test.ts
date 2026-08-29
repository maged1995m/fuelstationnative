import { describe, expect, it } from "vitest";

import {
  buildDailyInventoryReport,
  buildDailySalesReport,
} from "../lib/exports/daily-report-data";
import {
  createInitialState,
  createProduct,
  createPump,
  createTank,
  postOpeningBalance,
  postSale,
} from "../lib/accounting/engine";

describe("بيانات التقارير اليومية المحلية", () => {
  it("يستخرج تقرير المبيعات من الفواتير المرحلة في التاريخ المحدد فقط", () => {
    let state = createInitialState();
    state = createProduct(state, {
      sku: "G95",
      name: "بنزين 95",
      salesPrice: 2,
      minimumQuantity: 5,
    });
    const product = state.products[0];
    state = createTank(state, {
      name: "الخزان 1",
      productId: product.id,
      capacity: 500,
      minimumQuantity: 20,
    });
    const tank = state.tanks[0];
    state = postOpeningBalance(state, {
      issueDate: "2026-08-28",
      productId: product.id,
      tankId: tank.id,
      quantity: 100,
      unitCost: 1.2,
    });
    state = postSale(state, {
      issueDate: "2026-08-28",
      paymentMethod: "cash",
      lines: [
        { productId: product.id, tankId: tank.id, quantity: 10, unitPrice: 2 },
      ],
    });
    state = postSale(state, {
      issueDate: "2026-08-29",
      paymentMethod: "cash",
      lines: [
        { productId: product.id, tankId: tank.id, quantity: 5, unitPrice: 2 },
      ],
    });

    const report = buildDailySalesReport(state, "2026-08-28");
    expect(report.lines).toHaveLength(1);
    expect(report.lines[0].cells).toContain(10);
    expect(
      report.summary.find((item) => item.label === "إجمالي المبيعات")?.value,
    ).toContain("٢٠");
  });

  it("يعرض تقرير المخزون فرق عداد المضخة ومبيعات الخزان في اليوم نفسه", () => {
    let state = createInitialState();
    state = createProduct(state, {
      sku: "DIESEL",
      name: "ديزل",
      salesPrice: 1.8,
      minimumQuantity: 5,
    });
    const product = state.products[0];
    state = createTank(state, {
      name: "خزان الديزل",
      productId: product.id,
      capacity: 500,
      minimumQuantity: 20,
    });
    const tank = state.tanks[0];
    state = postOpeningBalance(state, {
      issueDate: "2026-08-28",
      productId: product.id,
      tankId: tank.id,
      quantity: 100,
      unitCost: 1,
    });
    state = createPump(state, {
      code: "P-01",
      name: "مضخة ديزل",
      tankId: tank.id,
      initialMeterReading: 100,
    });
    state = postSale(state, {
      issueDate: "2026-08-28",
      paymentMethod: "cash",
      pumpId: state.pumps[0].id,
      meterReading: 115,
      lines: [
        {
          productId: product.id,
          tankId: tank.id,
          quantity: 15,
          unitPrice: 1.8,
        },
      ],
    });

    const report = buildDailyInventoryReport(state, "2026-08-28");
    expect(report.lines).toHaveLength(1);
    expect(report.lines[0].cells.slice(-3)).toEqual([15, 15, 0]);
  });
});
