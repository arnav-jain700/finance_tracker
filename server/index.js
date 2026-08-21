import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDb,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserData,
  getUserData,
  getUserDataMeta,
  saveUserData,
  findOrCreateGoogleUser,
  INITIAL_USERS,
  getSharedGroupById,
  addExpenseToSharedGroup,
  updateSharedGroupExpense,
  deleteSharedGroupExpense,
  recordSettlementInSharedGroup,
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_PATH = path.join(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize DB structure
initDb();

// Cache for live exchange rates
let cachedRates = {
  base: 'USD',
  rates: {
    USD: 1.0,
    EUR: 0.864,
    GBP: 0.739,
    INR: 95.77,
    JPY: 159.59,
    CAD: 1.389,
    AUD: 1.410,
  },
  lastUpdated: new Date().toISOString(),
};
let lastFetchTime = 0;

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'ApexFinance Backend API',
    time: new Date().toISOString(),
  });
});

// Live Market Exchange Rates Endpoint
app.get('/api/rates', async (req, res) => {
  const now = Date.now();
  // Cache for 30 minutes
  if (now - lastFetchTime > 30 * 60 * 1000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const apiRes = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && data.rates) {
          cachedRates = {
            base: 'USD',
            rates: {
              USD: 1.0,
              EUR: Number(data.rates.EUR) || 0.864,
              GBP: Number(data.rates.GBP) || 0.739,
              INR: Number(data.rates.INR) || 95.77,
              JPY: Number(data.rates.JPY) || 159.59,
              CAD: Number(data.rates.CAD) || 1.389,
              AUD: Number(data.rates.AUD) || 1.410,
            },
            lastUpdated: new Date().toISOString(),
          };
          lastFetchTime = now;
        }
      }
    } catch (e) {
      console.warn('Using cached exchange rates (live API unreachable):', e.message);
    }
  }

  res.json({
    success: true,
    data: cachedRates,
  });
});

// Get all registered users
app.get('/api/users', (req, res) => {
  try {
    const users = getUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Google OAuth login / synchronization
app.post('/api/auth/google', (req, res) => {
  try {
    const { googleId, name, email, avatar, currency } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Name and email are required for Google Auth' });
    }

    const user = findOrCreateGoogleUser({
      googleId: googleId || email,
      name,
      email,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      currency: currency || 'USD',
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Error during Google authentication:', error);
    res.status(500).json({ success: false, error: 'Google auth failed' });
  }
});

// Create new user profile
app.post('/api/users', (req, res) => {
  try {
    const { name, email, avatar, currency, initialBalance, role, color, pin } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const newUser = createUser({ name, email, avatar, currency, initialBalance, role, color, pin });
    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// Update user profile metadata
app.put('/api/users/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const updatedUser = updateUser(userId, req.body);
    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// Delete user profile and data
app.delete('/api/users/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const users = getUsers();
    if (users.length <= 1) {
      return res.status(400).json({ success: false, error: 'Cannot delete the only remaining profile' });
    }
    const success = deleteUser(userId);
    res.json({ success });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// Reset specific user financial data
app.post('/api/users/:userId/reset', (req, res) => {
  try {
    const { userId } = req.params;
    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const resetData = resetUserData(userId);
    res.json({ success: true, data: resetData });
  } catch (error) {
    console.error('Error resetting user data:', error);
    res.status(500).json({ success: false, error: 'Failed to reset user data' });
  }
});

// Get specific user financial state
app.get('/api/users/:userId/data', (req, res) => {
  try {
    const { userId } = req.params;
    let user = getUserById(userId);
    const data = getUserData(userId);
    res.json({ success: true, data: data || null, user: user || null });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user data' });
  }
});

// Lightweight cross-device polling endpoint for real-time mobile <-> laptop sync
app.get('/api/users/:userId/data/meta', (req, res) => {
  try {
    const { userId } = req.params;
    const meta = getUserDataMeta(userId);
    res.json({ success: true, meta: meta || { version: 0, updatedAt: new Date().toISOString() } });
  } catch (error) {
    console.error('Error fetching user data meta:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user data meta' });
  }
});

// Save/Sync specific user financial state
app.post('/api/users/:userId/data', (req, res) => {
  try {
    const { userId } = req.params;
    const savedData = saveUserData(userId, req.body);
    res.json({ success: true, data: savedData });
  } catch (error) {
    console.error('Error saving user data:', error);
    res.status(500).json({ success: false, error: 'Failed to save user data' });
  }
});

// ----------------------------------------------------
// Public Real-Time Shared Bill Split Endpoints
// ----------------------------------------------------

// Get live shared bill group data & member balances
app.get('/api/shared-bills/:groupId', (req, res) => {
  try {
    const { groupId } = req.params;
    const group = getSharedGroupById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Shared bill group not found' });
    }
    res.json({ success: true, group });
  } catch (error) {
    console.error('Error fetching shared bill group:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch shared group' });
  }
});

// Fast lightweight real-time polling check for live updates
app.get('/api/shared-bills/:groupId/live', (req, res) => {
  try {
    const { groupId } = req.params;
    const group = getSharedGroupById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    res.json({
      success: true,
      id: group.id,
      version: group.version || 1,
      lastModified: group.lastModified,
      expenseCount: group.expenses?.length || 0,
      settlementCount: group.settlements?.length || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add an expense into the shared group in real time
app.post('/api/shared-bills/:groupId/expenses', (req, res) => {
  try {
    const { groupId } = req.params;
    const { description, totalAmount, paidBy, members, date, category } = req.body;
    if (!description || !totalAmount) {
      return res.status(400).json({ success: false, error: 'Description and total amount are required' });
    }

    const result = addExpenseToSharedGroup(groupId, {
      description,
      totalAmount,
      paidBy,
      members,
      date,
      category,
    });

    if (!result) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    res.status(201).json({ success: true, group: result.group, expense: result.expense });
  } catch (error) {
    console.error('Error adding expense to shared group:', error);
    res.status(500).json({ success: false, error: 'Failed to add expense' });
  }
});

// Update an expense in the shared group
app.put('/api/shared-bills/:groupId/expenses/:expenseId', (req, res) => {
  try {
    const { groupId, expenseId } = req.params;
    const result = updateSharedGroupExpense(groupId, { ...req.body, id: expenseId });
    if (!result) {
      return res.status(404).json({ success: false, error: 'Group or expense not found' });
    }
    res.json({ success: true, group: result.group, expense: result.expense });
  } catch (error) {
    console.error('Error updating shared expense:', error);
    res.status(500).json({ success: false, error: 'Failed to update expense' });
  }
});

// Delete an expense in the shared group
app.delete('/api/shared-bills/:groupId/expenses/:expenseId', (req, res) => {
  try {
    const { groupId, expenseId } = req.params;
    const group = deleteSharedGroupExpense(groupId, expenseId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    res.json({ success: true, group });
  } catch (error) {
    console.error('Error deleting shared expense:', error);
    res.status(500).json({ success: false, error: 'Failed to delete expense' });
  }
});

// Record a payment / settlement in the shared group in real time
app.post('/api/shared-bills/:groupId/settle', (req, res) => {
  try {
    const { groupId } = req.params;
    const { from, to, amount, date, method, notes } = req.body;
    if (!from || !to || !amount) {
      return res.status(400).json({ success: false, error: 'From, To, and Amount are required' });
    }

    const result = recordSettlementInSharedGroup(groupId, {
      from,
      to,
      amount,
      date,
      method,
      notes,
    });

    if (!result) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    res.status(201).json({ success: true, group: result.group, settlement: result.settlement });
  } catch (error) {
    console.error('Error recording settlement:', error);
    res.status(500).json({ success: false, error: 'Failed to record settlement' });
  }
});

// Serve production static frontend SPA if built
if (fs.existsSync(DIST_PATH)) {
  console.log(`📁 Static assets loaded from: ${DIST_PATH}`);
  app.use(express.static(DIST_PATH));
  app.get('/', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_PATH, 'index.html'));
    }
    next();
  });
} else {
  console.warn(`⚠️ Warning: DIST_PATH does not exist: ${DIST_PATH}`);
  app.get('/', (req, res) => {
    res.status(200).send(`
      <div style="font-family: sans-serif; max-width: 600px; margin: 60px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; text-align: center;">
        <h2>⚡ ApexFinance Backend API Online</h2>
        <p style="color: #64748b;">The Express API is running, but the frontend static build was not found.</p>
        <p style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-family: monospace;">Build Command in Render should be: <strong>npm install && npm run build</strong></p>
      </div>
    `);
  });
}

app.listen(PORT, () => {
  console.log(`⚡ ApexFinance Backend running on http://localhost:${PORT}`);
});
