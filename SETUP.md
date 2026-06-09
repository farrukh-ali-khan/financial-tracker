# 💰 Financial Tracker — Desktop App (Tauri 2)
Cross-platform: Linux · Windows · macOS

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop Shell | Tauri | 2.x |
| Language (backend) | Rust | stable |
| Language (frontend) | TypeScript | 5.x |
| UI Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Styling | TailwindCSS | 3.x |
| Database | SQLite (via tauri-plugin-sql) | 2.x |
| State Management | Zustand | 4.x |
| Routing | React Router | 6.x |
| Charts | Recharts | 2.x |
| Icons | Lucide React | latest |
| Toasts | React Hot Toast | 2.x |
| Date Utils | date-fns | 3.x |
| Password Hashing | bcryptjs | 2.x |
| Logging | tauri-plugin-log | 2.x |
| Notifications | tauri-plugin-notification | 2.x |

---

## Step 1 — System Requirements (Ubuntu / Linux)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Build dependencies for Tauri on Linux
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  pkg-config
```

---

## Step 2 — Install Rust

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Follow on-screen prompts, then reload shell
source "$HOME/.cargo/env"

# Verify
rustc --version       # rustc 1.79.x or newer
cargo --version       # cargo 1.79.x or newer
```

---

## Step 3 — Install Node.js (via nvm — recommended)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell
source ~/.bashrc

# Install latest LTS
nvm install --lts
nvm use --lts

# Verify
node --version    # v20.x.x or newer
npm --version     # 10.x.x or newer
```

---

## Step 4 — Install Tauri CLI

```bash
cargo install tauri-cli --version "^2.0"

# Verify
cargo tauri --version    # tauri-cli 2.x.x
```

---

## Step 5 — Clone / Create Project

Place all source files from this package into:
```
~/projects/financial-tracker/
```

Then run:

```bash
cd ~/projects/financial-tracker

# Install all Node packages
npm install

# Verify Tauri setup is correct
cargo tauri info
```

---

## Step 6 — VS Code Extensions (recommended)

Install these from the Extensions panel:

- **rust-analyzer** — Rust language support
- **Tauri** — Tauri development tools
- **ES7+ React/Redux snippets**
- **Tailwind CSS IntelliSense**
- **TypeScript Vue Plugin**
- **Error Lens** — inline error display

---

## Step 7 — Run in Development Mode

```bash
cd ~/projects/financial-tracker
cargo tauri dev
```

This will:
1. Start the Vite dev server on `http://localhost:1420`
2. Compile the Rust backend
3. Open the desktop window

> First run takes 2–5 minutes (Rust compilation). Subsequent runs are much faster.

---

## Step 8 — Build for Production

```bash
cargo tauri build
```

Output binaries are in:
- Linux: `src-tauri/target/release/bundle/deb/` and `appimage/`
- Windows: `src-tauri/target/release/bundle/msi/`
- macOS: `src-tauri/target/release/bundle/dmg/`

---

## Logging

Logs are written to:
- **Linux**: `~/.local/share/com.financialtracker.app/logs/`
- **Windows**: `%APPDATA%\com.financialtracker.app\logs\`
- **macOS**: `~/Library/Application Support/com.financialtracker.app/logs/`

Prefix legend:
```
[INFO]  - Normal operations
[WARN]  - Non-critical issues
[ERROR] - Failures with stack context
[DEBUG] - Verbose dev info (dev mode only)
```

---

## Database

SQLite file is at:
- **Linux**: `~/.local/share/com.financialtracker.app/financial_tracker.db`
- **Windows**: `%APPDATA%\com.financialtracker.app\financial_tracker.db`
- **macOS**: `~/Library/Application Support/com.financialtracker.app/financial_tracker.db`

---

## Project File Map

```
financial-tracker/
├── SETUP.md                          ← this file
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
│
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   └── src/
│       ├── main.rs
│       └── lib.rs
│
└── src/
    ├── main.tsx                      ← React entry point
    ├── App.tsx                       ← Router + layout
    ├── index.css                     ← Tailwind + global styles
    │
    ├── types/
    │   └── index.ts                  ← All TypeScript interfaces
    │
    ├── services/
    │   ├── database.ts               ← SQLite via tauri-plugin-sql
    │   ├── logger.ts                 ← Logging service
    │   └── notifications.ts         ← Desktop notifications
    │
    ├── store/
    │   ├── authStore.ts              ← Zustand: auth state
    │   ├── transactionStore.ts       ← Zustand: transactions
    │   └── goalStore.ts              ← Zustand: savings goals
    │
    ├── utils/
    │   ├── formatters.ts             ← Currency, date formatters
    │   └── calculations.ts          ← Balance, totals
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   └── TopBar.tsx
    │   ├── auth/
    │   │   └── AuthPage.tsx
    │   ├── transactions/
    │   │   ├── AddTransactionModal.tsx
    │   │   └── EditTransactionModal.tsx
    │   ├── goals/
    │   │   └── AddGoalModal.tsx
    │   └── reports/
    │       └── CategoryBreakdown.tsx
    │
    └── pages/
        ├── DashboardPage.tsx
        ├── TransactionsPage.tsx
        ├── ReportsPage.tsx
        └── GoalsPage.tsx
```

---

## Troubleshooting

**`webkit2gtk not found`** on Ubuntu:
```bash
sudo apt install libwebkit2gtk-4.1-dev
```

**`cargo tauri dev` shows blank window**:
```bash
# Kill old dev servers then restart
pkill -f vite
cargo tauri dev
```

**Rust compilation errors after pulling changes**:
```bash
cd src-tauri
cargo clean
cd ..
cargo tauri dev
```

**Database permission error**:
```bash
chmod 755 ~/.local/share/com.financialtracker.app/
```
