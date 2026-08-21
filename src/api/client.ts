import {
  Transaction,
  Budget,
  BillGroup,
  BillExpense,
  Account,
  Goal,
  Subscription,
} from '../store';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  currency: string;
  role?: string;
  color?: string;
  pin?: string;
  createdAt?: string;
  authProvider?: 'google' | 'local';
  googleId?: string;
}

export interface UserDataPayload {
  transactions: Transaction[];
  budgets: Budget[];
  billGroups: BillGroup[];
  accounts: Account[];
  goals: Goal[];
  subscriptions: Subscription[];
}

export interface SharedSettlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: string;
  method?: string;
  notes?: string;
  recordedAt?: string;
}

export interface SharedBillGroup {
  id: string;
  name: string;
  members: string[];
  expenses: BillExpense[];
  settlements?: SharedSettlement[];
  ownerId?: string;
  ownerName?: string;
  currency?: string;
  createdAt?: string;
  lastModified?: string;
  version?: number;
}

export const apiClient = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) });
      const data = await res.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  },

  async googleAuth(payload: {
    googleId: string;
    name: string;
    email: string;
    avatar: string;
    currency?: string;
  }): Promise<UserProfile | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data.success ? data.user : null;
    } catch (e) {
      console.error('Google auth error on backend:', e);
      return null;
    }
  },

  async getUsers(): Promise<UserProfile[]> {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      return data.success ? data.users : [];
    } catch (e) {
      console.warn('Backend unavailable, using offline fallback for users:', e);
      return [];
    }
  },

  async createUser(payload: {
    name: string;
    email?: string;
    avatar?: string;
    currency?: string;
    initialBalance?: number;
    role?: string;
    color?: string;
    pin?: string;
  }): Promise<UserProfile | null> {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data.success ? data.user : null;
    } catch (e) {
      console.error('Failed to create user on backend:', e);
      return null;
    }
  },

  async updateUser(
    userId: string,
    payload: Partial<Omit<UserProfile, 'id'>>
  ): Promise<UserProfile | null> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data.success ? data.user : null;
    } catch (e) {
      console.error('Failed to update user on backend:', e);
      return null;
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      return data.success === true;
    } catch (e) {
      console.error('Failed to delete user on backend:', e);
      return false;
    }
  },

  async resetUserData(userId: string): Promise<UserDataPayload | null> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/reset`, {
        method: 'POST',
      });
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (e) {
      console.error('Failed to reset user data on backend:', e);
      return null;
    }
  },

  async fetchUserData(userId: string): Promise<UserDataPayload | null> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/data`);
      const data = await res.json();
      return data.success && data.data ? data.data : null;
    } catch (e) {
      console.warn(`Failed to fetch data for user ${userId}:`, e);
      return null;
    }
  },

  async syncUserData(userId: string, data: UserDataPayload): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      return result.success === true;
    } catch (e) {
      console.warn(`Failed to sync data for user ${userId} to backend:`, e);
      return false;
    }
  },

  async fetchExchangeRates(): Promise<Record<string, number> | null> {
    try {
      const res = await fetch(`${API_BASE}/rates`, { signal: AbortSignal.timeout(3000) });
      const json = await res.json();
      if (json.success && json.data && json.data.rates) {
        return json.data.rates;
      }
    } catch {
      // Try direct free public API if backend is down
      try {
        const directRes = await fetch('https://open.er-api.com/v6/latest/USD', {
          signal: AbortSignal.timeout(3000),
        });
        const directJson = await directRes.json();
        if (directJson && directJson.rates) {
          return {
            USD: 1.0,
            EUR: Number(directJson.rates.EUR) || 0.864,
            GBP: Number(directJson.rates.GBP) || 0.739,
            INR: Number(directJson.rates.INR) || 95.77,
            JPY: Number(directJson.rates.JPY) || 159.59,
            CAD: Number(directJson.rates.CAD) || 1.389,
            AUD: Number(directJson.rates.AUD) || 1.410,
          };
        }
      } catch (e) {
        console.warn('Using offline exchange rates fallback:', e);
      }
    }
    return null;
  },

  // ----------------------------------------------------
  // Real-Time Shared Bill Portal Endpoints
  // ----------------------------------------------------

  async getSharedGroup(groupId: string): Promise<SharedBillGroup | null> {
    try {
      const res = await fetch(`${API_BASE}/shared-bills/${groupId}`, { signal: AbortSignal.timeout(4000) });
      const json = await res.json();
      return json.success && json.group ? json.group : null;
    } catch (e) {
      console.warn(`Failed to fetch shared group ${groupId}:`, e);
      return null;
    }
  },

  async checkSharedGroupLive(
    groupId: string
  ): Promise<{ id: string; version: number; lastModified: string; expenseCount: number } | null> {
    try {
      const res = await fetch(`${API_BASE}/shared-bills/${groupId}/live`, { signal: AbortSignal.timeout(3000) });
      const json = await res.json();
      return json.success ? json : null;
    } catch {
      return null;
    }
  },

  async addSharedExpense(
    groupId: string,
    expense: Omit<BillExpense, 'id'>
  ): Promise<{ group: SharedBillGroup; expense: BillExpense } | null> {
    try {
      const res = await fetch(`${API_BASE}/shared-bills/${groupId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense),
      });
      const json = await res.json();
      return json.success ? json : null;
    } catch (e) {
      console.error('Error adding shared expense:', e);
      return null;
    }
  },

  async updateSharedExpense(
    groupId: string,
    expense: BillExpense
  ): Promise<{ group: SharedBillGroup; expense: BillExpense } | null> {
    try {
      const res = await fetch(`${API_BASE}/shared-bills/${groupId}/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense),
      });
      const json = await res.json();
      return json.success ? json : null;
    } catch (e) {
      console.error('Error updating shared expense:', e);
      return null;
    }
  },

  async deleteSharedExpense(groupId: string, expenseId: string): Promise<SharedBillGroup | null> {
    try {
      const res = await fetch(`${API_BASE}/shared-bills/${groupId}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      return json.success && json.group ? json.group : null;
    } catch (e) {
      console.error('Error deleting shared expense:', e);
      return null;
    }
  },

  async recordSharedSettlement(
    groupId: string,
    settlement: { from: string; to: string; amount: number; date?: string; method?: string; notes?: string }
  ): Promise<{ group: SharedBillGroup; settlement: SharedSettlement } | null> {
    try {
      const res = await fetch(`${API_BASE}/shared-bills/${groupId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settlement),
      });
      const json = await res.json();
      return json.success ? json : null;
    } catch (e) {
      console.error('Error recording shared settlement:', e);
      return null;
    }
  },
};
