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

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(config.DATA_DIR, 'assets')));
app.get('/favicon.ico', (req, res) => res.status(204).end());

let autoSendBootTriggered = false;

// 1. System Status API
app.get('/api/status', async (req, res) => {
  const today = birthdayMatcher.getCurrentDateInTimezone();
  const waStatus = whatsappClient.getStatus();
  const sheetsTest = await googleSheets.testGoogleSheetsConnection();
  const userSettings = settings.loadSettings();

  res.json({
    appName: 'SheetPulse Birthday Wisher',
    version: '1.0.0',
    today,
    sheets: sheetsTest,
    whatsapp: waStatus,
    autoSendActive: userSettings.autoSendOnBoot && !autoSendBootTriggered,
    autoSendDelaySeconds: userSettings.autoSendDelaySeconds,
    config: {
      port: config.PORT,
      timezone: config.TIMEZONE,
      sheetName: config.SHEET_NAME,
      autoSendOnBoot: userSettings.autoSendOnBoot
    }
  });
});

// 2. Fetch Birthdays API
app.get('/api/birthdays', async (req, res) => {
  try {
    const sheetData = await googleSheets.fetchStudentsFromSheet();
    const processed = birthdayMatcher.processStudentRecords(sheetData.students);

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
        totalStudentsCelebratedToday: processed.today.length
      },
      today: processed.today,
      upcoming: processed.upcoming
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
    res.setHeader('Content-Disposition', `attachment; filename="SheetPulse_Sent_Log_${new Date().toISOString().split('T')[0]}.csv"`);
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
    res.json({ success: true, branch: newBranch });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/branches/:id', (req, res) => {
  try {
    const updated = settings.updateBranch(req.params.id, req.body);
    res.json({ success: true, branch: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/branches/:id', (req, res) => {
  try {
    const result = settings.deleteBranch(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/branches/:id/toggle', (req, res) => {
  try {
    const { enabled } = req.body;
    const updated = settings.toggleBranch(req.params.id, enabled);
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
          <p style="margin-top: 20px;"><a href="/#settings" style="color: #38bdf8; text-decoration: none; border: 1px solid #38bdf8; padding: 8px 16px; rounded: 8px;">Back to SheetPulse Settings</a></p>
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
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Sign-In Successful</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 32px; max-width: 420px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
            .icon { width: 56px; height: 56px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; color: #4ade80; font-size: 28px; margin-bottom: 16px; }
            h2 { margin: 0 0 8px 0; font-size: 20px; color: #fff; }
            p { margin: 4px 0; font-size: 13px; color: #94a3b8; }
            .btn { display: inline-block; margin-top: 20px; background: #16a34a; color: white; padding: 10px 20px; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h2>Google Sign-In Successful!</h2>
            <p>Signed in as: <strong style="color: #38bdf8;">${result.email}</strong></p>
            <p style="margin-top: 12px;">SheetPulse can now securely sync your private Google Sheet without needing any service account.</p>
            <a href="/" class="btn" onclick="if (window.opener) { window.opener.location.reload(); window.close(); }">Return to Dashboard</a>
          </div>
          <script>
            setTimeout(() => {
              if (window.opener) {
                window.opener.location.reload();
                window.close();
              } else {
                window.location.href = '/';
              }
            }, 2500);
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
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Send Wish to Single Student API
app.post('/api/send', async (req, res) => {
  try {
    const { studentId, phone, name, branch, age, template, branchCustomTemplate } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }

    const student = {
      id: studentId,
      name: name || 'Student',
      phone,
      branch: branch || 'College',
      age: age || null,
      isPhoneValid: true
    };

    const userSettings = settings.loadSettings();
    // Prioritize: explicitly passed template > branch custom template > global template
    const wishTemplate = template || branchCustomTemplate || userSettings.template;
    const sendResult = await whatsappClient.sendWishToStudent(student, wishTemplate);
    res.json(sendResult);
  } catch (err) {
    console.error('[API] Error in /api/send:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 6. Send Batch Wishes to All Pending Students API
app.post('/api/send-batch', async (req, res) => {
  try {
    const { template, branchFilter } = req.body;
    const sheetData = await googleSheets.fetchStudentsFromSheet();
    const processed = birthdayMatcher.processStudentRecords(sheetData.students);

    let pendingStudents = processed.today.filter(s => s.status === 'PENDING_TODAY');

    // Filter by branch if user selected a branch
    if (branchFilter && branchFilter !== 'ALL') {
      pendingStudents = pendingStudents.filter(s => 
        (s.branch && s.branch.toLowerCase() === branchFilter.toLowerCase()) || 
        (s.branchId === branchFilter)
      );
    }

    if (pendingStudents.length === 0) {
      return res.json({
        success: true,
        message: 'No pending birthday wishes to send today for selected branch.',
        total: 0,
        successful: 0,
        skipped: 0,
        failed: 0
      });
    }

    autoSendBootTriggered = true;
    const userSettings = settings.loadSettings();
    const wishTemplate = template || userSettings.template;
    const results = await whatsappClient.dispatchBatch(pendingStudents, wishTemplate);

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

// 8. Launch Server and Orchestrate Startup
const server = app.listen(config.PORT, async () => {
  const url = `http://localhost:${config.PORT}`;
  console.log(`=======================================================`);
  console.log(`  🎉 SheetPulse Birthday Wisher is RUNNING`);
  console.log(`  📍 Local Dashboard: ${url}`);
  console.log(`  🕒 Timezone: ${config.TIMEZONE}`);
  console.log(`  📊 Target Sheet: "${config.SHEET_NAME}"`);
  console.log(`=======================================================`);

  // Start WhatsApp client in the background
  try {
    whatsappClient.initializeWhatsAppClient();
  } catch (err) {
    console.error('[WhatsApp] Background initialization notice:', err.message);
  }

  // Periodic Midnight / Date-Change Scheduler (runs every 15 minutes)
  let lastCheckedDate = birthdayMatcher.getCurrentDateInTimezone().dateString;
  setInterval(async () => {
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
          const processed = birthdayMatcher.processStudentRecords(sheetData.students);
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
    setTimeout(async () => {
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

// Graceful termination handling
process.on('SIGINT', () => {
  console.log('\n[SheetPulse] Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n[SheetPulse] Received SIGTERM. Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = { app, server };

