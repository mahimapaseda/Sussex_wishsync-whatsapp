# SheetPulse Birthday Wisher 🎂🎉

**SheetPulse** is an automated desktop application and Windows startup background service tailored for **Sussex Education Group**. It connects to your Google Sheet (`INQUIRY DETAILS 2026/27`), checks for student birthdays matching the current calendar day in `Asia/Colombo` time, displays an interactive dashboard, and sends personalized WhatsApp wishes using your local WhatsApp account.

---

## Features

- 🚀 **Windows Auto-Startup**: Launches silently on Windows boot via `launch-hidden.vbs` without intrusive black CMD windows.
- 📊 **Google Sheets Sync**: Dynamically locates student columns (Name, DOB, Phone, Branch) in tab `INQUIRY DETAILS 2026/27`. Includes local fallback mode if credentials are not yet configured.
- 📱 **Sri Lankan Phone Normalizer**: Auto-converts numbers (`07XXXXXXXX` → `947XXXXXXXX`, stripping spaces, symbols, and leading zeroes).
- 📅 **Timezone-Aware Birthday Matcher**: Accurately matches Day and Month in `Asia/Colombo` (`UTC+05:30`) and calculates the student's turning age. Supports `DD/MM/YYYY`, `YYYY-MM-DD`, `MM/DD/YYYY`, and serial dates.
- 🔒 **Zero Duplicate Wishes**: Uses a persistent JSON ledger (`data/sent_log.json`). Even if your laptop reboots multiple times in a single day, no student receives duplicate wishes.
- 💬 **Dual-Mode WhatsApp Dispatch**:
  - **Headless Automation**: Uses `whatsapp-web.js` with `LocalAuth` so you only scan the QR code once on setup.
  - **Windows Desktop Protocol Fallback**: Includes 1-click `whatsapp://send?phone=...` links for the native Windows WhatsApp app.
- 🛡️ **Anti-Ban Protection**: Enforces randomized 5–12 second jitter delays between consecutive messages.
- ⏱️ **10-Second Auto-Send Countdown**: Visual countdown on startup allowing you to review or cancel auto-dispatch before wishes are sent.
- 🎨 **Modern Glassmorphism Dashboard**: Runs locally at `http://localhost:3847` with live connection indicators, upcoming 7-day birthdays, sent history, and a message template editor.

---

## Directory Structure

```text
sheet-pulse-bday/
├── src/
│   ├── config/
│   │   └── env.js              # Environment settings & defaults
│   ├── services/
│   │   ├── googleSheets.js     # Google Sheets API client & fallback CSV loader
│   │   ├── birthdayMatcher.js  # Date parser, +94 normalizer & birthday matcher
│   │   ├── ledger.js           # sent_log.json duplicate prevention engine
│   │   └── whatsappClient.js   # whatsapp-web.js LocalAuth & anti-ban queue
│   ├── public/
│   │   ├── index.html          # Sleek Tailwind CSS dashboard UI
│   │   └── app.js              # Live state polling, countdown timer & actions
│   └── index.js                # Express orchestrator & browser launcher
├── scripts/
│   ├── register-startup.bat    # Adds app to Windows Startup folder
│   ├── unregister-startup.bat  # Removes app from Windows Startup folder
│   └── launch-hidden.vbs       # Runs node server silently on boot
├── data/
│   ├── sent_log.json           # Sent messages ledger (auto-generated)
│   └── sample_students.csv     # Offline/demo dataset
├── .env.example                # Configuration blueprint
├── .gitignore                  # Git exclusions
├── package.json
└── README.md
```

---

## Quick Start & Setup

### 1. Prerequisites
- **Node.js**: v20 or higher (v22 tested)
- A Google Cloud Service Account (for live Google Sheets sync)
- Personal WhatsApp on your mobile phone (for 1-time QR pairing)

### 2. Installation
Clone or navigate to the project directory and install dependencies:
```bash
npm install
```

### 3. Google Sheets Setup (Via UI Settings or .env)

You can link your Google Sheet in seconds directly through the **Settings** menu:

1. Click the **Settings** gear button in the top navigation bar of the dashboard (`http://localhost:3847`).
2. **Paste your Google Sheet link** directly into the `Google Sheet URL or Spreadsheet ID` field:
   `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
   *(SheetPulse will automatically extract the Spreadsheet ID for you!)*
3. Verify or edit the **Sheet Tab Name** (default: `INQUIRY DETAILS 2026/27`).
4. **Service Account Key**:
   - Either place your `credentials.json` in the root folder, OR paste the contents of your Service Account JSON directly into the settings textarea.
5. In your Google Sheet, click **Share**, and share the sheet as **Viewer** with your service account email (displayed inside the Settings modal).
6. Click **Test Connection Live** to immediately test the connection and see synced row counts, then click **Save & Apply Settings**.

*(Note: If no Google Sheet is linked, SheetPulse automatically operates in Demo mode using `data/sample_students.csv` so you can explore all features safely).*

### 4. Running the Application Manually
```bash
npm start
```
The application will launch and open `http://localhost:3847` automatically in your browser.

---

## One-Time WhatsApp Pairing

1. On first launch, look at the **WhatsApp** status button on the top right.
2. If it displays **Scan QR Needed**, click it to open the QR Code modal.
3. Open WhatsApp on your phone:
   - **Android**: Tap the 3 dots > **Linked Devices** > **Link a device**
   - **iOS**: Go to **Settings** > **Linked Devices** > **Link a device**
4. Scan the QR code on your laptop screen.
5. Once authenticated, the status turns **Ready** in green. The session is saved to `.wwebjs_auth/` and **persists across laptop reboots**.

---

## Windows Startup Registration

To have SheetPulse start automatically in the background every time you turn on your Windows laptop:

1. Right-click `scripts/register-startup.bat` and click **Run as administrator** (or double-click it).
2. It will create a silent shortcut in your Windows Startup directory:
   `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SheetPulse.lnk`
3. Now, on every boot:
   - `launch-hidden.vbs` runs silently without showing a black command line window.
   - The server boots up and synchronizes today's birthdays.
   - The browser opens `http://localhost:3847`.
   - If `AUTO_SEND_ON_BOOT=true`, a 10-second countdown gives you a chance to review or cancel before wishes are dispatched!

To remove it from startup at any time, run `scripts/unregister-startup.bat`.

---

## Message Template Customization

Click the **pen icon** in the top navigation bar to open the Message Template Editor. You can use any of the following placeholders:
- `{name}` : Full student name (e.g. *Kavindu Perera*)
- `{first_name}` : First name only (e.g. *Kavindu*)
- `{branch}` : Branch or campus (e.g. *College* or *Head Office*)
- `{age}` : Turning age on their birthday this year (e.g. *18*)

Example template:
```text
Dear {name}, on behalf of Sussex, we wish you a very Happy Birthday! 🎂🎉 May this special day bring you immense joy, happiness, and great success ahead!
```

---

## Testing

Run the automated test suite:
```bash
npm test
```
This tests:
- Sri Lankan phone normalizer (+94 formatting)
- Multi-format date parser (`DD/MM/YYYY`, `YYYY-MM-DD`, etc.)
- Template variable replacement
- Ledger duplicate prevention
- Google Sheets dynamic column mapping
- Age calculation and upcoming birthday categorization

