import { describe, expect, it } from "vitest";

import {
  createContact,
  createInitialState,
  createProduct,
  createPump,
  createTank,
  getAccountBalances,
  getInventoryBalance,
  postOpeningBalance,
  postPurchase,
  postManualJournal,
  postInventoryAdjustment,
  postSale,
  reverseDocument,
} from "../lib/accounting/engine";

const date = "2026-08-28";

function preparedState() {
  let state = createInitialState();
  state = createProduct(state, { sku: "G95", name: "بنزين 95", salesPrice: 2, minimumQuantity: 10 });
  const product = state.products[0];
  state = createTank(state, { name: "خزان البنزين", productId: product.id, capacity: 1_000, minimumQuantity: 50 });
  return { state, product, tank: state.tanks[0] };
}

function balanceByCode(state: ReturnType<typeof createInitialState>, code: string) {
  const account = state.accounts.find((item) => item.code === code);
  if (!account) throw new Error(`missing account ${code}`);
  return getAccountBalances(state).find((item) => item.accountId === account.id)?.balance;
}

describe("محرك محاسبة محطة الوقود المحلي", () => {
  it("يثبت المخزون الافتتاحي بقيد متوازن ولا يسمح بتكراره", () => {
    const { state: base, product, tank } = preparedState();
    const state = postOpeningBalance(base, { issueDate: date, productId: product.id, tankId: tank.id, quantity: 100, unitCost: 1.25 });

    expect(getInventoryBalance(state, product.id, tank.id)).toEqual({ productId: product.id, tankId: tank.id, quantity: 100, averageUnitCost: 1.25, value: 125 });
    expect(balanceByCode(state, "1310")).toBe(125);
    expect(balanceByCode(state, "3110")).toBe(125);
    expect(() => postOpeningBalance(state, { issueDate: date, productId: product.id, tankId: tank.id, quantity: 10, unitCost: 1.25 })).toThrow("يوجد مخزون افتتاحي مرحّل");
  });

  it("يرحل البيع النقدي كمبيعات وتكلفة ومخزون في عملية واحدة", () => {
    const { state: base, product, tank } = preparedState();
    const opened = postOpeningBalance(base, { issueDate: date, productId: product.id, tankId: tank.id, quantity: 100, unitCost: 1.25 });
    const state = postSale(opened, { issueDate: date, paymentMethod: "cash", lines: [{ productId: product.id, tankId: tank.id, quantity: 10, unitPrice: 2 }] });

    expect(getInventoryBalance(state, product.id, tank.id)).toMatchObject({ quantity: 90, value: 112.5, averageUnitCost: 1.25 });
    expect(balanceByCode(state, "1110")).toBe(20);
    expect(balanceByCode(state, "4110")).toBe(20);
    expect(balanceByCode(state, "5110")).toBe(12.5);
    expect(balanceByCode(state, "1310")).toBe(112.5);
    const journal = state.journalEntries.at(-1)!;
    expect(journal.lines.reduce((sum, line) => sum + line.debit, 0)).toBe(journal.lines.reduce((sum, line) => sum + line.credit, 0));
  });

  it("يرفض بيع كميات مجمعة أكبر من المخزون المتاح", () => {
    const { state: base, product, tank } = preparedState();
    const opened = postOpeningBalance(base, { issueDate: date, productId: product.id, tankId: tank.id, quantity: 100, unitCost: 1 });

    expect(() => postSale(opened, {
      issueDate: date,
      paymentMethod: "cash",
      lines: [
        { productId: product.id, tankId: tank.id, quantity: 60, unitPrice: 2 },
        { productId: product.id, tankId: tank.id, quantity: 60, unitPrice: 2 },
      ],
    })).toThrow("يتجاوز الرصيد المتاح");
  });

  it("يضيف التوريد الآجل والمصروف المرسمل إلى المخزون مع بقاء القيد متوازناً", () => {
    const { state: base, product, tank } = preparedState();
    let state = postOpeningBalance(base, { issueDate: date, productId: product.id, tankId: tank.id, quantity: 100, unitCost: 1 });
    state = createContact(state, { name: "شركة التوريد", type: "supplier", accountId: "system-2110" });
    const supplier = state.contacts[0];
    state = postPurchase(state, {
      issueDate: date,
      paymentMethod: "credit",
      contactId: supplier.id,
      lines: [{ productId: product.id, tankId: tank.id, quantity: 50, unitPrice: 1.5 }],
      expenses: [{ id: "expense-1", description: "نقل", amount: 5, fundingAccountId: "system-1110", capitalized: true }],
    });

    expect(getInventoryBalance(state, product.id, tank.id)).toMatchObject({ quantity: 150, value: 180, averageUnitCost: 1.2 });
    expect(balanceByCode(state, "1310")).toBe(180);
    expect(balanceByCode(state, "2110")).toBe(75);
    expect(balanceByCode(state, "1110")).toBe(-5);
    const journal = state.journalEntries.at(-1)!;
    expect(journal.lines.reduce((sum, line) => sum + line.debit, 0)).toBe(journal.lines.reduce((sum, line) => sum + line.credit, 0));
  });

  it("يعكس المستند المرحّل بدل حذفه ويعيد الأرصدة إلى وضعها السابق", () => {
    const { state: base, product, tank } = preparedState();
    const opened = postOpeningBalance(base, { issueDate: date, productId: product.id, tankId: tank.id, quantity: 100, unitCost: 1 });
    const sold = postSale(opened, { issueDate: date, paymentMethod: "cash", lines: [{ productId: product.id, tankId: tank.id, quantity: 10, unitPrice: 2 }] });
    const original = sold.documents.at(-1)!;
    const reversed = reverseDocument(sold, { documentId: original.id, issueDate: date, reason: "إدخال فاتورة بالخطأ" });

    expect(getInventoryBalance(reversed, product.id, tank.id)).toMatchObject({ quantity: 100, value: 100 });
    expect(balanceByCode(reversed, "1110")).toBe(0);
    expect(balanceByCode(reversed, "4110")).toBe(0);
    expect(balanceByCode(reversed, "5110")).toBe(0);
    expect(reversed.documents.find((item) => item.id === original.id)?.status).toBe("reversed");
  });

  it("يرفض القيد اليدوي الذي يحرك قيمة المخزون من دون حركة مخزون موثقة", () => {
    const { state } = preparedState();
    expect(() => postManualJournal(state, {
      issueDate: date,
      description: "تعديل مباشر غير مسموح",
      lines: [
        { accountId: "system-1310", debit: 10, credit: 0 },
        { accountId: "system-1110", debit: 0, credit: 10 },
      ],
    })).toThrow("لا يمكن للقيد اليدوي تعديل حساب مخزون الوقود");
  });

  it("يربط بيع المضخة بفرق عداد صحيح ويحفظ القراءة دون إنشاء وردية", () => {
    const { state: base, product, tank } = preparedState();
    let state = postOpeningBalance(base, { issueDate: date, productId: product.id, tankId: tank.id, quantity: 100, unitCost: 1.25 });
    state = createPump(state, { code: "P-01", name: "مضخة البنزين 1", tankId: tank.id, initialMeterReading: 1000 });
    const pump = state.pumps[0];
    state = postSale(state, {
      issueDate: date,
      paymentMethod: "cash",
      pumpId: pump.id,
      meterReading: 1012.5,
      lines: [{ productId: product.id, tankId: tank.id, quantity: 12.5, unitPrice: 2 }],
    });

    expect(state.pumps[0].lastMeterReading).toBe(1012.5);
    expect(state.pumpReadings).toMatchObject([{ pumpId: pump.id, previousMeterReading: 1000, currentMeterReading: 1012.5, quantity: 12.5 }]);
    expect(state.documents.at(-1)).toMatchObject({ kind: "sale", pumpId: pump.id, meterReading: 1012.5 });
    expect(getInventoryBalance(state, product.id, tank.id).quantity).toBe(87.5);
    expect(() => postSale(state, { issueDate: date, paymentMethod: "cash", pumpId: pump.id, meterReading: 1010, lines: [{ productId: product.id, tankId: tank.id, quantity: 0.1, unitPrice: 2 }] })).toThrow("لا يمكن أن تكون أقل");
    expect(() => postSale(state, { issueDate: date, paymentMethod: "cash", pumpId: pump.id, meterReading: 1015, lines: [{ productId: product.id, tankId: tank.id, quantity: 2, unitPrice: 2 }] })).toThrow("كمية البيع يجب أن تطابق فرق العداد");
  });

  it("يثبت جرداً فعلياً بعجز كحركة مخزون وقيد فرق متوازن قابل للعكس", () => {
    const { state: base, product, tank } = preparedState();
    const opened = postOpeningBalance(base, { issueDate: date, productId: product.id, tankId: tank.id, quantity: 100, unitCost: 1.5 });
    const adjusted = postInventoryAdjustment(opened, { issueDate: date, productId: product.id, tankId: tank.id, actualQuantity: 90, reason: "فرق قياس الخزان" });
    const adjustment = adjusted.documents.at(-1)!;

    expect(getInventoryBalance(adjusted, product.id, tank.id)).toMatchObject({ quantity: 90, value: 135 });
    expect(balanceByCode(adjusted, "5130")).toBe(15);
    expect(adjusted.inventoryMovements.at(-1)).toMatchObject({ kind: "adjustment", quantityIn: 0, quantityOut: 10 });
    const journal = adjusted.journalEntries.at(-1)!;
    expect(journal.lines.reduce((sum, line) => sum + line.debit, 0)).toBe(journal.lines.reduce((sum, line) => sum + line.credit, 0));
    const reversed = reverseDocument(adjusted, { documentId: adjustment.id, issueDate: date, reason: "إعادة القياس" });
    expect(getInventoryBalance(reversed, product.id, tank.id)).toMatchObject({ quantity: 100, value: 150 });
  });
});
