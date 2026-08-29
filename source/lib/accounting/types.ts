export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type ContactType = "customer" | "supplier";
export type PaymentMethod = "cash" | "bank" | "credit";
export type DocumentKind = "opening-balance" | "sale" | "purchase" | "receipt" | "payment" | "inventory-adjustment" | "manual-journal" | "reversal";
export type DocumentStatus = "draft" | "posted" | "reversed";
export type InventoryMovementKind = "opening" | "purchase" | "sale" | "adjustment" | "reversal";

export interface StationProfile {
  name: string;
  currencyCode: string;
  currencySymbol: string;
  openingDate: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface AccountMap {
  cashAccountId: string;
  bankAccountId: string;
  receivablesAccountId: string;
  inventoryAccountId: string;
  payablesAccountId: string;
  openingEquityAccountId: string;
  salesRevenueAccountId: string;
  costOfSalesAccountId: string;
  inventoryVarianceExpenseAccountId: string;
  inventoryVarianceRevenueAccountId: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  salesPrice: number;
  minimumQuantity: number;
  isActive: boolean;
  createdAt: string;
}

export interface Tank {
  id: string;
  name: string;
  productId: string;
  capacity: number;
  minimumQuantity: number;
  isActive: boolean;
  createdAt: string;
}

export interface Pump {
  id: string;
  code: string;
  name: string;
  tankId: string;
  initialMeterReading: number;
  lastMeterReading: number;
  isActive: boolean;
  createdAt: string;
}

export interface PumpReading {
  id: string;
  pumpId: string;
  documentId: string;
  previousMeterReading: number;
  currentMeterReading: number;
  quantity: number;
  issueDate: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  phone?: string;
  accountId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  kind: InventoryMovementKind;
  documentId: string;
  productId: string;
  tankId: string;
  quantityIn: number;
  quantityOut: number;
  unitCost: number;
  occurredAt: string;
  note?: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  documentId: string;
  number: string;
  entryDate: string;
  description: string;
  lines: JournalLine[];
  postedAt: string;
  reversalOfId?: string;
}

export interface SaleLine {
  id: string;
  productId: string;
  tankId: string;
  quantity: number;
  unitPrice: number;
  unitCostAtPosting: number;
}

export interface SaleDocument {
  id: string;
  number: string;
  kind: "sale";
  status: DocumentStatus;
  issueDate: string;
  paymentMethod: PaymentMethod;
  contactId?: string;
  settlementAccountId: string;
  lines: SaleLine[];
  total: number;
  totalCost: number;
  pumpId?: string;
  pumpReadingId?: string;
  meterReading?: number;
  journalEntryId?: string;
  reversalDocumentId?: string;
  createdAt: string;
}

export interface PurchaseLine {
  id: string;
  productId: string;
  tankId: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseExpense {
  id: string;
  description: string;
  amount: number;
  fundingAccountId: string;
  capitalized: boolean;
  expenseAccountId?: string;
}

export interface PurchaseDocument {
  id: string;
  number: string;
  kind: "purchase";
  status: DocumentStatus;
  issueDate: string;
  paymentMethod: PaymentMethod;
  contactId?: string;
  settlementAccountId: string;
  lines: PurchaseLine[];
  expenses: PurchaseExpense[];
  fuelSubtotal: number;
  total: number;
  meterReading?: undefined;
  journalEntryId?: string;
  reversalDocumentId?: string;
  createdAt: string;
}

export interface OpeningBalanceDocument {
  id: string;
  number: string;
  kind: "opening-balance";
  status: DocumentStatus;
  issueDate: string;
  productId: string;
  tankId: string;
  quantity: number;
  unitCost: number;
  total: number;
  journalEntryId?: string;
  reversalDocumentId?: string;
  createdAt: string;
}

export interface InventoryAdjustmentDocument {
  id: string;
  number: string;
  kind: "inventory-adjustment";
  status: DocumentStatus;
  issueDate: string;
  productId: string;
  tankId: string;
  bookQuantity: number;
  actualQuantity: number;
  differenceQuantity: number;
  unitCost: number;
  total: number;
  reason: string;
  journalEntryId?: string;
  reversalDocumentId?: string;
  createdAt: string;
}

export interface ReceiptDocument {
  id: string;
  number: string;
  kind: "receipt";
  status: DocumentStatus;
  issueDate: string;
  contactId?: string;
  accountId: string;
  settlementAccountId: string;
  amount: number;
  description: string;
  journalEntryId?: string;
  reversalDocumentId?: string;
  createdAt: string;
}

export interface PaymentDocument {
  id: string;
  number: string;
  kind: "payment";
  status: DocumentStatus;
  issueDate: string;
  contactId?: string;
  accountId: string;
  settlementAccountId: string;
  amount: number;
  description: string;
  journalEntryId?: string;
  reversalDocumentId?: string;
  createdAt: string;
}

export interface ManualJournalDocument {
  id: string;
  number: string;
  kind: "manual-journal";
  status: DocumentStatus;
  issueDate: string;
  description: string;
  lines: JournalLine[];
  journalEntryId?: string;
  reversalDocumentId?: string;
  createdAt: string;
}

export interface ReversalDocument {
  id: string;
  number: string;
  kind: "reversal";
  status: "posted";
  issueDate: string;
  description: string;
  originalDocumentId: string;
  journalEntryId: string;
  createdAt: string;
}

export type AccountingDocument =
  | SaleDocument
  | PurchaseDocument
  | ReceiptDocument
  | PaymentDocument
  | OpeningBalanceDocument
  | InventoryAdjustmentDocument
  | ManualJournalDocument
  | ReversalDocument;

export interface LocalAccountingState {
  version: 1;
  profile?: StationProfile;
  accountMap?: AccountMap;
  accounts: Account[];
  products: Product[];
  tanks: Tank[];
  pumps: Pump[];
  pumpReadings: PumpReading[];
  contacts: Contact[];
  documents: AccountingDocument[];
  inventoryMovements: InventoryMovement[];
  journalEntries: JournalEntry[];
  lastSequence: number;
  updatedAt: string;
}

export interface InventoryBalance {
  productId: string;
  tankId: string;
  quantity: number;
  averageUnitCost: number;
  value: number;
}

export interface AccountBalance {
  accountId: string;
  debit: number;
  credit: number;
  balance: number;
}
