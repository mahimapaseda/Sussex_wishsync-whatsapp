const express = require('express');
const cors = require('cors');
const path = require('path');
const open = require('open');
const config = require('./config/env');
const googleSheets = require('./services/googleSheets');
const birthdayMatcher = require('./services/birthdayMatcher');
const ledger = require('./services/ledger');
const settings = require('./services/settings');
const whatsappClient = require('./services/whatsappClient');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
      sheetName: sheetData.sheetName,
      status: sheetData.status,
      warning: sheetData.warning || null,
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

app.get('/api/template', (req, res) => {
  const current = settings.loadSettings();
  res.json({ template: current.template });
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

// 5. Send Wish to Single Student API
app.post('/api/send', async (req, res) => {
  try {
    const { studentId, phone, name, branch, age, template } = req.body;
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
    const wishTemplate = template || userSettings.template;
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
    const { template } = req.body;
    const sheetData = await googleSheets.fetchStudentsFromSheet();
    const processed = birthdayMatcher.processStudentRecords(sheetData.students);

    const pendingStudents = processed.today.filter(s => s.status === 'PENDING_TODAY');

    if (pendingStudents.length === 0) {
      return res.json({
        success: true,
        message: 'No pending birthday wishes to send today.',
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

