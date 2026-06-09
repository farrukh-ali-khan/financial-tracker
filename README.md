# 💰 Financial Tracker

> A fast, private, cross-platform personal finance desktop app built with **Tauri 2 + React + SQLite**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri%202-FFC131?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)

---

## Screenshots

> Dashboard · Transactions · Reports · Goals · Settings

---

## Features

- 📊 **Dashboard** — Net balance, monthly income/expense summary, recent transactions
- 💸 **Transactions** — Add income & expenses with categories, search, filter by date range, edit, delete
- 📈 **Reports** — Pie charts, bar charts, category breakdowns, 12-month trend, savings goals progress
- 🎯 **Savings Goals** — Auto-synced from real net savings, equal split across goals, days/years toggle
- ⚙️ **Settings** — Profile, password change, category management, CSV/Excel/PDF export
- 🔐 **Auth** — Sign up / Sign in with PBKDF2 password hashing, Guest mode with sign-out warning
- 📁 **100% local** — All data stored on your own machine, no internet required, no servers
- 🖥️ **Cross-platform** — Linux, Windows, macOS from a single codebase

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| Styling | Tailwind CSS 3 |
| State | Zustand 4 |
| Database | SQLite via tauri-plugin-sql |
| Charts | Recharts |
| Icons | Lucide React |
| Export | xlsx + jsPDF + jspdf-autotable |

---

## Download

Go to the [Releases](../../releases) page and download for your platform:

| Platform | File |
|---|---|
| Linux (any distro) | `.AppImage` |
| Ubuntu / Debian | `.deb` |
| Fedora / RHEL | `.rpm` |
| Windows | `.msi` |
| macOS Apple Silicon | `aarch64.dmg` |
| macOS Intel | `x86_64.dmg` |

---

## Build from Source

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- Node.js 20+ (via [nvm](https://github.com/nvm-sh/nvm))
- Tauri CLI: `cargo install tauri-cli --version "^2.0"`

**Linux only — system dependencies:**
```bash
sudo apt install -y libwebkit2gtk-4.1-dev build-essential libssl-dev \
  pkg-config librsvg2-dev libxdo-dev libayatana-appindicator3-dev
```

### Run in development

```bash
git clone https://github.com/YOUR_USERNAME/financial-tracker.git
cd financial-tracker
npm install
cargo tauri dev
```

### Build for production

```bash
cargo tauri build
# Output: src-tauri/target/release/bundle/
```

---

## Data & Privacy

All data is stored **locally on your machine** in SQLite:

| OS | Location |
|---|---|
| Linux | `~/.local/share/com.financialtracker.app/` |
| Windows | `%APPDATA%\com.financialtracker.app\` |
| macOS | `~/Library/Application Support/com.financialtracker.app/` |

No data is ever sent to any server. The app works completely offline.

---

## Export Formats

From **Settings → Export Data**:

- **CSV** — Transactions or Goals, opens in Excel / Google Sheets / LibreOffice
- **Excel (.xlsx)** — Two-sheet workbook: Transactions + Goals
- **PDF Report** — Formatted, print-ready report with all transactions and goals

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Contributing

Pull requests welcome. Please open an issue first to discuss major changes.

---

## Tags

`personal-finance` `budget-tracker` `expense-tracker` `savings-goals`
`tauri` `tauri2` `rust` `react` `typescript` `sqlite` `desktop-app`
`cross-platform` `linux` `windows` `macos` `open-source` `finance`
`money-manager` `income-expense` `financial-tracker`
