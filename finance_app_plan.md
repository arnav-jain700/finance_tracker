# Finance Tracker Pro: Development Plan

## 1. Core Feature Set
- **Comprehensive Dashboard**: High-level overview of total balance, monthly income, and monthly expenses.
- **Transaction Management**: Add, edit, delete, categorize, and filter transactions.
- **Visual Analytics**:
    - Spending breakdown (pie chart).
    - Monthly trends (income vs. expenses line chart).
- **Budgeting System**: Monthly limits for specific categories with progress bars.
- **Bill Splitting**:
    - **Group Creation**: Define groups for shared expenses (e.g., roommates, trip).
    - **Expense Splitting**: Add shared expenses, define splits (equal or custom), and track who paid what.
- **Data Persistence**: Automatic saving to Browser LocalStorage.

## 2. Technology Stack
- **Framework**: React (Vite) with TypeScript.
- **Styling**: Tailwind CSS.
- **Icons**: Lucide React.
- **Charts**: Recharts.
- **Date Handling**: date-fns.

## 3. Implementation Roadmap
1. **Initialize Project**: Scaffold Vite project with React + TypeScript + Tailwind.
2. **Data Modeling & State**: Define types for Transactions, Budgets, and Bill Groups.
3. **Core Dashboard & Transactions**: Build the main UI and CRUD operations.
4. **Analytics**: Integrate charts for visualization.
5. **Bill Splitting Module**: Implement the logic and UI for group expenses.
6. **Polishing**: Dark mode, responsive styling, and error handling.
