import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const INITIAL_USERS = [
  {
    id: 'user-1',
    name: 'Alex Morgan',
    email: 'alex@apexfinance.io',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    currency: 'USD',
    role: 'Primary Owner',
    color: '#6366f1',
    pin: '1234',
    createdAt: '2026-08-01',
  },
  {
    id: 'user-2',
    name: 'Sarah Chen',
    email: 'sarah@apexfinance.io',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    currency: 'USD',
    role: 'Partner',
    color: '#ec4899',
    pin: '1234',
    createdAt: '2026-08-05',
  },
  {
    id: 'user-3',
    name: 'Marcus Vance',
    email: 'marcus@apexfinance.io',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    currency: 'EUR',
    role: 'Collaborator',
    color: '#10b981',
    pin: '1234',
    createdAt: '2026-08-10',
  },
];

const getUserDataFilePath = (userId) => path.join(DATA_DIR, `userData_${userId}.json`);

export function initDb() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(INITIAL_USERS, null, 2), 'utf-8');
  }
}

export function getUsers() {
  initDb();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading users file:', e);
    return INITIAL_USERS;
  }
}

export function getUserById(userId) {
  const users = getUsers();
  return users.find((u) => u.id === userId) || null;
}

export function createUser(userData) {
  const users = getUsers();
  const newUser = {
    id: `user-${Date.now()}`,
    name: userData.name.trim(),
    email: userData.email?.trim() || `${userData.name.toLowerCase().replace(/\s+/g, '')}@apexfinance.io`,
    avatar: userData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userData.name)}`,
    currency: userData.currency || 'USD',
    role: userData.role || 'Member',
    color: userData.color || '#6366f1',
    pin: userData.pin || '1234',
    createdAt: new Date().toISOString().split('T')[0],
  };

  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

  // Initialize empty data file for new user
  const initialUserData = {
    transactions: [],
    budgets: [
      { id: 'b-1', category: 'Housing', limit: 2000 },
      { id: 'b-2', category: 'Food & Dining', limit: 600 },
      { id: 'b-3', category: 'Transport', limit: 250 },
      { id: 'b-4', category: 'Entertainment', limit: 200 },
    ],
    billGroups: [],
    accounts: [
      {
        id: `acc-${Date.now()}-1`,
        name: `${userData.name}'s Primary Checking`,
        type: 'checking',
        balance: Number(userData.initialBalance) || 2500.0,
        currency: userData.currency || 'USD',
        institution: 'Apex Digital Bank',
        accountNumber: '•••• ' + Math.floor(1000 + Math.random() * 9000),
        color: 'from-blue-600 to-indigo-700',
        isDefault: true,
      },
    ],
    goals: [
      {
        id: `goal-${Date.now()}-1`,
        name: 'Starter Emergency Cushion',
        targetAmount: 5000,
        currentAmount: 1200,
        targetDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
        category: 'Safety',
        color: '#10b981',
        notes: 'Initial emergency fund allocation',
      },
    ],
    subscriptions: [],
  };

  saveUserData(newUser.id, initialUserData);
  return newUser;
}

export function updateUser(userId, updatedFields) {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...updatedFields,
    id: userId, // immutable id
  };

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  return users[index];
}

export function deleteUser(userId) {
  const users = getUsers();
  const filtered = users.filter((u) => u.id !== userId);
  if (filtered.length === users.length) return false;

  fs.writeFileSync(USERS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');

  // Remove individual data file if exists
  const filePath = getUserDataFilePath(userId);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.warn(`Could not remove file for deleted user ${userId}:`, e);
    }
  }

  return true;
}

export function resetUserData(userId) {
  const user = getUserById(userId);
  if (!user) return null;

  const emptyData = {
    transactions: [],
    budgets: [],
    billGroups: [],
    accounts: [
      {
        id: `acc-${Date.now()}-1`,
        name: `${user.name}'s Primary Checking`,
        type: 'checking',
        balance: 0,
        currency: user.currency || 'USD',
        institution: 'Apex Digital Bank',
        accountNumber: '•••• ' + Math.floor(1000 + Math.random() * 9000),
        color: 'from-blue-600 to-indigo-700',
        isDefault: true,
      },
    ],
    goals: [],
    subscriptions: [],
  };

  saveUserData(userId, emptyData);
  return emptyData;
}

export function getUserData(userId) {
  const filePath = getUserDataFilePath(userId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading data for user ${userId}:`, e);
    return null;
  }
}

export function saveUserData(userId, data) {
  const filePath = getUserDataFilePath(userId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}
