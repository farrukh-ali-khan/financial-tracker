# 📦 Build & Distribute Financial Tracker

---

## Part 1 — Build on Your Own Machine (Ubuntu)

### Step 1 — Build the app

```bash
cd ~/projects/financial-tracker
cargo tauri build
```

First build takes **5–10 minutes** (Rust compiles everything).
After that, incremental builds take 1–2 minutes.

### Step 2 — Find your output files

After build finishes, all output is in:
```
src-tauri/target/release/bundle/
```

Linux outputs:
```
src-tauri/target/release/bundle/
├── deb/
│   └── financial-tracker_1.0.0_amd64.deb    ← Debian/Ubuntu installer
├── appimage/
│   └── financial-tracker_1.0.0_amd64.AppImage  ← Portable, runs anywhere
└── rpm/
    └── financial-tracker-1.0.0-1.x86_64.rpm  ← Fedora/RHEL installer
```

---

## Part 2 — How to give it to someone

### Linux users

**Option A — AppImage (easiest, no install needed)**
```bash
# Just send them the .AppImage file.
# They run it like this:
chmod +x financial-tracker_1.0.0_amd64.AppImage
./financial-tracker_1.0.0_amd64.AppImage
```
No installation, no dependencies, works on any Linux distro.
Double-click works too if they allow execution in file manager.

**Option B — .deb (Ubuntu/Debian)**
```bash
# They run:
sudo dpkg -i financial-tracker_1.0.0_amd64.deb
# Then find it in their app menu or run:
financial-tracker
```

---

## Part 3 — Build for Windows (from Ubuntu)

Tauri can cross-compile for Windows using a Windows VM or GitHub Actions.

### Easiest method — GitHub Actions (free, automatic)

**Step 1 — Push code to GitHub**
```bash
cd ~/projects/financial-tracker
git init
git add .
git commit -m "Initial release"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/financial-tracker.git
git push -u origin main
```

**Step 2 — Create the workflow file**

Create file: `.github/workflows/build.yml`

```yaml
name: Build Financial Tracker

on:
  push:
    tags:
      - 'v*'        # triggers on: git tag v1.0.0 && git push --tags
  workflow_dispatch:  # or trigger manually from GitHub website

jobs:
  build:
    strategy:
      matrix:
        include:
          - platform: ubuntu-22.04
            target: x86_64-unknown-linux-gnu
          - platform: windows-latest
            target: x86_64-pc-windows-msvc
          - platform: macos-latest
            target: aarch64-apple-darwin    # Apple Silicon
          - platform: macos-13
            target: x86_64-apple-darwin     # Intel Mac

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install Linux dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev \
            librsvg2-dev patchelf libxdo-dev

      - name: Install npm dependencies
        run: npm install

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Financial Tracker ${{ github.ref_name }}'
          releaseBody: 'New release of Financial Tracker'
          releaseDraft: false
          prerelease: false
          args: --target ${{ matrix.target }}
```

**Step 3 — Release**
```bash
git tag v1.0.0
git push --tags
```

GitHub will automatically:
- Build for Linux (`.deb`, `.AppImage`, `.rpm`)
- Build for Windows (`.msi` installer, `.exe`)
- Build for macOS (`.dmg`)
- Create a GitHub Release with all files attached

Your users just go to:
`https://github.com/YOUR_USERNAME/financial-tracker/releases`
and download their platform's file.

---

## Part 4 — What each person downloads

| Platform | File | How to install |
|---|---|---|
| **Ubuntu/Debian** | `.deb` | `sudo dpkg -i file.deb` or double-click |
| **Any Linux** | `.AppImage` | `chmod +x` then double-click |
| **Fedora/RHEL** | `.rpm` | `sudo rpm -i file.rpm` |
| **Windows** | `.msi` | Double-click → Next → Install |
| **Windows** | `.exe` (NSIS) | Double-click → Install |
| **macOS** | `.dmg` | Open → drag app to Applications |

---

## Part 5 — Share without GitHub (direct file share)

If you just want to send the file to someone directly:

**Linux → Linux:**
Send the `.AppImage` file via WhatsApp, Google Drive, USB etc.
They just run it — no install needed.

**Linux → Windows:**
You need a Windows machine or GitHub Actions to build the `.msi`.
You cannot build a Windows `.exe` directly from Linux without a VM.

**Quick option — Build on each platform separately:**
- On your Ubuntu: `cargo tauri build` → share the AppImage to Linux users
- On a Windows PC: install Rust + Node, same commands → get `.msi` for Windows users
- On a Mac: install Rust + Node, same commands → get `.dmg` for Mac users

---

## Part 6 — Database location on user machines

Each user's data is stored locally on their own machine:

| OS | Location |
|---|---|
| Linux | `~/.local/share/com.financialtracker.app/` |
| Windows | `C:\Users\NAME\AppData\Roaming\com.financialtracker.app\` |
| macOS | `~/Library/Application Support/com.financialtracker.app/` |

Data is private — nothing is uploaded anywhere.

---

## Quick Summary

```
You (Ubuntu)          → cargo tauri build → .AppImage (share to Linux users)
GitHub Actions (free) → auto builds       → .msi (Windows) + .dmg (macOS)
```

Total time to get all 3 platform files: ~15 minutes setup + 10 min build time.
