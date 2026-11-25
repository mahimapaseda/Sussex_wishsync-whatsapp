# WishSync v1.2.3 - Universal Missed Birthday Carryover for Power-Off Days & Holidays

Release **v1.2.3** removes hardcoded Sunday-only carryover and introduces universal holiday and power-off recovery, ensuring no birthdays are ever missed when the computer is turned off.

### What's Changed

- **Universal Holiday & Machine Power-Off Catch-Up:**
  - Removed hardcoded Sunday-only carryover logic. Any day the machine was powered off or the application was closed is now treated as a non-working day.
  - Automatically evaluates all calendar dates between the `lastRunDate` (exclusive) and `today` (inclusive).
  - Unsent birthdays occurring during closures (weekday public holidays, poya days, long weekends, or vacations) automatically appear in the pending queue on startup.
- **Persistent Job Run Tracking:**
  - Added `lastRunDate` tracking in the persistent ledger.
  - `lastRunDate` updates automatically after message batches are dispatched or when no pending wishes remain for the evaluated period.
- **Strict Idempotency:**
  - Guaranteed deduplication preventing multiple sends if the computer or app is restarted several times on the same date.
  - Year-boundary safe matching ensuring students turning an age late in the previous year maintain correct historical ledger keys.
- **Refined Settings & UI Badging:**
  - Updated Settings toggle to *"Carry over missed birthdays from holidays / closed days"*.
  - Roster table displays explicit missed day badges (e.g., `Missed (Thursday)`, `Missed (Sunday)`) with date tooltips.

---

### Windows Desktop Packages

| Asset | Type | Architecture | Description |
|---|---|---|---|
| **WishSync Setup 1.2.3.exe** | **NSIS Setup Installer** | `x64` | Standard Windows setup installer with desktop and start menu shortcuts |
| **WishSync 1.2.3.exe** | **Standalone Portable** | `x64` | Standalone portable executable requiring zero installation |

---
**Engineering by Mahima Paseda** · [www.mahimapaseda.lk](https://www.mahimapaseda.lk)
