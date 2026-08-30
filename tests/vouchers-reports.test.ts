import { describe, expect, it } from "vitest";
import { createInitialState, createProduct, createTank, postOpeningBalance, postPayment, postReceipt } from "../lib/accounting/engine";
import { buildAccountStatement, buildInventoryMovementReport } from "../lib/accounting/detailed-reports";

describe("offline vouchers and detailed reports", () => {
  it("posts a receipt against a selected account", () => {
    const state = createInitialState();
    const next = postReceipt(state, {
      issueDate: "2026-01-01",
      amount: 100,
      settlementAccountId: state.accountMap!.cashAccountId,
      accountId: state.accountMap!.receivablesAccountId,
      description: "تحصيل عميل",
    });
    expect(next.documents[0]?.kind).toBe("receipt");
    expect(next.journalEntries[0]?.lines.reduce((sum, line) => sum + line.debit, 0)).toBe(100);
    expect(buildAccountStatement(next, state.accountMap!.receivablesAccountId)).toHaveLength(1);
  });

  it("posts a payment against a selected account", () => {
    const state = createInitialState();
    const next = postPayment(state, {
      issueDate: "2026-01-01",
      amount: 75,
      settlementAccountId: state.accountMap!.cashAccountId,
      accountId: state.accountMap!.payablesAccountId,
      description: "سداد مورد",
    });
    expect(next.documents[0]?.kind).toBe("payment");
    expect(next.journalEntries[0]?.lines.reduce((sum, line) => sum + line.credit, 0)).toBe(75);
  });

  it("builds detailed inventory movement rows", () => {
    let state = createInitialState();
    state = createProduct(state, { sku: "95", name: "بنزين 95", salesPrice: 2.3, minimumQuantity: 10 });
    const product = state.products[0]!;
    state = createTank(state, { name: "الخزان 1", productId: product.id, capacity: 1000, minimumQuantity: 10 });
    const tank = state.tanks[0]!;
    state = postOpeningBalance(state, { issueDate: "2026-01-01", productId: product.id, tankId: tank.id, quantity: 100, unitCost: 1.5 });
    const rows = buildInventoryMovementReport(state, product.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.balanceQuantity).toBe(100);
    expect(rows[0]?.productName).toBe("بنزين 95");
  });
});
