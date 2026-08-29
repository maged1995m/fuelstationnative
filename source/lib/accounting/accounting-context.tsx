import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";

import {
  createAccount,
  createContact,
  createInitialState,
  createProduct,
  createPump,
  createTank,
  getAccountBalances,
  getAllInventoryBalances,
  postManualJournal,
  postPayment,
  postReceipt,
  postInventoryAdjustment,
  postOpeningBalance,
  postPurchase,
  postSale,
  reverseDocument,
  updateProfile,
} from "./engine";
import { importLocalState, loadLocalState, saveLocalState, exportLocalState } from "./local-store";
import { saveLocalTextFile } from "@/lib/exports/local-files";
import type { Account, Contact, InventoryBalance, JournalLine, LocalAccountingState, Product, Pump, PurchaseExpense, PurchaseLine, SaleLine, StationProfile, Tank } from "./types";

interface AccountingContextValue {
  state: LocalAccountingState;
  isReady: boolean;
  error?: string;
  inventory: InventoryBalance[];
  accountBalances: ReturnType<typeof getAccountBalances>;
  saveProfile: (profile: StationProfile) => Promise<void>;
  addReceipt: (input: { issueDate: string; amount: number; settlementAccountId: string; accountId?: string; contactId?: string; description: string }) => Promise<void>;
  addPayment: (input: { issueDate: string; amount: number; settlementAccountId: string; accountId?: string; contactId?: string; description: string }) => Promise<void>;
  addAccount: (input: Omit<Account, "id" | "createdAt" | "isSystem" | "isActive">) => Promise<void>;
  addProduct: (input: Omit<Product, "id" | "createdAt" | "isActive">) => Promise<void>;
  addTank: (input: Omit<Tank, "id" | "createdAt" | "isActive">) => Promise<void>;
  addPump: (input: Omit<Pump, "id" | "createdAt" | "isActive" | "lastMeterReading">) => Promise<void>;
  addContact: (input: Omit<Contact, "id" | "createdAt" | "isActive">) => Promise<void>;
  addOpeningBalance: (input: { issueDate: string; productId: string; tankId: string; quantity: number; unitCost: number }) => Promise<void>;
  addInventoryAdjustment: (input: { issueDate: string; productId: string; tankId: string; actualQuantity: number; unitCost?: number; reason: string }) => Promise<void>;
  addSale: (input: { issueDate: string; paymentMethod: "cash" | "bank" | "credit"; contactId?: string; pumpId?: string; meterReading?: number; lines: Array<Omit<SaleLine, "id" | "unitCostAtPosting">> }) => Promise<void>;
  addPurchase: (input: { issueDate: string; paymentMethod: "cash" | "bank" | "credit"; contactId?: string; lines: Array<Omit<PurchaseLine, "id">>; expenses?: PurchaseExpense[] }) => Promise<void>;
  addManualJournal: (input: { issueDate: string; description: string; lines: Array<Omit<JournalLine, "id">> }) => Promise<void>;
  reverseDocument: (input: { documentId: string; issueDate: string; reason: string }) => Promise<void>;
  restoreBackup: (serialized: string) => Promise<void>;
}

const AccountingContext = createContext<AccountingContextValue | undefined>(undefined);

export function AccountingProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<LocalAccountingState>(() => createInitialState());
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadLocalState()
      .then(setState)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "تعذر تحميل البيانات المحلية."))
      .finally(() => setIsReady(true));
  }, []);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (Platform.OS === "web" || !isReady) return;
    if (!hydratedRef.current) { hydratedRef.current = true; return; }
    const filename = `fuel-ledger-auto-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    exportLocalState()
      .then((serialized) => saveLocalTextFile(filename, serialized))
      .catch((reason) => console.warn("[backup] automatic backup failed", reason));
  }, [isReady, state.updatedAt]);

  const commit = useCallback(async (change: (current: LocalAccountingState) => LocalAccountingState) => {
    const next = change(state);
    await saveLocalState(next);
    setState(next);
  }, [state]);

  const value = useMemo<AccountingContextValue>(() => ({
    state,
    isReady,
    error,
    inventory: getAllInventoryBalances(state),
    accountBalances: getAccountBalances(state),
    saveProfile: (profile) => commit((current) => updateProfile(current, profile)),
    addReceipt: (input) => commit((current) => postReceipt(current, input)),
    addPayment: (input) => commit((current) => postPayment(current, input)),
    addAccount: (input) => commit((current) => createAccount(current, input)),
    addProduct: (input) => commit((current) => createProduct(current, input)),
    addTank: (input) => commit((current) => createTank(current, input)),
    addPump: (input) => commit((current) => createPump(current, input)),
    addContact: (input) => commit((current) => createContact(current, input)),
    addOpeningBalance: (input) => commit((current) => postOpeningBalance(current, input)),
    addInventoryAdjustment: (input) => commit((current) => postInventoryAdjustment(current, input)),
    addSale: (input) => commit((current) => postSale(current, input)),
    addPurchase: (input) => commit((current) => postPurchase(current, input)),
    addManualJournal: (input) => commit((current) => postManualJournal(current, input)),
    reverseDocument: (input) => commit((current) => reverseDocument(current, input)),
    restoreBackup: async (serialized) => {
      const restored = await importLocalState(serialized);
      setState(restored);
      setError(undefined);
    },
  }), [commit, error, isReady, state]);

  return <AccountingContext.Provider value={value}>{children}</AccountingContext.Provider>;
}

export function useAccounting() {
  const context = useContext(AccountingContext);
  if (!context) throw new Error("useAccounting يجب استخدامه داخل AccountingProvider.");
  return context;
}
