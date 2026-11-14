export interface SavedAccount {
  uid: string;
  email: string;
  displayName: string;
}

const SAVED_ACCOUNTS_KEY = 'savedAccounts';
const ACTIVE_ACCOUNT_KEY = 'activeAccountEmail';

const isSavedAccount = (value: unknown): value is SavedAccount =>
  typeof value === 'object' && value !== null &&
  typeof (value as SavedAccount).uid === 'string' &&
  typeof (value as SavedAccount).email === 'string' &&
  typeof (value as SavedAccount).displayName === 'string';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const resolveDisplayName = (displayName: string | null | undefined, email: string | null | undefined): string | null => {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  const prefix = email?.split('@')[0];
  return prefix || null;
};

export const readSavedAccounts = (): SavedAccount[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_ACCOUNTS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isSavedAccount) : [];
  } catch {
    return [];
  }
};

export const upsertSavedAccount = (account: SavedAccount) => {
  const accounts = readSavedAccounts();
  const exists = accounts.some(a => a.email === account.email);
  const next = exists
    ? accounts.map(a => (a.email === account.email ? account : a))
    : [...accounts, account];
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next));
};

export const removeSavedAccount = (email: string) => {
  const next = readSavedAccounts().filter(a => a.email !== email);
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next));
};

export const getActiveAccountEmail = (): string | null => localStorage.getItem(ACTIVE_ACCOUNT_KEY);

export const setActiveAccountEmail = (email: string | null) => {
  if (email) localStorage.setItem(ACTIVE_ACCOUNT_KEY, email);
  else localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
};
