import type {
  Account,
  AccountBalance,
  AccountMap,
  AccountingDocument,
  Contact,
  InventoryBalance,
  InventoryAdjustmentDocument,
  InventoryMovement,
  JournalEntry,
  JournalLine,
  LocalAccountingState,
  ManualJournalDocument,
  OpeningBalanceDocument,
  PaymentMethod,
  Pump,
  PumpReading,
  Product,
  PurchaseDocument,
  PaymentDocument,
  PurchaseExpense,
  PurchaseLine,
  ReversalDocument,
  ReceiptDocument,
  SaleDocument,
  SaleLine,
  Tank,
} from "./types";

const PRECISION = 2;

export const roundMoney = (value: number) =>
  Math.round((Number(value) + Number.EPSILON) * 10 ** PRECISION) / 10 ** PRECISION;

export const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const now = () => new Date().toISOString();

const nonEmpty = (value: string, field: string) => {
  if (!value?.trim()) throw new Error(`حقل «${field}» مطلوب.`);
  return value.trim();
};

const positive = (value: number, field: string) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error(`يجب أن تكون قيمة «${field}» أكبر من الصفر.`);
  }
  return roundMoney(normalized);
};

const getAccount = (state: LocalAccountingState, id: string) => {
  const account = state.accounts.find((item) => item.id === id && item.isActive);
  if (!account) throw new Error("الحساب المحدد غير موجود أو غير نشط.");
  return account;
};

const getProduct = (state: LocalAccountingState, id: string) => {
  const product = state.products.find((item) => item.id === id && item.isActive);
  if (!product) throw new Error("صنف الوقود المحدد غير موجود أو غير نشط.");
  return product;
};

const getTank = (state: LocalAccountingState, id: string, productId?: string) => {
  const tank = state.tanks.find((item) => item.id === id && item.isActive);
  if (!tank) throw new Error("الخزان المحدد غير موجود أو غير نشط.");
  if (productId && tank.productId !== productId) {
    throw new Error("الخزان المحدد لا يتوافق مع صنف الوقود في السطر.");
  }
  return tank;
};

const getPump = (state: LocalAccountingState, id: string) => {
  const pump = state.pumps.find((item) => item.id === id && item.isActive);
  if (!pump) throw new Error("المضخة المحددة غير موجودة أو غير نشطة.");
  return pump;
};

const getContact = (state: LocalAccountingState, id: string | undefined, expectedType: Contact["type"]) => {
  if (!id) throw new Error(expectedType === "customer" ? "البيع الآجل يتطلب اختيار عميل." : "الشراء الآجل يتطلب اختيار مورد.");
  const contact = state.contacts.find((item) => item.id === id && item.isActive && item.type === expectedType);
  if (!contact) throw new Error(expectedType === "customer" ? "العميل المحدد غير موجود أو غير نشط." : "المورد المحدد غير موجود أو غير نشط.");
  return contact;
};

const formatDocumentNumber = (prefix: string, sequence: number) => `${prefix}-${String(sequence).padStart(6, "0")}`;

const allocateAmount = (amount: number, quantities: number[]) => {
  const totalQuantity = quantities.reduce((sum, quantity) => sum + quantity, 0);
  if (totalQuantity <= 0) return quantities.map(() => 0);
  const allocations = quantities.map((quantity) => roundMoney((amount * quantity) / totalQuantity));
  const variance = roundMoney(amount - allocations.reduce((sum, allocation) => sum + allocation, 0));
  if (allocations.length && variance !== 0) allocations[allocations.length - 1] = roundMoney(allocations[allocations.length - 1] + variance);
  return allocations;
};

export const validateJournalLines = (lines: JournalLine[]) => {
  if (lines.length < 2) throw new Error("القيد المحاسبي يحتاج سطرين على الأقل.");
  let debit = 0;
  let credit = 0;
  lines.forEach((line) => {
    const lineDebit = Number(line.debit) || 0;
    const lineCredit = Number(line.credit) || 0;
    if (lineDebit < 0 || lineCredit < 0 || (lineDebit > 0 && lineCredit > 0) || (lineDebit === 0 && lineCredit === 0)) {
      throw new Error("كل سطر قيد يجب أن يحتوي مديناً أو دائناً موجباً واحداً فقط.");
    }
    debit = roundMoney(debit + lineDebit);
    credit = roundMoney(credit + lineCredit);
  });
  if (debit <= 0 || Math.abs(debit - credit) > 0.009) {
    throw new Error("لا يمكن ترحيل قيد غير متوازن؛ يجب أن يتساوى إجمالي المدين والدائن.");
  }
};

const appendJournal = (
  state: LocalAccountingState,
  documentId: string,
  number: string,
  entryDate: string,
  description: string,
  lines: Omit<JournalLine, "id">[],
  reversalOfId?: string,
) => {
  const normalized = lines.map((line) => ({
    ...line,
    id: createId("jl"),
    debit: roundMoney(line.debit),
    credit: roundMoney(line.credit),
  }));
  normalized.forEach((line) => getAccount(state, line.accountId));
  validateJournalLines(normalized);
  const journal: JournalEntry = {
    id: createId("je"),
    documentId,
    number,
    entryDate,
    description,
    lines: normalized,
    postedAt: now(),
    reversalOfId,
  };
  return journal;
};

const withPostedDocument = <T extends AccountingDocument>(
  state: LocalAccountingState,
  document: T,
  journal: JournalEntry,
  movements: InventoryMovement[] = [],
): LocalAccountingState => ({
  ...state,
  documents: [...state.documents, document],
  journalEntries: [...state.journalEntries, journal],
  inventoryMovements: [...state.inventoryMovements, ...movements],
  lastSequence: state.lastSequence + 1,
  updatedAt: now(),
});

export const createInitialState = (): LocalAccountingState => {
  const createdAt = now();
  const records: Array<[string, string, Account["type"]]> = [
    ["1110", "الصندوق", "asset"],
    ["1120", "البنك والشبكة", "asset"],
    ["1210", "ذمم العملاء", "asset"],
    ["1310", "مخزون الوقود", "asset"],
    ["2110", "ذمم الموردين", "liability"],
    ["3110", "رأس المال ورصيد الافتتاح", "equity"],
    ["4110", "إيراد مبيعات الوقود", "revenue"],
    ["5110", "تكلفة الوقود المباع", "expense"],
    ["5120", "مصروفات تشغيلية غير مرسملة", "expense"],
    ["5130", "فروقات جرد الوقود — عجز", "expense"],
    ["4210", "فروقات جرد الوقود — زيادة", "revenue"],
  ];
  const accounts = records.map(([code, name, type]) => ({
    id: `system-${code}`,
    code,
    name,
    type,
    isSystem: true,
    isActive: true,
    createdAt,
  }));
  const accountMap: AccountMap = {
    cashAccountId: "system-1110",
    bankAccountId: "system-1120",
    receivablesAccountId: "system-1210",
    inventoryAccountId: "system-1310",
    payablesAccountId: "system-2110",
    openingEquityAccountId: "system-3110",
    salesRevenueAccountId: "system-4110",
    costOfSalesAccountId: "system-5110",
    inventoryVarianceExpenseAccountId: "system-5130",
    inventoryVarianceRevenueAccountId: "system-4210",
  };
  return {
    version: 1,
    accounts,
    accountMap,
    products: [],
    tanks: [],
    pumps: [],
    pumpReadings: [],
    contacts: [],
    documents: [],
    inventoryMovements: [],
    journalEntries: [],
    lastSequence: 0,
    updatedAt: createdAt,
  };
};

export const getInventoryBalance = (state: LocalAccountingState, productId: string, tankId: string): InventoryBalance => {
  const movements = state.inventoryMovements.filter((item) => item.productId === productId && item.tankId === tankId);
  const quantity = roundMoney(movements.reduce((sum, item) => sum + item.quantityIn - item.quantityOut, 0));
  const value = roundMoney(movements.reduce((sum, item) => sum + item.quantityIn * item.unitCost - item.quantityOut * item.unitCost, 0));
  return {
    productId,
    tankId,
    quantity,
    averageUnitCost: quantity > 0 ? roundMoney(value / quantity) : 0,
    value,
  };
};

export const getAllInventoryBalances = (state: LocalAccountingState) =>
  state.tanks.map((tank) => getInventoryBalance(state, tank.productId, tank.id));

export const getAccountBalances = (state: LocalAccountingState): AccountBalance[] =>
  state.accounts.map((account) => {
    const totals = state.journalEntries.reduce(
      (sum, entry) => {
        entry.lines.filter((line) => line.accountId === account.id).forEach((line) => {
          sum.debit = roundMoney(sum.debit + line.debit);
          sum.credit = roundMoney(sum.credit + line.credit);
        });
        return sum;
      },
      { debit: 0, credit: 0 },
    );
    const normalDebit = account.type === "asset" || account.type === "expense";
    return {
      accountId: account.id,
      ...totals,
      balance: roundMoney(normalDebit ? totals.debit - totals.credit : totals.credit - totals.debit),
    };
  });

const settlementAccountFor = (state: LocalAccountingState, paymentMethod: PaymentMethod, contact?: Contact) => {
  if (!state.accountMap) throw new Error("لم تُهيّأ خريطة الحسابات بعد.");
  if (paymentMethod === "cash") return state.accountMap.cashAccountId;
  if (paymentMethod === "bank") return state.accountMap.bankAccountId;
  return contact?.accountId || (contact?.type === "customer" ? state.accountMap.receivablesAccountId : state.accountMap.payablesAccountId);
};

export const postOpeningBalance = (
  state: LocalAccountingState,
  input: { issueDate: string; productId: string; tankId: string; quantity: number; unitCost: number },
): LocalAccountingState => {
  if (!state.accountMap) throw new Error("لم تُهيّأ خريطة الحسابات بعد.");
  getProduct(state, input.productId);
  getTank(state, input.tankId, input.productId);
  const quantity = positive(input.quantity, "الكمية الافتتاحية");
  const unitCost = positive(input.unitCost, "تكلفة الوحدة الافتتاحية");
  const tank = getTank(state, input.tankId, input.productId);
  if (quantity > tank.capacity) throw new Error("الكمية الافتتاحية لا يمكن أن تتجاوز سعة الخزان.");
  const existing = state.documents.some(
    (document) => document.kind === "opening-balance" && document.status === "posted" && document.productId === input.productId && document.tankId === input.tankId,
  );
  if (existing) throw new Error("يوجد مخزون افتتاحي مرحّل لهذا الصنف والخزان؛ استخدم تسوية أو عكساً موثقاً بدلاً من التكرار.");

  const documentId = createId("open");
  const number = formatDocumentNumber("OPEN", state.lastSequence + 1);
  const total = roundMoney(quantity * unitCost);
  const journal = appendJournal(state, documentId, number, input.issueDate, `إثبات مخزون افتتاحي للصنف والخزان المحددين`, [
    { accountId: state.accountMap.inventoryAccountId, debit: total, credit: 0, description: "مخزون افتتاحي" },
    { accountId: state.accountMap.openingEquityAccountId, debit: 0, credit: total, description: "مقابل رصيد افتتاحي" },
  ]);
  const document: OpeningBalanceDocument = {
    id: documentId,
    number,
    kind: "opening-balance",
    status: "posted",
    issueDate: input.issueDate,
    productId: input.productId,
    tankId: input.tankId,
    quantity,
    unitCost,
    total,
    journalEntryId: journal.id,
    createdAt: now(),
  };
  const movement: InventoryMovement = {
    id: createId("im"),
    kind: "opening",
    documentId,
    productId: input.productId,
    tankId: input.tankId,
    quantityIn: quantity,
    quantityOut: 0,
    unitCost,
    occurredAt: input.issueDate,
    note: `رصيد افتتاحي ${number}`,
  };
  return withPostedDocument(state, document, journal, [movement]);
};

export const postInventoryAdjustment = (
  state: LocalAccountingState,
  input: { issueDate: string; productId: string; tankId: string; actualQuantity: number; unitCost?: number; reason: string },
): LocalAccountingState => {
  if (!state.accountMap) throw new Error("لم تُهيّأ خريطة الحسابات بعد.");
  const product = getProduct(state, input.productId);
  const tank = getTank(state, input.tankId, product.id);
  const actualQuantity = Math.max(0, roundMoney(Number(input.actualQuantity)));
  if (!Number.isFinite(actualQuantity) || actualQuantity > tank.capacity + 0.0001) throw new Error("الكمية الفعلية يجب أن تكون صفراً أو رقماً لا يتجاوز سعة الخزان.");
  const bookBalance = getInventoryBalance(state, product.id, tank.id);
  const differenceQuantity = roundMoney(actualQuantity - bookBalance.quantity);
  if (Math.abs(differenceQuantity) < 0.0001) throw new Error("لا توجد فروقات بين الرصيد الدفتري والكمية الفعلية لإثبات تسوية.");
  const referenceCost = bookBalance.averageUnitCost || Number(input.unitCost);
  const unitCost = positive(referenceCost, "تكلفة تسوية الوحدة");
  const total = roundMoney(Math.abs(differenceQuantity) * unitCost);
  const documentId = createId("adjustment");
  const number = formatDocumentNumber("ADJ", state.lastSequence + 1);
  const reason = nonEmpty(input.reason, "سبب التسوية");
  const isIncrease = differenceQuantity > 0;
  const journal = appendJournal(state, documentId, number, input.issueDate, `تسوية مخزون ${tank.name}: ${reason}`, isIncrease
    ? [
        { accountId: state.accountMap.inventoryAccountId, debit: total, credit: 0, description: "زيادة مخزون مثبتة بالجرد الفعلي" },
        { accountId: state.accountMap.inventoryVarianceRevenueAccountId, debit: 0, credit: total, description: "فائض جرد الوقود" },
      ]
    : [
        { accountId: state.accountMap.inventoryVarianceExpenseAccountId, debit: total, credit: 0, description: "عجز جرد الوقود" },
        { accountId: state.accountMap.inventoryAccountId, debit: 0, credit: total, description: "تخفيض مخزون مثبت بالجرد الفعلي" },
      ]);
  const document: InventoryAdjustmentDocument = {
    id: documentId, number, kind: "inventory-adjustment", status: "posted", issueDate: input.issueDate,
    productId: product.id, tankId: tank.id, bookQuantity: bookBalance.quantity, actualQuantity, differenceQuantity, unitCost, total, reason,
    journalEntryId: journal.id, createdAt: now(),
  };
  const movement: InventoryMovement = {
    id: createId("im"), kind: "adjustment", documentId, productId: product.id, tankId: tank.id,
    quantityIn: isIncrease ? differenceQuantity : 0, quantityOut: isIncrease ? 0 : Math.abs(differenceQuantity), unitCost,
    occurredAt: input.issueDate, note: `تسوية ${number}: ${reason}`,
  };
  return withPostedDocument(state, document, journal, [movement]);
};

export const postSale = (
  state: LocalAccountingState,
  input: { issueDate: string; paymentMethod: PaymentMethod; contactId?: string; pumpId?: string; meterReading?: number; lines: Array<Omit<SaleLine, "id" | "unitCostAtPosting">> },
): LocalAccountingState => {
  if (!state.accountMap) throw new Error("لم تُهيّأ خريطة الحسابات بعد.");
  if (!input.lines.length) throw new Error("أضف صنفاً واحداً على الأقل إلى فاتورة البيع.");
  const contact = input.paymentMethod === "credit" ? getContact(state, input.contactId, "customer") : undefined;
  const settlementAccountId = settlementAccountFor(state, input.paymentMethod, contact);
  const settlementAccount = getAccount(state, settlementAccountId);
  if (input.paymentMethod === "credit" && settlementAccount.type !== "asset") {
    throw new Error("يجب أن يكون حساب العميل في البيع الآجل من نوع أصل أو ذمم مدينة.");
  }
  let pump: Pump | undefined;
  let meterReading: number | undefined;
  if (input.pumpId || input.meterReading !== undefined) {
    if (!input.pumpId) throw new Error("اختر المضخة عند إدخال قراءة عداد.");
    if (input.lines.length !== 1) throw new Error("يمكن ربط المضخة بسطر بيع واحد فقط؛ أنشئ فاتورة مستقلة لكل قراءة مضخة.");
    pump = getPump(state, input.pumpId);
    const pumpLine = input.lines[0];
    if (pump.tankId !== pumpLine.tankId) throw new Error("المضخة المختارة مرتبطة بخزان مختلف عن خزان سطر البيع.");
    meterReading = positive(Number(input.meterReading), "قراءة العداد الحالية");
    if (meterReading + 0.0001 < pump.lastMeterReading) throw new Error("قراءة العداد الحالية لا يمكن أن تكون أقل من آخر قراءة مسجلة للمضخة.");
    const meteredQuantity = roundMoney(meterReading - pump.lastMeterReading);
    if (Math.abs(meteredQuantity - Number(pumpLine.quantity)) > 0.009) throw new Error(`كمية البيع يجب أن تطابق فرق العداد (${meteredQuantity.toLocaleString("ar-SA")}).`);
  }
  const requestedByTank = new Map<string, number>();
  input.lines.forEach((line) => {
    const key = `${line.productId}:${line.tankId}`;
    requestedByTank.set(key, (requestedByTank.get(key) || 0) + Number(line.quantity || 0));
  });
  requestedByTank.forEach((requested, key) => {
    const [productId, tankId] = key.split(":");
    const product = getProduct(state, productId);
    const balance = getInventoryBalance(state, productId, tankId);
    if (requested <= 0 || balance.quantity + 0.0001 < requested) {
      throw new Error(`إجمالي الكمية المطلوبة من ${product.name} يتجاوز الرصيد المتاح في الخزان.`);
    }
  });
  const lines = input.lines.map((line) => {
    const product = getProduct(state, line.productId);
    getTank(state, line.tankId, product.id);
    const quantity = positive(line.quantity, "كمية البيع");
    const unitPrice = positive(line.unitPrice, "سعر البيع للوحدة");
    const balance = getInventoryBalance(state, line.productId, line.tankId);
    if (balance.averageUnitCost <= 0) throw new Error(`لا توجد تكلفة مثبتة للصنف ${product.name}. أدخل رصيداً افتتاحياً أو عملية شراء أولاً.`);
    return {
      id: createId("sl"),
      productId: product.id,
      tankId: line.tankId,
      quantity,
      unitPrice,
      unitCostAtPosting: balance.averageUnitCost,
    };
  });
  const total = roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  const totalCost = roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitCostAtPosting, 0));
  const documentId = createId("sale");
  const number = formatDocumentNumber("SAL", state.lastSequence + 1);
  const journal = appendJournal(state, documentId, number, input.issueDate, `فاتورة بيع وقود ${number}`, [
    { accountId: settlementAccountId, debit: total, credit: 0, description: "استحقاق قيمة البيع" },
    { accountId: state.accountMap.salesRevenueAccountId, debit: 0, credit: total, description: "إيراد بيع الوقود" },
    { accountId: state.accountMap.costOfSalesAccountId, debit: totalCost, credit: 0, description: "تكلفة الوقود المباع" },
    { accountId: state.accountMap.inventoryAccountId, debit: 0, credit: totalCost, description: "إخراج مخزون الوقود المباع" },
  ]);
  const document: SaleDocument = {
    id: documentId,
    number,
    kind: "sale",
    status: "posted",
    issueDate: input.issueDate,
    paymentMethod: input.paymentMethod,
    contactId: contact?.id,
    settlementAccountId,
    lines,
    total,
    totalCost,
    pumpId: pump?.id,
    meterReading,
    journalEntryId: journal.id,
    createdAt: now(),
  };
  const movements = lines.map<InventoryMovement>((line) => ({
    id: createId("im"),
    kind: "sale",
    documentId,
    productId: line.productId,
    tankId: line.tankId,
    quantityIn: 0,
    quantityOut: line.quantity,
    unitCost: line.unitCostAtPosting,
    occurredAt: input.issueDate,
    note: `بيع ${number}`,
  }));
  if (!pump || meterReading === undefined) return withPostedDocument(state, document, journal, movements);
  const pumpReading: PumpReading = {
    id: createId("reading"),
    pumpId: pump.id,
    documentId,
    previousMeterReading: pump.lastMeterReading,
    currentMeterReading: meterReading,
    quantity: roundMoney(meterReading - pump.lastMeterReading),
    issueDate: input.issueDate,
    createdAt: now(),
  };
  const saleWithReading: SaleDocument = { ...document, pumpReadingId: pumpReading.id };
  const posted = withPostedDocument(state, saleWithReading, journal, movements);
  return {
    ...posted,
    pumps: state.pumps.map((item) => item.id === pump!.id ? { ...item, lastMeterReading: meterReading! } : item),
    pumpReadings: [...state.pumpReadings, pumpReading],
  };
};

const validateExpense = (state: LocalAccountingState, expense: PurchaseExpense) => {
  positive(expense.amount, "قيمة المصروف");
  const funding = getAccount(state, expense.fundingAccountId);
  if (funding.type === "revenue" || funding.type === "expense") {
    throw new Error("يجب اختيار أصل أو التزام أو حق ملكية كمصدر لتمويل مصروف التوريد.");
  }
  if (!expense.capitalized) {
    if (!expense.expenseAccountId) throw new Error("المصروف غير المرسمل يتطلب حساب مصروف.");
    const expenseAccount = getAccount(state, expense.expenseAccountId);
    if (expenseAccount.type !== "expense") throw new Error("يجب أن يكون حساب المصروف غير المرسمل من نوع مصروف.");
  }
};

export const postPurchase = (
  state: LocalAccountingState,
  input: {
    issueDate: string;
    paymentMethod: PaymentMethod;
    contactId?: string;
    lines: Array<Omit<PurchaseLine, "id">>;
    expenses?: PurchaseExpense[];
  },
): LocalAccountingState => {
  if (!state.accountMap) throw new Error("لم تُهيّأ خريطة الحسابات بعد.");
  if (!input.lines.length) throw new Error("أضف صنف توريد واحداً على الأقل.");
  const contact = input.paymentMethod === "credit" ? getContact(state, input.contactId, "supplier") : undefined;
  const settlementAccountId = settlementAccountFor(state, input.paymentMethod, contact);
  const settlementAccount = getAccount(state, settlementAccountId);
  if (input.paymentMethod === "credit" && settlementAccount.type !== "liability") {
    throw new Error("يجب أن يكون حساب المورد في الشراء الآجل من نوع التزام أو ذمم دائنة.");
  }
  const receivedByTank = new Map<string, number>();
  input.lines.forEach((line) => {
    const key = `${line.productId}:${line.tankId}`;
    receivedByTank.set(key, (receivedByTank.get(key) || 0) + Number(line.quantity || 0));
  });
  receivedByTank.forEach((received, key) => {
    const [productId, tankId] = key.split(":");
    const tank = getTank(state, tankId, productId);
    const balance = getInventoryBalance(state, productId, tankId);
    if (received <= 0 || balance.quantity + received > tank.capacity + 0.0001) {
      throw new Error(`توريد الصنف للخزان ${tank.name} يتجاوز سعته المتاحة.`);
    }
  });
  const lines = input.lines.map((line) => {
    const product = getProduct(state, line.productId);
    getTank(state, line.tankId, product.id);
    return {
      id: createId("pl"),
      productId: product.id,
      tankId: line.tankId,
      quantity: positive(line.quantity, "كمية الشراء"),
      unitPrice: positive(line.unitPrice, "سعر الشراء للوحدة"),
    };
  });
  const expenses = input.expenses || [];
  expenses.forEach((expense) => validateExpense(state, expense));
  const fuelSubtotal = roundMoney(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  const totalExpenses = roundMoney(expenses.reduce((sum, expense) => sum + positive(expense.amount, "قيمة المصروف"), 0));
  const total = roundMoney(fuelSubtotal + totalExpenses);
  const capitalizedExpenses = expenses.filter((expense) => expense.capitalized);
  const capitalizedAmount = roundMoney(capitalizedExpenses.reduce((sum, expense) => sum + expense.amount, 0));
  const allocations = allocateAmount(capitalizedAmount, lines.map((line) => line.quantity));
  const documentId = createId("purchase");
  const number = formatDocumentNumber("PUR", state.lastSequence + 1);
  const journalLines: Omit<JournalLine, "id">[] = [
    {
      accountId: state.accountMap.inventoryAccountId,
      debit: roundMoney(fuelSubtotal + capitalizedAmount),
      credit: 0,
      description: "إثبات مخزون الوقود وتكلفة التوريد المرسملة",
    },
    { accountId: settlementAccountId, debit: 0, credit: fuelSubtotal, description: "استحقاق قيمة الوقود للمورد أو جهة السداد" },
  ];
  expenses.forEach((expense) => {
    if (expense.capitalized) {
      journalLines.push({ accountId: expense.fundingAccountId, debit: 0, credit: expense.amount, description: `تمويل مصروف توريد مرسمل: ${expense.description}` });
    } else {
      journalLines.push({ accountId: expense.expenseAccountId!, debit: expense.amount, credit: 0, description: `مصروف تشغيلي: ${expense.description}` });
      journalLines.push({ accountId: expense.fundingAccountId, debit: 0, credit: expense.amount, description: `تمويل مصروف تشغيلي: ${expense.description}` });
    }
  });
  const journal = appendJournal(state, documentId, number, input.issueDate, `فاتورة شراء وقود ${number}`, journalLines);
  const document: PurchaseDocument = {
    id: documentId,
    number,
    kind: "purchase",
    status: "posted",
    issueDate: input.issueDate,
    paymentMethod: input.paymentMethod,
    contactId: contact?.id,
    settlementAccountId,
    lines,
    expenses,
    fuelSubtotal,
    total,
    journalEntryId: journal.id,
    createdAt: now(),
  };
  const movements = lines.map<InventoryMovement>((line, index) => {
    const totalLineCost = roundMoney(line.quantity * line.unitPrice + allocations[index]);
    return {
      id: createId("im"),
      kind: "purchase",
      documentId,
      productId: line.productId,
      tankId: line.tankId,
      quantityIn: line.quantity,
      quantityOut: 0,
      unitCost: roundMoney(totalLineCost / line.quantity),
      occurredAt: input.issueDate,
      note: `توريد ${number}`,
    };
  });
  return withPostedDocument(state, document, journal, movements);
};

export const postManualJournal = (
  state: LocalAccountingState,
  input: { issueDate: string; description: string; lines: Array<Omit<JournalLine, "id">> },
): LocalAccountingState => {
  if (input.lines.some((line) => line.accountId === state.accountMap?.inventoryAccountId)) {
    throw new Error("لا يمكن للقيد اليدوي تعديل حساب مخزون الوقود؛ استخدم الرصيد الافتتاحي أو فاتورة شراء أو بيع أو تسوية مخزون موثقة.");
  }
  const documentId = createId("journal");
  const number = formatDocumentNumber("JV", state.lastSequence + 1);
  const description = nonEmpty(input.description, "وصف القيد");
  const journal = appendJournal(state, documentId, number, input.issueDate, description, input.lines);
  const document: ManualJournalDocument = {
    id: documentId,
    number,
    kind: "manual-journal",
    status: "posted",
    issueDate: input.issueDate,
    description,
    lines: journal.lines,
    journalEntryId: journal.id,
    createdAt: now(),
  };
  return withPostedDocument(state, document, journal);
};

export const reverseDocument = (
  state: LocalAccountingState,
  input: { documentId: string; issueDate: string; reason: string },
): LocalAccountingState => {
  const original = state.documents.find((document) => document.id === input.documentId);
  if (!original || original.status !== "posted") throw new Error("لا يمكن عكس مستند غير موجود أو غير مرحّل.");
  if (original.kind === "reversal") throw new Error("لا يمكن عكس سند عكس مرة أخرى؛ أنشئ قيداً تصحيحياً عند الحاجة.");
  if (original.reversalDocumentId) throw new Error("تم عكس هذا المستند مسبقاً.");
  const originalJournal = state.journalEntries.find((entry) => entry.id === original.journalEntryId);
  if (!originalJournal) throw new Error("تعذر إيجاد القيد المحاسبي للمستند المطلوب عكسه.");
  const originalMovements = state.inventoryMovements.filter((movement) => movement.documentId === original.id);
  const stockChanges = new Map<string, number>();
  originalMovements.forEach((movement) => {
    const key = `${movement.productId}:${movement.tankId}`;
    const inverseQuantity = movement.quantityOut - movement.quantityIn;
    stockChanges.set(key, (stockChanges.get(key) || 0) + inverseQuantity);
  });
  stockChanges.forEach((change, key) => {
    const [productId, tankId] = key.split(":");
    const tank = getTank(state, tankId, productId);
    const balance = getInventoryBalance(state, productId, tankId);
    const next = balance.quantity + change;
    if (next < -0.0001) throw new Error(`لا يمكن عكس المستند لأن المخزون المتبقي في ${tank.name} لا يكفي.`);
    if (next > tank.capacity + 0.0001) throw new Error(`لا يمكن عكس المستند لأن الكمية الناتجة ستتجاوز سعة ${tank.name}.`);
  });
  const documentId = createId("reversal");
  const number = formatDocumentNumber("REV", state.lastSequence + 1);
  const description = `عكس ${original.number}: ${nonEmpty(input.reason, "سبب العكس")}`;
  const journal = appendJournal(
    state,
    documentId,
    number,
    input.issueDate,
    description,
    originalJournal.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
      description: `عكس: ${line.description || original.number}`,
    })),
    originalJournal.id,
  );
  const document: ReversalDocument = {
    id: documentId,
    number,
    kind: "reversal",
    status: "posted",
    issueDate: input.issueDate,
    description,
    originalDocumentId: original.id,
    journalEntryId: journal.id,
    createdAt: now(),
  };
  const movements = originalMovements.map<InventoryMovement>((movement) => ({
    id: createId("im"),
    kind: "reversal",
    documentId,
    productId: movement.productId,
    tankId: movement.tankId,
    quantityIn: movement.quantityOut,
    quantityOut: movement.quantityIn,
    unitCost: movement.unitCost,
    occurredAt: input.issueDate,
    note: `عكس ${original.number}`,
  }));
  const updatedOriginal = { ...original, status: "reversed" as const, reversalDocumentId: documentId } as AccountingDocument;
  return {
    ...withPostedDocument(state, document, journal, movements),
    documents: state.documents.map((item) => (item.id === original.id ? updatedOriginal : item)).concat(document),
  };
};

export const createProduct = (state: LocalAccountingState, input: Omit<Product, "id" | "createdAt" | "isActive">): LocalAccountingState => {
  const name = nonEmpty(input.name, "اسم الصنف");
  const sku = nonEmpty(input.sku, "رمز الصنف");
  if (state.products.some((item) => item.sku.toLowerCase() === sku.toLowerCase())) throw new Error("رمز الصنف مستخدم بالفعل.");
  const product: Product = { id: createId("product"), name, sku, salesPrice: positive(input.salesPrice, "سعر البيع"), minimumQuantity: Math.max(0, Number(input.minimumQuantity) || 0), isActive: true, createdAt: now() };
  return { ...state, products: [...state.products, product], updatedAt: now() };
};

export const createTank = (state: LocalAccountingState, input: Omit<Tank, "id" | "createdAt" | "isActive">): LocalAccountingState => {
  const product = getProduct(state, input.productId);
  const capacity = positive(input.capacity, "سعة الخزان");
  const minimumQuantity = Math.max(0, Number(input.minimumQuantity) || 0);
  if (minimumQuantity > capacity) throw new Error("الحد الأدنى للمخزون لا يمكن أن يتجاوز سعة الخزان.");
  const name = nonEmpty(input.name, "اسم الخزان");
  if (state.tanks.some((item) => item.name.toLowerCase() === name.toLowerCase())) throw new Error("اسم الخزان مستخدم بالفعل.");
  const tank: Tank = { id: createId("tank"), name, productId: product.id, capacity, minimumQuantity, isActive: true, createdAt: now() };
  return { ...state, tanks: [...state.tanks, tank], updatedAt: now() };
};

export const createPump = (state: LocalAccountingState, input: Omit<Pump, "id" | "createdAt" | "isActive" | "lastMeterReading">): LocalAccountingState => {
  const code = nonEmpty(input.code, "رمز المضخة");
  const name = nonEmpty(input.name, "اسم المضخة");
  const tank = getTank(state, input.tankId);
  const initialMeterReading = Math.max(0, roundMoney(Number(input.initialMeterReading) || 0));
  if (state.pumps.some((item) => item.code.toLowerCase() === code.toLowerCase())) throw new Error("رمز المضخة مستخدم بالفعل.");
  if (state.pumps.some((item) => item.name.toLowerCase() === name.toLowerCase())) throw new Error("اسم المضخة مستخدم بالفعل.");
  const pump: Pump = { id: createId("pump"), code, name, tankId: tank.id, initialMeterReading, lastMeterReading: initialMeterReading, isActive: true, createdAt: now() };
  return { ...state, pumps: [...state.pumps, pump], updatedAt: now() };
};

export const createContact = (state: LocalAccountingState, input: Omit<Contact, "id" | "createdAt" | "isActive">): LocalAccountingState => {
  const name = nonEmpty(input.name, "اسم جهة التعامل");
  if (state.contacts.some((item) => item.type === input.type && item.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("جهة التعامل موجودة بالفعل.");
  }
  if (input.accountId) getAccount(state, input.accountId);
  const contact: Contact = { id: createId("contact"), name, type: input.type, phone: input.phone?.trim(), accountId: input.accountId, isActive: true, createdAt: now() };
  return { ...state, contacts: [...state.contacts, contact], updatedAt: now() };
};

export const createAccount = (state: LocalAccountingState, input: Omit<Account, "id" | "createdAt" | "isSystem" | "isActive">): LocalAccountingState => {
  const code = nonEmpty(input.code, "رمز الحساب");
  const name = nonEmpty(input.name, "اسم الحساب");
  if (state.accounts.some((item) => item.code === code)) throw new Error("رمز الحساب مستخدم بالفعل.");
  if (input.parentId) getAccount(state, input.parentId);
  const account: Account = { id: createId("account"), code, name, type: input.type, parentId: input.parentId, isSystem: false, isActive: true, createdAt: now() };
  return { ...state, accounts: [...state.accounts, account], updatedAt: now() };
};

export const updateProfile = (state: LocalAccountingState, input: LocalAccountingState["profile"]): LocalAccountingState => {
  if (!input) throw new Error("بيانات المحطة مطلوبة.");
  return { ...state, profile: { ...input, name: nonEmpty(input.name, "اسم المحطة"), currencyCode: nonEmpty(input.currencyCode, "رمز العملة"), currencySymbol: nonEmpty(input.currencySymbol, "رمز العملة"), openingDate: nonEmpty(input.openingDate, "تاريخ البدء") }, updatedAt: now() };
};


export const postReceipt = (
  state: LocalAccountingState,
  input: { issueDate: string; amount: number; settlementAccountId: string; accountId?: string; contactId?: string; description: string },
): LocalAccountingState => {
  const amount = positive(input.amount, "مبلغ سند القبض");
  const settlementAccount = getAccount(state, input.settlementAccountId);
  const contact = input.contactId ? state.contacts.find((item) => item.id === input.contactId && item.isActive && item.type === "customer") : undefined;
  if (input.contactId && !contact) throw new Error("العميل المحدد غير موجود أو غير نشط.");
  const accountId = input.accountId || contact?.accountId || state.accountMap?.receivablesAccountId;
  if (!accountId) throw new Error("اختر الحساب أو جهة التعامل لسند القبض.");
  getAccount(state, accountId);
  const description = nonEmpty(input.description, "بيان سند القبض");
  const documentId = createId("receipt");
  const number = formatDocumentNumber("REC", state.lastSequence + 1);
  const journal = appendJournal(state, documentId, number, input.issueDate, description, [
    { accountId: settlementAccount.id, debit: amount, credit: 0, description: "استلام نقدية أو تحصيل بنكي" },
    { accountId, debit: 0, credit: amount, description: contact ? `تحصيل من ${contact.name}` : "إثبات قبض على الحساب" },
  ]);
  const document: ReceiptDocument = {
    id: documentId, number, kind: "receipt", status: "posted", issueDate: input.issueDate,
    contactId: contact?.id, accountId, settlementAccountId: settlementAccount.id, amount, description,
    journalEntryId: journal.id, createdAt: now(),
  };
  return withPostedDocument(state, document, journal);
};

export const postPayment = (
  state: LocalAccountingState,
  input: { issueDate: string; amount: number; settlementAccountId: string; accountId?: string; contactId?: string; description: string },
): LocalAccountingState => {
  const amount = positive(input.amount, "مبلغ سند الصرف");
  const settlementAccount = getAccount(state, input.settlementAccountId);
  const contact = input.contactId ? state.contacts.find((item) => item.id === input.contactId && item.isActive && item.type === "supplier") : undefined;
  if (input.contactId && !contact) throw new Error("المورد المحدد غير موجود أو غير نشط.");
  const accountId = input.accountId || contact?.accountId || state.accountMap?.payablesAccountId;
  if (!accountId) throw new Error("اختر الحساب أو جهة التعامل لسند الصرف.");
  getAccount(state, accountId);
  const description = nonEmpty(input.description, "بيان سند الصرف");
  const documentId = createId("payment");
  const number = formatDocumentNumber("PAY", state.lastSequence + 1);
  const journal = appendJournal(state, documentId, number, input.issueDate, description, [
    { accountId, debit: amount, credit: 0, description: contact ? `سداد إلى ${contact.name}` : "إثبات صرف على الحساب" },
    { accountId: settlementAccount.id, debit: 0, credit: amount, description: "صرف نقدية أو تحويل بنكي" },
  ]);
  const document: PaymentDocument = {
    id: documentId, number, kind: "payment", status: "posted", issueDate: input.issueDate,
    contactId: contact?.id, accountId, settlementAccountId: settlementAccount.id, amount, description,
    journalEntryId: journal.id, createdAt: now(),
  };
  return withPostedDocument(state, document, journal);
};
