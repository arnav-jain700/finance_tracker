# 🚀 ApexFinance Pro — Intelligent Wealth & Group Expense Management Suite

[![React](https://img.shields.io/badge/React-19.1.0-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3-purple?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-5.2-lightgrey?style=for-the-badge&logo=express&logoColor=black)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**ApexFinance Pro** is a full-stack, enterprise-grade personal wealth and group expense management suite designed for individuals, roommates, travel groups, and families. It features real-time multi-currency Forex conversions, an advanced multi-payer bill splitting engine with smart auto-pending tab balancing, interactive partial debt settlement tracking, multi-profile architecture, and rich financial analytics.

---

## ✨ Key Features

### 👥 1. Advanced Group Bill Splitting & Multi-Payer Engine
- **Flexible Splitting Strategies**: Split shared expenses **Equally**, with **Exact Custom Tabs**, or by **Percentages (%)**.
- **Single vs. Multiple Payers**: Support for single payer bills or shared upfront contributions where multiple friends pay different portions of the same receipt.
- **⚡ Smart Auto-Pending Tab Balancer**: When typing custom amounts for individual members, the system automatically calculates the remaining unallocated balance and seamlessly distributes it across the remaining unedited member tabs in real time.
- **Live Tab Status Badges**: Real-time visual feedback per person indicating `[Manual]` vs `[Auto-Pending]`, and exact `Pending: ₹XX.XX` / `Advance: +₹XX.XX` status.

### 💸 2. Interactive Debt Settlement & Partial Payment Tracking
- **Simplest Settlement Optimizer**: Automatically simplifies complex multi-person group debts into the minimum number of direct transactions.
- **"Record Payment" Dialog**: Log cash, UPI, or bank transfers with custom amounts given (supports full or partial payments).
- **Dynamic Pending Debt Calculator**: Real-time preview showing *Original Debt*, *Amount Given Now*, and *Remaining Pending Debt*.
- **Member Balances & Tabs Breakdown**: Transparently view total **Given**, total **Share (Consumed)**, and net **Pending / Gets** status for every member.

### 💱 3. Live Forex Exchange Rates & Multi-Currency Engine
- **Live Market Rates**: Automatically fetches and caches real-time Forex exchange rates (`USD`, `EUR`, `GBP`, `INR`, `JPY`, `CAD`, `AUD`) from financial exchange APIs.
- **Dynamic Currency Switching**: Changing your base currency instantly recalculates all historical transactions, budgets, account balances, and split bills at current market value without manual adjustments.

### 👤 4. Multi-Profile & Multi-User Architecture
- **Independent Profile Management**: Create and switch between multiple user profiles with separate wallets, accounts, and budgets.
- **Customizable Personas**: Set roles, avatar seeds, accent theme colors, and security PINs.
- **Resilient Two-Tier Storage**: Automatic synchronization between browser `localStorage` and the local Express JSON disk database (`server/data/`), guaranteeing instant offline access and persistent durability across restarts.

### 📊 5. Financial Dashboard & Interactive Analytics
- **Net Worth & Cash Flow Overview**: Real-time totals for income, expenses, liquid cash, savings, and investments.
- **Category Budgets**: Set spending limits with visual progress bars and alert thresholds.
- **Savings Goals**: Track milestones and projected target completion dates.
- **Recurring Subscriptions**: Monitor recurring subscriptions, billing cycles, and renewal reminders.

### 🎨 6. Modern Glassmorphism UI & Audio Feedback
- **Tailwind CSS v4 & Lucide Icons**: Modern glassmorphic cards, smooth animations, and responsive design.
- **Theme Modes**: Full support for Dark, Light, and System themes.
- **Sound Effects**: Audio feedback for actions (cash registers, clicks, error alerts, celebration chimes for cleared debts).

---

## 🛠️ Tech Stack

- **Frontend**:
  - React 19 + TypeScript
  - Vite 6
  - Tailwind CSS v4
  - Lucide React (Icons)
  - Recharts (Data Visualization)
  - HTML5 Web Audio API (Sound FX)
- **Backend**:
  - Node.js + Express 5
  - File-based Atomic JSON Database
  - Live Forex Exchange Rates API Integration
  - CORS-enabled REST API

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/arnav-jain700/finance_tracker.git
cd finance_tracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server (Full-Stack)
### 3. Start Application (One-Command Full-Stack)
Run both the backend Express API server (`localhost:5000`) and the Vite web client (`localhost:5174`) concurrently with auto-dependency checking and browser launch:

```bash
npm start
```
*(or `npm run dev` / double-click `start.bat` on Windows)*

The browser will open automatically at **`http://localhost:5174/`**.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm start` | **All-in-One Runner**: Checks dependencies, launches Express API & Vite client, and opens browser |
| `npm run dev` | Alias for `npm start` |
| `start.bat` | Windows 1-click launcher |
| `npm run server` | Starts only the Express backend server on `http://localhost:5000` |
| `npm run client` | Starts only the Vite frontend dev server |
| `npm run build` | Compiles TypeScript and builds production bundles with Vite |
| `npm run preview` | Previews the production build locally |

---

## 📁 Project Structure

```
finance_tracker/
├── index.html                  # HTML entry point
├── package.json                # Project manifest and scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite bundler configuration
├── server/                     # Backend API & DB
│   ├── index.js                # Express REST API routes & Forex rate engine
│   ├── db.js                   # Atomic file-based JSON storage handlers
│   └── data/                   # Dynamic user databases (gitignored)
│       └── .gitkeep
└── src/                        # Frontend Application
    ├── App.tsx                 # Main layout, router & state synchronization
    ├── main.tsx                # React DOM root mounting
    ├── index.css               # Tailwind CSS v4 styling & animations
    ├── api/
    │   └── client.ts           # REST API client for backend communication
    ├── store/
    │   └── index.ts            # Data models, Forex conversions & initial seed data
    ├── utils/
    │   └── audio.ts            # Sound effects synthesizer
    └── components/             # UI Components
        ├── Layout.tsx          # App header, navigation sidebar, theme/currency switcher
        ├── DashboardView.tsx   # Financial overview, charts & quick actions
        ├── TransactionsView.tsx# Transaction ledger with search, filtering & export
        ├── BudgetsView.tsx     # Monthly budget categories & limit monitors
        ├── BillsView.tsx       # Bill splitting, multi-payers, tabs & debt settlements
        ├── AccountsView.tsx    # Bank accounts, cards, balances & transfers
        ├── GoalsView.tsx       # Savings milestones & financial targets
        ├── SubscriptionsView.tsx # Recurring subscriptions & renewal tracking
        ├── UserProfileModal.tsx# Profile manager, PIN security & user switcher
        ├── UserLockModal.tsx   # Security PIN lock screen
        └── SettingsView.tsx    # Currency, theme, and data backup/export settings
```

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend status and server timestamp |
| `GET` | `/api/rates` | Real-time Forex rates (USD, EUR, GBP, INR, JPY, CAD, AUD) |
| `GET` | `/api/users` | List all registered user profiles |
| `POST` | `/api/users` | Create a new user profile with initial accounts |
| `PUT` | `/api/users/:id` | Update user metadata (name, currency, avatar, PIN) |
| `DELETE` | `/api/users/:id` | Delete user profile and personal data file |
| `GET` | `/api/users/:id/data` | Fetch complete financial state (transactions, bills, budgets) |
| `POST` | `/api/users/:id/data` | Save and sync financial state to disk |
| `POST` | `/api/users/:id/reset` | Clear financial records for a specific profile |

---

## 🔒 Privacy & Data Protection
All user transaction records, personal receipts, and financial databases generated within `server/data/` are strictly **gitignored** and stored locally on your machine, ensuring zero leakage of personal financial details to public repositories.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
