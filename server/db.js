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

export const INITIAL_USERS = [];

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
  const found = users.find((u) => u.id === userId);
  if (found) return found;

  // Auto-recover user profile if data file exists on disk
  const filePath = getUserDataFilePath(userId);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const recoveredUser = {
        id: userId,
        name: data?.userProfile?.name || 'Primary User',
        email: data?.userProfile?.email || `${userId}@apexfinance.io`,
        avatar: data?.userProfile?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userId)}`,
        currency: data?.userProfile?.currency || 'USD',
        role: data?.userProfile?.role || 'Personal',
        color: data?.userProfile?.color || '#6366f1',
        createdAt: new Date().toISOString().split('T')[0],
      };
      users.push(recoveredUser);
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
      return recoveredUser;
    } catch {
      // fallback
    }
  }
  return null;
}

export function upsertUser(userData) {
  const users = getUsers();
  const userId = userData.id || `user-${Date.now()}`;
  const existingIdx = users.findIndex((u) => u.id === userId);

  const cleanUser = {
    id: userId,
    name: (userData.name || 'User').trim(),
    email: userData.email?.trim() || `${(userData.name || 'user').toLowerCase().replace(/\s+/g, '')}@apexfinance.io`,
    avatar: userData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userData.name || userId)}`,
    currency: userData.currency || 'USD',
    role: userData.role || 'Personal',
    color: userData.color || '#6366f1',
    pin: userData.pin || undefined,
    createdAt: userData.createdAt || new Date().toISOString().split('T')[0],
  };

  if (existingIdx !== -1) {
    users[existingIdx] = { ...users[existingIdx], ...cleanUser };
  } else {
    users.push(cleanUser);
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

  // If no data file exists for this user, create initial data
  const filePath = getUserDataFilePath(userId);
  if (!fs.existsSync(filePath)) {
    const initialUserData = {
      transactions: [],
      budgets: [],
      billGroups: [],
      accounts: [
        {
          id: `acc-${Date.now()}-1`,
          name: `${cleanUser.name}'s Primary Account`,
          type: 'checking',
          balance: Number(userData.initialBalance) || 0,
          currency: cleanUser.currency || 'USD',
          institution: 'Main Wallet',
          accountNumber: '•••• ' + Math.floor(1000 + Math.random() * 9000),
          color: 'from-blue-600 to-indigo-700',
          isDefault: true,
        },
      ],
      goals: [],
      subscriptions: [],
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    saveUserData(userId, initialUserData);
  }

  return cleanUser;
}

export function createUser(userData) {
  return upsertUser(userData);
}

export function findOrCreateGoogleUser(googleData) {
  const users = getUsers();
  // Check if user already exists by googleId or email
  let existingUser = users.find(
    (u) => (u.googleId && u.googleId === googleData.googleId) || (u.email && u.email === googleData.email)
  );

  if (existingUser) {
    existingUser.name = googleData.name || existingUser.name;
    existingUser.avatar = googleData.avatar || existingUser.avatar;
    existingUser.googleId = googleData.googleId || existingUser.googleId;
    existingUser.authProvider = 'google';
    updateUser(existingUser.id, existingUser);
    return existingUser;
  }

  // Create new Google user profile
  const newUser = {
    id: `google-${googleData.googleId || Date.now()}`,
    name: googleData.name.trim(),
    email: googleData.email.trim(),
    avatar: googleData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(googleData.name)}`,
    currency: googleData.currency || 'USD',
    role: 'Google Account',
    color: '#3b82f6',
    authProvider: 'google',
    googleId: googleData.googleId,
    createdAt: new Date().toISOString().split('T')[0],
  };

  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

  // Initialize clean data file for new Google user if not exists
  const existingData = getUserData(newUser.id);
  if (!existingData) {
    const initialUserData = {
      transactions: [],
      budgets: [],
      billGroups: [],
      accounts: [
        {
          id: `acc-${Date.now()}-1`,
          name: `${googleData.name}'s Primary Account`,
          type: 'checking',
          balance: 0,
          currency: googleData.currency || 'USD',
          institution: 'Main Wallet',
          accountNumber: '•••• ' + Math.floor(1000 + Math.random() * 9000),
          color: 'from-blue-600 to-indigo-700',
          isDefault: true,
        },
      ],
      goals: [],
      subscriptions: [],
    };
    saveUserData(newUser.id, initialUserData);
  }

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

export function getUserDataMeta(userId) {
  const data = getUserData(userId);
  if (!data) return null;
  return {
    version: data.version || 1,
    updatedAt: data.updatedAt || new Date().toISOString(),
    counts: {
      transactions: Array.isArray(data.transactions) ? data.transactions.length : 0,
      budgets: Array.isArray(data.budgets) ? data.budgets.length : 0,
      billGroups: Array.isArray(data.billGroups) ? data.billGroups.length : 0,
      accounts: Array.isArray(data.accounts) ? data.accounts.length : 0,
      goals: Array.isArray(data.goals) ? data.goals.length : 0,
      subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions.length : 0,
    },
  };
}

export function saveUserData(userId, data) {
  let user = getUserById(userId);
  if (!user) {
    user = upsertUser({
      id: userId,
      name: data?.userProfile?.name || 'Primary User',
      currency: data?.userProfile?.currency || 'USD',
    });
  }

  const filePath = getUserDataFilePath(userId);
  if (data && typeof data === 'object') {
    const existing = getUserData(userId);
    const prevVersion = existing?.version || 0;
    data.version = typeof data.version === 'number' && data.version > prevVersion ? data.version : prevVersion + 1;
    data.updatedAt = new Date().toISOString();
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

  // Index bill groups into shared registry for real-time live member access
  if (data && Array.isArray(data.billGroups)) {
    try {
      const user = getUserById(userId);
      const userCurrency = user?.currency || 'USD';
      const userName = user?.name || 'Owner';
      data.billGroups.forEach((bg) => {
        upsertSharedBillGroup(bg, userId, userName, userCurrency);
      });
    } catch (e) {
      console.warn('Error indexing shared bill groups:', e);
    }
  }

  return data;
}

// ----------------------------------------------------
// Real-Time Shared Bill Groups Engine
// ----------------------------------------------------
const SHARED_GROUPS_FILE = path.join(DATA_DIR, 'shared_groups.json');

function initSharedGroupsDb() {
  if (!fs.existsSync(SHARED_GROUPS_FILE)) {
    fs.writeFileSync(SHARED_GROUPS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getSharedGroups() {
  initSharedGroupsDb();
  try {
    const raw = fs.readFileSync(SHARED_GROUPS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading shared groups file:', e);
    return [];
  }
}

export function getSharedGroupById(groupId) {
  const groups = getSharedGroups();
  let found = groups.find((g) => g.id === groupId);

  // If not yet in shared registry, search across all user data files
  if (!found) {
    const users = getUsers();
    for (const u of users) {
      const uData = getUserData(u.id);
      if (uData && Array.isArray(uData.billGroups)) {
        const match = uData.billGroups.find((bg) => bg.id === groupId);
        if (match) {
          found = upsertSharedBillGroup(match, u.id, u.name, u.currency || 'USD');
          break;
        }
      }
    }
  }

  return found || null;
}

export function upsertSharedBillGroup(group, ownerId, ownerName, currency = 'USD') {
  const groups = getSharedGroups();
  const existingIdx = groups.findIndex((g) => g.id === group.id);

  const sharedRecord = {
    id: group.id,
    name: group.name,
    members: group.members || ['You'],
    expenses: group.expenses || [],
    settlements: group.settlements || [],
    ownerId: ownerId || (existingIdx !== -1 ? groups[existingIdx].ownerId : 'unknown'),
    ownerName: ownerName || (existingIdx !== -1 ? groups[existingIdx].ownerName : 'Group Owner'),
    currency: currency || (existingIdx !== -1 ? groups[existingIdx].currency : 'USD'),
    createdAt: group.createdAt || (existingIdx !== -1 ? groups[existingIdx].createdAt : new Date().toISOString()),
    lastModified: new Date().toISOString(),
    version: existingIdx !== -1 ? (groups[existingIdx].version || 1) + 1 : 1,
  };

  if (existingIdx !== -1) {
    groups[existingIdx] = sharedRecord;
  } else {
    groups.push(sharedRecord);
  }

  fs.writeFileSync(SHARED_GROUPS_FILE, JSON.stringify(groups, null, 2), 'utf-8');
  return sharedRecord;
}

function syncSharedGroupToUser(groupId, updatedGroup) {
  if (!updatedGroup.ownerId) return;
  const uData = getUserData(updatedGroup.ownerId);
  if (uData && Array.isArray(uData.billGroups)) {
    const gIdx = uData.billGroups.findIndex((bg) => bg.id === groupId);
    if (gIdx !== -1) {
      uData.billGroups[gIdx] = {
        id: updatedGroup.id,
        name: updatedGroup.name,
        members: updatedGroup.members,
        expenses: updatedGroup.expenses,
        settlements: updatedGroup.settlements,
        createdAt: updatedGroup.createdAt,
      };
      const filePath = getUserDataFilePath(updatedGroup.ownerId);
      fs.writeFileSync(filePath, JSON.stringify(uData, null, 2), 'utf-8');
    }
  }
}

export function addExpenseToSharedGroup(groupId, expenseData) {
  const group = getSharedGroupById(groupId);
  if (!group) return null;

  const newExpense = {
    id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    description: expenseData.description.trim(),
    totalAmount: Number(expenseData.totalAmount) || 0,
    paidBy: expenseData.paidBy || group.members[0] || 'Unknown',
    members: expenseData.members || [],
    date: expenseData.date || new Date().toISOString().split('T')[0],
    category: expenseData.category || 'General',
    createdAt: new Date().toISOString(),
  };

  group.expenses = [newExpense, ...group.expenses];
  group.lastModified = new Date().toISOString();
  group.version = (group.version || 1) + 1;

  upsertSharedBillGroup(group, group.ownerId, group.ownerName, group.currency);
  syncSharedGroupToUser(groupId, group);
  return { group, expense: newExpense };
}

export function updateSharedGroupExpense(groupId, expenseData) {
  const group = getSharedGroupById(groupId);
  if (!group) return null;

  const idx = group.expenses.findIndex((e) => e.id === expenseData.id);
  if (idx === -1) return null;

  group.expenses[idx] = {
    ...group.expenses[idx],
    ...expenseData,
  };
  group.lastModified = new Date().toISOString();
  group.version = (group.version || 1) + 1;

  upsertSharedBillGroup(group, group.ownerId, group.ownerName, group.currency);
  syncSharedGroupToUser(groupId, group);
  return { group, expense: group.expenses[idx] };
}

export function deleteSharedGroupExpense(groupId, expenseId) {
  const group = getSharedGroupById(groupId);
  if (!group) return null;

  group.expenses = group.expenses.filter((e) => e.id !== expenseId);
  group.lastModified = new Date().toISOString();
  group.version = (group.version || 1) + 1;

  upsertSharedBillGroup(group, group.ownerId, group.ownerName, group.currency);
  syncSharedGroupToUser(groupId, group);
  return group;
}

export function recordSettlementInSharedGroup(groupId, settlementData) {
  const group = getSharedGroupById(groupId);
  if (!group) return null;

  const newSettlement = {
    id: `settle-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    from: settlementData.from,
    to: settlementData.to,
    amount: Number(settlementData.amount) || 0,
    date: settlementData.date || new Date().toISOString().split('T')[0],
    method: settlementData.method || 'Cash / Transfer',
    notes: settlementData.notes || '',
    recordedAt: new Date().toISOString(),
  };

  // Also convert settlement into a balance-offsetting expense record so Splitwise-style balances resolve
  const settlementExpense = {
    id: `exp-settle-${Date.now()}`,
    description: `🤝 Settlement: ${settlementData.from} paid ${settlementData.to}`,
    totalAmount: Number(settlementData.amount) || 0,
    paidBy: settlementData.from,
    date: settlementData.date || new Date().toISOString().split('T')[0],
    category: 'Transfer',
    members: group.members.map((m) => ({
      name: m,
      paidAmount: m === settlementData.from ? Number(settlementData.amount) || 0 : 0,
      shareAmount: m === settlementData.to ? Number(settlementData.amount) || 0 : 0,
    })),
  };

  group.expenses = [settlementExpense, ...group.expenses];
  group.settlements = [newSettlement, ...(group.settlements || [])];
  group.lastModified = new Date().toISOString();
  group.version = (group.version || 1) + 1;

  upsertSharedBillGroup(group, group.ownerId, group.ownerName, group.currency);
  syncSharedGroupToUser(groupId, group);
  return { group, settlement: newSettlement };
}
