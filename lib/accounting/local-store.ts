import AsyncStorage from "@react-native-async-storage/async-storage";

import { createInitialState } from "./engine";
import type { LocalAccountingState } from "./types";

const STORAGE_KEY = "fuel-ledger.local-accounting.v1";

const isValidState = (value: unknown): value is LocalAccountingState => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LocalAccountingState>;
  return candidate.version === 1 && Array.isArray(candidate.accounts) && Array.isArray(candidate.products) && Array.isArray(candidate.tanks) && Array.isArray(candidate.contacts) && Array.isArray(candidate.documents) && Array.isArray(candidate.inventoryMovements) && Array.isArray(candidate.journalEntries);
};

const normalizeState = (state: LocalAccountingState): LocalAccountingState => {
  const defaults = createInitialState();
  const defaultMap = defaults.accountMap!;
  const accounts = [...state.accounts];
  defaults.accounts.forEach((account) => {
    if (!accounts.some((item) => item.id === account.id || item.code === account.code)) accounts.push(account);
  });
  return {
    ...state,
    accounts,
    accountMap: { ...defaultMap, ...(state.accountMap || {}) },
    pumps: Array.isArray(state.pumps) ? state.pumps : [],
    pumpReadings: Array.isArray(state.pumpReadings) ? state.pumpReadings : [],
  };
};

export async function loadLocalState(): Promise<LocalAccountingState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialState();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isValidState(parsed)) return normalizeState(parsed);
  } catch {
    // Keep the stored data untouched. The caller receives a clean state only when it cannot be decoded.
  }
  throw new Error("تعذر قراءة قاعدة البيانات المحلية. استخدم شاشة الاستعادة لاسترجاع نسخة احتياطية.");
}

export async function saveLocalState(state: LocalAccountingState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function exportLocalState(): Promise<string> {
  const state = await loadLocalState();
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: "fuel-ledger", state }, null, 2);
}

export async function importLocalState(serialized: string): Promise<LocalAccountingState> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("ملف النسخة الاحتياطية ليس JSON صالحاً.");
  }
  const candidate = (parsed as { state?: unknown }).state ?? parsed;
  if (!isValidState(candidate)) throw new Error("ملف النسخة الاحتياطية لا يتوافق مع بنية التطبيق المحلية.");
  const normalized = normalizeState(candidate);
  await saveLocalState(normalized);
  return normalized;
}
