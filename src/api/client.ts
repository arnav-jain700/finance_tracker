import {
  Transaction,
  Budget,
  BillGroup,
  Account,
  Goal,
  Subscription,
} from '../store';

const API_BASE = 'http://localhost:5000/api';

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
}

export interface UserDataPayload {
  transactions: Transaction[];
  budgets: Budget[];
  billGroups: BillGroup[];
  accounts: Account[];
  goals: Goal[];
  subscriptions: Subscription[];
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
};
