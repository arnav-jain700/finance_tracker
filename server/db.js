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
    role: userData.role || 'Personal',
    color: userData.color || '#6366f1',
    pin: userData.pin || undefined,
    createdAt: new Date().toISOString().split('T')[0],
  };

  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

  // Initialize clean data file for new user with zero sample transactions/budgets/goals
  const initialUserData = {
    transactions: [],
    budgets: [],
    billGroups: [],
    accounts: [
      {
        id: `acc-${Date.now()}-1`,
        name: `${userData.name}'s Primary Account`,
        type: 'checking',
        balance: Number(userData.initialBalance) || 0,
        currency: userData.currency || 'USD',
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
  return newUser;
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

export function saveUserData(userId, data) {
  const filePath = getUserDataFilePath(userId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}
