# WishSync v1.2.1 - Enhanced Auto-Updater & Token-Free Public Downloads

Release **v1.2.1** brings a major overhaul to the in-app software auto-updater, aligning with the proven multi-resolution and dual-channel update architecture of **SheetApp**.

### 🚀 What's New & Improved

1. **Token-Free Client Updates (Dual-Channel Architecture):**
   - Automatically switches download channels based on repository configuration:
     - **Public Releases:** Downloads directly via `browser_download_url` with zero token required on client machines.
     - **Private Repositories:** Supports authenticated private binary downloads with fine-grained GitHub Personal Access Tokens (`Contents: Read-only`).

2. **Resilient Asset Name Matching:**
   - Broadened installer matching to `/(windows|setup).*?\.exe$/i` with automatic fallback to any release `.exe` asset.
   - Reliably detects standard NSIS setup packages (`WishSync Setup 1.2.1.exe`) and portable executables.

3. **Accurate Transfer & Speed Metrics:**
   - Fixes AWS S3 storage header stripping by injecting release metadata size (`expectedTotalBytes`).
   - Real-time download progress bar with automatic unit scaling (`KB/s` and `MB/s`) and transferred megabytes (`X.X MB / Y.Y MB`).

4. **Native Windows Tray Notifications:**
   - Dispatches Windows native notifications (`global.wishSyncTrayNotify`) when a background startup check detects a newer release.

5. **Clean Installer Shutdown & Data Preservation:**
   - Preserves all client data (`%APPDATA%\WishSync`), including linked WhatsApp sessions (`.wwebjs_auth`), Google OAuth tokens (`google_token.json`), settings, and delivery logs.

---

### 📦 Windows Desktop Packages

| Asset | Type | Architecture | Description |
|---|---|---|---|
| 💾 **WishSync Setup 1.2.1.exe** | **NSIS Setup Installer** | `x64` | Standard Windows setup installer with desktop and start menu shortcuts |
| 🚀 **WishSync 1.2.1.exe** | **Standalone Portable** | `x64` | Standalone portable executable requiring zero installation |

---
**Engineering by Mahima Paseda** · [www.mahimapaseda.lk](https://www.mahimapaseda.lk)
