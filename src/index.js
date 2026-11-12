const express = require('express');
const cors = require('cors');
const path = require('path');
const open = require('open');
const config = require('./config/env');
const googleSheets = require('./services/googleSheets');
const googleAuth = require('./services/googleAuth');
const birthdayMatcher = require('./services/birthdayMatcher');
const ledger = require('./services/ledger');
const settings = require('./services/settings');
const whatsappClient = require('./services/whatsappClient');
const pkg = require('../package.json');

// Catch any unhandled Puppeteer navigation/disconnection rejections without crashing server
process.on('unhandledRejection', (reason) => {
  console.warn('[Process] Handled unhandled rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.warn('[Process] Handled uncaught exception:', err?.message || err);
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(config.DATA_DIR, 'assets')));
app.get('/favicon.ico', (req, res) => res.status(204).end());

let autoSendBootTriggered = false;
let isShuttingDown = false;
let initTimer = null;
let schedulerInterval = null;
let browserOpenTimer = null;
let backendShutdownPromise = null;

// 1a. Dedicated WhatsApp Status API (Fast, zero external API overhead for polling)
app.get('/api/whatsapp/status', (req, res) => {
  res.json(whatsappClient.getStatus());
});

// 1b. Full System Status API
app.get('/api/status', async (req, res) => {
  const today = birthdayMatcher.getCurrentDateInTimezone();
  const waStatus = whatsappClient.getStatus();
  const sheetsTest = await googleSheets.testGoogleSheetsConnection();
  const userSettings = settings.loadSettings();

  res.json({
    appName: 'WishSync',
    version: pkg.version || '1.0.1',
    today,
    sheets: sheetsTest,
    whatsapp: waStatus,
    autoSendActive: userSettings.autoSendOnBoot && !autoSendBootTriggered,
    autoSendDelaySeconds: userSettings.autoSendDelaySeconds,
    config: {
      port: config.PORT,
      timezone: config.TIMEZONE,
      sheetName: config.SHEET_NAME,
      autoSendOnBoot: userSettings.autoSendOnBoot,
      sundayCatchUpOnMonday: userSettings.sundayCatchUpOnMonday !== false
    }
  });
});

// 2. Fetch Birthdays API
app.get('/api/birthdays', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === '1';
    const userSettings = settings.loadSettings();
    const sheetData = await googleSheets.fetchStudentsFromSheet(forceRefresh);
    const processed = birthdayMatcher.processStudentRecords(sheetData.students, {
      includeSundayCatchUp: userSettings.sundayCatchUpOnMonday !== false
    });
    const sentTodayLedger = ledger.getSentRecordsByDate(processed.todayInfo.dateString).map(r => ({
      phone: r.phone,
      name: r.name,
      branch: r.branch || null,
      branchId: r.branchId || null,
      dateSent: r.dateSent
    }));
    const deliveredPhones = new Set(
      processed.today.filter(s => s.status === 'SENT_TODAY' && s.phone).map(s => s.phone)
    );
    sentTodayLedger.forEach(r => {
      if (r.phone) deliveredPhones.add(r.phone);
    });

    res.json({
      success: true,
      source: sheetData.source,
      sheetName: sheetData.sheetName || 'Multiple Branches',
      status: sheetData.status,
      warning: sheetData.warning || null,
      authType: sheetData.authType || null,
      totalBranches: sheetData.totalBranches || 0,
      connectedBranches: sheetData.connectedBranches || 0,
      branchesReport: sheetData.branchesReport || [],
      todayInfo: processed.todayInfo,
      stats: {
        ...processed.stats,
        deliveredTodayTotal: deliveredPhones.size,
        totalStudentsCelebratedToday: processed.today.length
      },
      today: processed.today,
      upcoming: processed.upcoming,
      sentTodayLedger
    });
  } catch (err) {
    console.error('[API] Error retrieving birthdays:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 3. Sent Ledger API
app.get('/api/ledger', (req, res) => {
  try {
    const records = ledger.getAllSentRecords();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3a. Clear a single sent ledger record (allows re-queuing as Pending)
app.delete('/api/ledger/:phone/:year', (req, res) => {
  try {
    const cleared = ledger.clearSentRecord(req.params.phone, req.params.year);
    if (!cleared) {
      return res.status(404).json({ success: false, error: 'Record not found in delivery log.' });
    }
    googleSheets.clearCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3b. Export Ledger as CSV
app.get('/api/ledger/export', (req, res) => {
  try {
    const records = ledger.getAllSentRecords();
    const csvHeader = 'Phone,Name,Year,Date Sent,Timestamp,Status,Method,Message Preview\n';
    const csvRows = records.map(r => {
      const cleanMsg = (r.messagePreview || '').replace(/"/g, '""');
      return `"${r.phone}","${r.name || ''}",${r.year},"${r.dateSent}","${r.timestamp}","${r.status}","${r.method}","${cleanMsg}"`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="WishSync_Sent_Log_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvHeader + csvRows);
  } catch (err) {
    res.status(500).send(`Error exporting CSV: ${err.message}`);
  }
});

// 4. Settings & Message Template API (Persistent via settings.json)
app.get('/api/settings', (req, res) => {
  const current = settings.loadSettings();
  res.json({ success: true, settings: current });
});

app.post('/api/settings', (req, res) => {
  try {
    const updated = settings.updateSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4-Branch. Multi-Branch Sheets Management CRUD Endpoints
app.get('/api/branches', (req, res) => {
  const branches = settings.getBranches();
  res.json({ success: true, branches });
});

app.post('/api/branches', (req, res) => {
  try {
    const newBranch = settings.addBranch(req.body);
    googleSheets.clearCache();
    res.json({ success: true, branch: newBranch });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/branches/:id', (req, res) => {
  try {
    const updated = settings.updateBranch(req.params.id, req.body);
    googleSheets.clearCache();
    res.json({ success: true, branch: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/branches/:id', (req, res) => {
  try {
    const result = settings.deleteBranch(req.params.id);
    googleSheets.clearCache();
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/branches/:id/toggle', (req, res) => {
  try {
    const { enabled } = req.body;
    const updated = settings.toggleBranch(req.params.id, enabled);
    googleSheets.clearCache();
    res.json({ success: true, branch: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/branches/:id/test', async (req, res) => {
  try {
    const result = await googleSheets.testGoogleSheetsConnection(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/template', (req, res) => {
  const current = settings.loadSettings();
  res.json({
    template: current.template,
    birthdayImage: current.birthdayImage || null
  });
});

app.post('/api/template', (req, res) => {
  const { template } = req.body;
  if (!template || typeof template !== 'string') {
    return res.status(400).json({ success: false, error: 'Valid template string is required.' });
  }
  const updated = settings.updateSettings({ template: template.trim() });
  res.json({ success: true, template: updated.template });
});

// 4b. Reset WhatsApp Session API
app.post('/api/whatsapp/reset', async (req, res) => {
  try {
    const result = await whatsappClient.resetSession();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4c. Google OAuth 2.0 (Sign in with Google) Endpoints
app.get('/auth/google', (req, res) => {
  try {
    const authUrl = googleAuth.getAuthUrl();
    res.redirect(authUrl);
  } catch (err) {
    res.status(400).send(`
      <html>
        <body style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 40px; text-align: center;">
          <h2 style="color: #f87171;">Google Sign-In Configuration Required</h2>
          <p>${err.message}</p>
          <p style="margin-top: 20px;"><a href="/#settings" style="color: #1B365D; text-decoration: none; border: 1px solid #CBD5E1; padding: 8px 16px; border-radius: 6px; font-weight: 600;">Back to WishSync Settings</a></p>
        </body>
      </html>
    `);
  }
});

app.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.status(400).send(`Google Login Failed: ${error}`);
  }
  if (!code) {
    return res.status(400).send('Authorization code missing.');
  }

  try {
    const result = await googleAuth.handleCallback(code);
    googleSheets.clearCache();

    if (result.missingSheetsScope) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Google Sheets Permission Required — WishSync</title></head>
          <body style="font-family: 'Segoe UI', system-ui, sans-serif; background: #F4F5F7; color: #111827; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="background: #FFFFFF; border: 1px solid #FECACA; border-radius: 10px; padding: 32px; max-width: 460px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
              <h2 style="margin: 0 0 10px 0; color: #B91C1C; font-size: 18px;">Google Sheets Permission Not Checked</h2>
              <p style="font-size: 13px; color: #374151; line-height: 1.5;">You signed in as <strong>${result.email}</strong>, but did not tick the <strong>"See all your Google Spreadsheets"</strong> permission checkbox on the Google consent screen.</p>
              <p style="font-size: 13px; color: #374151; line-height: 1.5; margin-top: 8px;">Please click the button below and make sure <strong>all permission checkboxes are ticked</strong> before continuing.</p>
              <a href="/auth/google" style="display: inline-block; margin-top: 18px; background: #1B365D; color: #FFFFFF; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">Sign in Again &amp; Grant Permission</a>
            </div>
          </body>
        </html>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Sign-In Successful — WishSync</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #F4F5F7; color: #111827; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; padding: 32px; max-width: 420px; text-align: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06); }
            .icon { width: 48px; height: 48px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: #15803D; font-size: 22px; font-weight: 700; margin-bottom: 16px; }
            h2 { margin: 0 0 8px 0; font-size: 18px; color: #111827; font-weight: 700; }
            p { margin: 6px 0; font-size: 13px; color: #4B5563; line-height: 1.5; }
            .email-badge { display: inline-block; background: #F3F4F6; border: 1px solid #D1D5DB; color: #1B365D; font-weight: 600; padding: 4px 12px; border-radius: 6px; margin: 10px 0; font-size: 13px; }
            .btn { display: inline-block; margin-top: 20px; background: #1B365D; color: #FFFFFF; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; transition: background 0.15s; }
            .btn:hover { background: #25477A; }
            .countdown { font-size: 12px; color: #6B7280; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h2>Google Account Connected</h2>
            <div><span class="email-badge">${result.email}</span></div>
            <p>Your Google account is now authorized. Returning you to the WishSync application.</p>
            <a href="wishsync://auth-success" class="btn" id="openAppBtn" onclick="returnToApp()">Open WishSync</a>
            <div class="countdown" id="cd">Switching back to WishSync automatically...</div>
          </div>
          <script>
            function returnToApp() {
              // Trigger custom protocol to bring WishSync Electron software to foreground
              window.location.href = 'wishsync://auth-success';
              // If opened via window.open, notify and close
              if (window.opener) {
                try {
                  window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', email: '${result.email}' }, '*');
                  window.opener.location.reload();
                } catch (e) {}
                setTimeout(() => window.close(), 600);
              }
            }

            // Automatically attempt to bring app to front and close browser tab
            setTimeout(returnToApp, 1000);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`Error completing Google Sign-In: ${err.message}`);
  }
});

app.get('/api/auth/google/status', (req, res) => {
  const status = googleAuth.getAuthStatus();
  res.json({ success: true, ...status });
});

app.post('/api/auth/google/signout', (req, res) => {
  try {
    const result = googleAuth.signOut();
    googleSheets.clearCache();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Send Wish to Single Student / Manual Phone Dispatch API
app.post('/api/send', async (req, res) => {
  try {
    const { studentId, phone, name, branch, age, template, branchCustomTemplate } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }

    const phoneSanitized = birthdayMatcher.sanitizePhoneNumber(phone);
    if (!phoneSanitized.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid phone number: "${phone}". Please enter a valid 10-digit Sri Lankan mobile number (e.g. 07XXXXXXXX) or international number.`
      });
    }

    const userSettings = settings.loadSettings();
    const resolvedBranchName = (branch && branch.trim()) ? branch.trim() : 'Sussex College Network';
    const matchedBranch = (userSettings.branches || []).find(
      b => (b.name || '').trim().toLowerCase() === resolvedBranchName.toLowerCase()
    );

    const student = {
      id: studentId || `manual_${Date.now()}`,
      name: (name && name.trim()) ? name.trim() : 'Little Sunshine',
      phone: phoneSanitized.sanitized,
      phoneRaw: phone,
      phoneDisplay: phoneSanitized.formattedDisplay,
      branch: resolvedBranchName,
      branchId: matchedBranch ? matchedBranch.id : null,
      branchCustomTemplate: branchCustomTemplate || null,
      age: age || null,
      isPhoneValid: true
    };
    // Prioritize: explicitly passed template > branch custom template > global template
    const wishTemplate = template || branchCustomTemplate || userSettings.template;
    const forceResend = req.body.force !== undefined ? Boolean(req.body.force) : true;
    const sendResult = await whatsappClient.sendWishToStudent(student, wishTemplate, forceResend);
    res.json(sendResult);
  } catch (err) {
    console.error('[API] Error in /api/send:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 6. Send Batch Wishes to Today's Students API (Pending, or Force Resend)
app.post('/api/send-batch', async (req, res) => {
  try {
    const { template, branchFilter, force } = req.body;
    const forceResend = Boolean(force);
    const userSettings = settings.loadSettings();
    const sheetData = await googleSheets.fetchStudentsFromSheet();
    const processed = birthdayMatcher.processStudentRecords(sheetData.students, {
      includeSundayCatchUp: userSettings.sundayCatchUpOnMonday !== false
    });

    let targetStudents = forceResend
      ? [...processed.today]
      : processed.today.filter(s => s.status === 'PENDING_TODAY');

    // Filter by branch if user selected a branch
    if (branchFilter && branchFilter !== 'ALL') {
      const normalize = str => (str || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
      const normFilter = normalize(branchFilter);
      const branchMeta = settings.getBranches().find(b => b.id === branchFilter);
      const normBranchName = branchMeta ? normalize(branchMeta.name) : normFilter;

      targetStudents = targetStudents.filter(s => {
        if (s.branchId && s.branchId === branchFilter) return true;
        if (s.id && s.id.startsWith(branchFilter)) return true;
        const normStudentBranch = normalize(s.branch);
        return normStudentBranch === normBranchName ||
          (normStudentBranch && normBranchName && (normStudentBranch.includes(normBranchName) || normBranchName.includes(normStudentBranch)));
      });
    }

    if (targetStudents.length === 0) {
      return res.json({
        success: true,
        message: 'No eligible birthday wishes to send today for selected branch.',
        total: 0,
        successful: 0,
        skipped: 0,
        failed: 0,
        details: []
      });
    }

    autoSendBootTriggered = true;
    const wishTemplate = template || userSettings.template;
    const results = await whatsappClient.dispatchBatch(targetStudents, wishTemplate, null, forceResend);

    res.json({
      success: true,
      ...results
    });
  } catch (err) {
    console.error('[API] Error in /api/send-batch:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 7. Test Google Sheets Connection API
app.get('/api/sheets/test', async (req, res) => {
  const result = await googleSheets.testGoogleSheetsConnection();
  res.json(result);
});

const isStartupBoot = process.env.STARTUP_BOOT === 'true';

/**
 * Sleep helper for startup pacing on low-spec PCs.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handles headless auto-dispatch when Windows boots with WishSync in system tray (--hidden).
 */
async function runHeadlessBootAutoDispatch() {
  if (autoSendBootTriggered) return;

  const userSettings = settings.loadSettings();
  if (!userSettings.autoSendOnBoot) return;

  console.log('[Startup] Boot auto-dispatch monitor active (waiting for WhatsApp readiness)...');
  const maxAttempts = 48; // up to ~4 minutes
  for (let i = 0; i < maxAttempts; i++) {
    if (autoSendBootTriggered || isShuttingDown) return;
    const waStatus = whatsappClient.getStatus();
    if (waStatus.status === 'READY') {
      const delaySec = parseInt(userSettings.autoSendDelaySeconds, 10) || 10;
      console.log(`[Startup] WhatsApp ready. Waiting ${delaySec}s before checking birthday roster...`);
      await sleep(delaySec * 1000);
      if (autoSendBootTriggered || isShuttingDown) return;

      try {
        const sheetData = await googleSheets.fetchStudentsFromSheet(true);
        const processed = birthdayMatcher.processStudentRecords(sheetData.students, {
          includeSundayCatchUp: userSettings.sundayCatchUpOnMonday !== false
        });
        const pending = processed.today.filter(s => s.status === 'PENDING_TODAY');

        autoSendBootTriggered = true;
        if (pending.length > 0) {
          console.log(`[Startup] Found ${pending.length} pending birthday(s). Starting automatic background dispatch...`);
          const result = await whatsappClient.dispatchBatch(pending, userSettings.template);
          global.wishSyncTrayNotify?.(
            'WishSync Startup Dispatch Complete',
            `Sent ${result.successful} wish(es), ${result.skipped} skipped, ${result.failed} failed.`
          );
        } else {
          console.log('[Startup] No pending birthdays found today.');
        }
      } catch (err) {
        console.error('[Startup] Headless boot dispatch error:', err.message);
      }
      return;
    }
    await sleep(5000);
  }
}

// 8. Launch Server and Orchestrate Startup
const server = app.listen(config.PORT, async () => {
  const url = `http://localhost:${config.PORT}`;
  console.log(`=======================================================`);
  console.log(`  WishSync is running`);
  console.log(`  Local Dashboard: ${url}`);
  console.log(`  Timezone: ${config.TIMEZONE}`);
  console.log(`  Target Sheet: "${config.SHEET_NAME}"`);
  console.log(`=======================================================`);

  // Stagger headless Chromium startup when booting with Windows so 4GB RAM PCs stay responsive
  const initDelayMs = isStartupBoot ? 15000 : 0;
  if (initDelayMs > 0) {
    console.log(`[Startup] Windows boot mode detected — delaying WhatsApp engine ${initDelayMs / 1000}s to reduce boot load...`);
  }

  initTimer = setTimeout(() => {
    if (isShuttingDown) return;
    try {
      whatsappClient.initializeWhatsAppClient();
      if (isStartupBoot) {
        runHeadlessBootAutoDispatch().catch(err => {
          console.error('[Startup] Auto-dispatch monitor error:', err.message);
        });
      }
    } catch (err) {
      console.error('[WhatsApp] Background initialization notice:', err.message);
    }
  }, initDelayMs);

  // Periodic Midnight / Date-Change Scheduler (runs every 15 minutes)
  let lastCheckedDate = birthdayMatcher.getCurrentDateInTimezone().dateString;
  schedulerInterval = setInterval(async () => {
    if (isShuttingDown) return;
    try {
      const currentDate = birthdayMatcher.getCurrentDateInTimezone().dateString;
      if (currentDate !== lastCheckedDate) {
        console.log(`[Scheduler] Midnight rollover detected! New date: ${currentDate} (was ${lastCheckedDate})`);
        lastCheckedDate = currentDate;
        autoSendBootTriggered = false; // Allow new day's auto-send

        const userSettings = settings.loadSettings();
        if (userSettings.autoSendOnBoot) {
          console.log('[Scheduler] Automatically checking birthdays for the new day...');
          const sheetData = await googleSheets.fetchStudentsFromSheet();
          const processed = birthdayMatcher.processStudentRecords(sheetData.students, {
            includeSundayCatchUp: userSettings.sundayCatchUpOnMonday !== false
          });
          const pending = processed.today.filter(s => s.status === 'PENDING_TODAY');
          if (pending.length > 0) {
            console.log(`[Scheduler] Found ${pending.length} birthdays today. Dispatching with anti-ban delay...`);
            whatsappClient.dispatchBatch(pending, userSettings.template).catch(e => {
              console.error('[Scheduler] Auto-dispatch error:', e.message);
            });
          }
        }
      }
    } catch (schedErr) {
      console.error('[Scheduler] Error during periodic date check:', schedErr.message);
    }
  }, 15 * 60 * 1000);

  // Auto-launch Dashboard in browser if enabled
  if (config.OPEN_BROWSER_ON_BOOT) {
    browserOpenTimer = setTimeout(async () => {
      if (isShuttingDown) return;
      try {
        console.log(`[Startup] Opening dashboard in browser: ${url}`);
        // Attempt to open in application mode if Chrome/Edge is available, or default browser
        await open(url, { app: { name: open.apps.chrome || 'chrome', arguments: [`--app=${url}`] } }).catch(async () => {
          await open(url);
        });
      } catch (err) {
        console.log(`[Startup] Please open ${url} in your browser.`);
      }
    }, 1500);
  }
});

/**
 * Stops all background timers, HTTP connections, and WhatsApp Puppeteer browser processes.
 */
async function shutdownBackend() {
  if (backendShutdownPromise) return backendShutdownPromise;

  backendShutdownPromise = (async () => {
    isShuttingDown = true;
    autoSendBootTriggered = true;

    if (initTimer) {
      clearTimeout(initTimer);
      initTimer = null;
    }
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }
    if (browserOpenTimer) {
      clearTimeout(browserOpenTimer);
      browserOpenTimer = null;
    }

    await whatsappClient.shutdown().catch(() => {});

    await new Promise((resolve) => {
      if (!server || !server.listening) return resolve();
      const closeTimer = setTimeout(resolve, 1000);
      try {
        if (typeof server.closeAllConnections === 'function') {
          server.closeAllConnections();
        }
        server.close(() => {
          clearTimeout(closeTimer);
          resolve();
        });
      } catch (e) {
        clearTimeout(closeTimer);
        resolve();
      }
    });
  })();

  return backendShutdownPromise;
}

// Graceful termination handling
process.on('SIGINT', () => {
  console.log('\n[WishSync] Shutting down gracefully...');
  shutdownBackend().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('\n[WishSync] Received SIGTERM. Shutting down...');
  shutdownBackend().finally(() => process.exit(0));
});

module.exports = { app, server, shutdownBackend };

