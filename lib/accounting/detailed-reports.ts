import type { AccountingDocument, Account, AccountBalance, Contact, InventoryMovement, LocalAccountingState } from "./types";
import { getAccountBalances, roundMoney } from "./engine";

export interface StatementRow {
  id: string;
  date: string;
  number: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  documentId: string;
}

export interface InventoryMovementRow {
  id: string;
  date: string;
  number: string;
  productName: string;
  tankName: string;
  kind: InventoryMovement["kind"];
  quantityIn: number;
  quantityOut: number;
  balanceQuantity: number;
  unitCost: number;
  value: number;
  note?: string;
  documentId: string;
}

const documentMap = (state: LocalAccountingState) => new Map(state.documents.map((item) => [item.id, item]));
const journalMap = (state: LocalAccountingState) => new Map(state.journalEntries.map((item) => [item.documentId, item]));
const accountMap = (state: LocalAccountingState) => new Map(state.accounts.map((item) => [item.id, item]));

export const getDocumentNumber = (state: LocalAccountingState, documentId: string) => documentMap(state).get(documentId)?.number || journalMap(state).get(documentId)?.number || "—";

export const buildAccountStatement = (state: LocalAccountingState, accountId: string): StatementRow[] => {
  const rows: StatementRow[] = [];
  let balance = 0;
  const account = accountMap(state).get(accountId);
  const normalDebit = account?.type === "asset" || account?.type === "expense";
  [...state.journalEntries].sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.postedAt.localeCompare(b.postedAt)).forEach((entry) => {
    entry.lines.filter((line) => line.accountId === accountId).forEach((line) => {
      balance = roundMoney(balance + (normalDebit ? line.debit - line.credit : line.credit - line.debit));
      rows.push({ id: line.id, date: entry.entryDate, number: entry.number, description: line.description || entry.description, debit: line.debit, credit: line.credit, balance, documentId: entry.documentId });
    });
  });
  return rows;
};

export const buildContactStatement = (state: LocalAccountingState, contact: Contact): StatementRow[] => {
  const accountId = contact.accountId || (contact.type === "customer" ? state.accountMap?.receivablesAccountId : state.accountMap?.payablesAccountId);
  return accountId ? buildAccountStatement(state, accountId).filter((row) => {
    const document = documentMap(state).get(row.documentId);
    return document && (document as AccountingDocument & { contactId?: string }).contactId === contact.id;
  }) : [];
};

export const buildInventoryMovementReport = (state: LocalAccountingState, productId?: string, tankId?: string): InventoryMovementRow[] => {
  const products = new Map(state.products.map((item) => [item.id, item]));
  const tanks = new Map(state.tanks.map((item) => [item.id, item]));
  const documents = documentMap(state);
  const balances = new Map<string, number>();
  return [...state.inventoryMovements]
    .filter((movement) => (!productId || movement.productId === productId) && (!tankId || movement.tankId === tankId))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id))
    .map((movement) => {
      const key = `${movement.productId}:${movement.tankId}`;
      const quantity = roundMoney((balances.get(key) || 0) + movement.quantityIn - movement.quantityOut);
      balances.set(key, quantity);
      const document = documents.get(movement.documentId);
      return {
        id: movement.id, date: movement.occurredAt, number: document?.number || "—", productName: products.get(movement.productId)?.name || "صنف محذوف", tankName: tanks.get(movement.tankId)?.name || "خزان محذوف", kind: movement.kind, quantityIn: movement.quantityIn, quantityOut: movement.quantityOut, balanceQuantity: quantity, unitCost: movement.unitCost, value: roundMoney((movement.quantityIn - movement.quantityOut) * movement.unitCost), note: movement.note, documentId: movement.documentId,
      };
    });
};

export const getAccountRecord = (state: LocalAccountingState, accountId: string): Account | undefined => accountMap(state).get(accountId);
export const getContactRecord = (state: LocalAccountingState, contactId: string): Contact | undefined => state.contacts.find((item) => item.id === contactId);
export const getAccountSummary = (state: LocalAccountingState): AccountBalance[] => getAccountBalances(state);
