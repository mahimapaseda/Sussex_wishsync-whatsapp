// SheetPulse Birthday Wisher Frontend Client

let currentData = {
  today: [],
  upcoming: [],
  stats: {},
  todayInfo: {}
};

let currentStatus = {
  sheets: {},
  whatsapp: {},
  config: {}
};

let currentTemplate = '';
let countdownInterval = null;
let countdownRemaining = 10;
let isDispatching = false;

// DOM Elements
const headerDateDisplay = document.getElementById('headerDateDisplay');
const sheetsStatusText = document.getElementById('sheetsStatusText');
const waStatusText = document.getElementById('waStatusText');
const waStatusDot = document.getElementById('waStatusDot');
const whatsappStatusBtn = document.getElementById('whatsappStatusBtn');
const statTodayCount = document.getElementById('statTodayCount');
const statPendingCount = document.getElementById('statPendingCount');
const statSentCount = document.getElementById('statSentCount');
const statUpcomingCount = document.getElementById('statUpcomingCount');
const todayBadgeCount = document.getElementById('todayBadgeCount');
const upcomingBadgeCount = document.getElementById('upcomingBadgeCount');
const todayBirthdaysList = document.getElementById('todayBirthdaysList');
const upcomingBirthdaysList = document.getElementById('upcomingBirthdaysList');
const refreshDataBtn = document.getElementById('refreshDataBtn');
const sendAllBtn = document.getElementById('sendAllBtn');

// Countdown Banner Elements
const countdownBanner = document.getElementById('countdownBanner');
const countdownSecondsBadge = document.getElementById('countdownSecondsBadge');
const countdownTargetCount = document.getElementById('countdownTargetCount');
const countdownProgressBar = document.getElementById('countdownProgressBar');
const cancelCountdownBtn = document.getElementById('cancelCountdownBtn');
const dispatchNowBtn = document.getElementById('dispatchNowBtn');

// Ledger Elements
const toggleLedgerBtn = document.getElementById('toggleLedgerBtn');
const ledgerContainer = document.getElementById('ledgerContainer');
const ledgerList = document.getElementById('ledgerList');

// Settings Modal Elements
const settingsModal = document.getElementById('settingsModal');
const openSettingsModalBtn = document.getElementById('openSettingsModalBtn');
const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingSpreadsheetUrl = document.getElementById('settingSpreadsheetUrl');
const settingSheetName = document.getElementById('settingSheetName');
const settingExtractedId = document.getElementById('settingExtractedId');
const settingCredentialsJson = document.getElementById('settingCredentialsJson');
const credsStatusLabel = document.getElementById('credsStatusLabel');
const displayServiceEmail = document.getElementById('displayServiceEmail');
const testSheetConnBtn = document.getElementById('testSheetConnBtn');
const testConnResultMsg = document.getElementById('testConnResultMsg');
const settingsSheetStatusBadge = document.getElementById('settingsSheetStatusBadge');
const settingAutoSendOnBoot = document.getElementById('settingAutoSendOnBoot');
const settingCountdownSeconds = document.getElementById('settingCountdownSeconds');
const settingMinDelay = document.getElementById('settingMinDelay');
const settingMaxDelay = document.getElementById('settingMaxDelay');

// Google OAuth 2.0 Elements
const googleAuthStatusPill = document.getElementById('googleAuthStatusPill');
const googleUserDisplayTitle = document.getElementById('googleUserDisplayTitle');
const googleUserDisplaySubtitle = document.getElementById('googleUserDisplaySubtitle');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const googleSignOutBtn = document.getElementById('googleSignOutBtn');
const toggleOAuthFieldsBtn = document.getElementById('toggleOAuthFieldsBtn');
const oauthConfigFields = document.getElementById('oauthConfigFields');
const toggleOAuthChevron = document.getElementById('toggleOAuthChevron');
const settingGoogleClientId = document.getElementById('settingGoogleClientId');
const settingGoogleClientSecret = document.getElementById('settingGoogleClientSecret');
const toggleServiceAccountBtn = document.getElementById('toggleServiceAccountBtn');
const serviceAccountFields = document.getElementById('serviceAccountFields');
const qrModal = document.getElementById('qrModal');
const closeQrModalBtn = document.getElementById('closeQrModalBtn');
const doneQrModalBtn = document.getElementById('doneQrModalBtn');
const resetSessionBtn = document.getElementById('resetSessionBtn');
const qrImageElement = document.getElementById('qrImageElement');
const qrPlaceholder = document.getElementById('qrPlaceholder');

const templateModal = document.getElementById('templateModal');
const openTemplateModalBtn = document.getElementById('openTemplateModalBtn');
const closeTemplateModalBtn = document.getElementById('closeTemplateModalBtn');
const cancelTemplateBtn = document.getElementById('cancelTemplateBtn');
const saveTemplateBtn = document.getElementById('saveTemplateBtn');
const templateTextarea = document.getElementById('templateTextarea');
const templatePreviewText = document.getElementById('templatePreviewText');
const toastContainer = document.getElementById('toastContainer');

// Utility: Show Toast Notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600 border-emerald-500' :
             type === 'error' ? 'bg-red-600 border-red-500' :
             type === 'warning' ? 'bg-amber-600 border-amber-500' :
             'bg-slate-800 border-slate-700';

  toast.className = `p-3 rounded-xl text-white text-xs shadow-xl border flex items-center space-x-2 transition-all transform duration-300 opacity-0 translate-y-2 ${bg}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-info'} text-sm"></i>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Fetch Full Application State
async function fetchAllState() {
  try {
    const [statusRes, birthdaysRes, templateRes] = await Promise.all([
      fetch('/api/status').then(r => r.json()),
      fetch('/api/birthdays').then(r => r.json()),
      fetch('/api/template').then(r => r.json())
    ]);

    updateStatusUI(statusRes);
    updateBirthdaysUI(birthdaysRes);
    updateTemplateUI(templateRes);

    // Check if auto-send countdown should start
    if (statusRes.autoSendActive && !countdownInterval && birthdaysRes.stats.pendingTodayCount > 0) {
      startCountdown(statusRes.autoSendDelaySeconds || 10, birthdaysRes.stats.pendingTodayCount);
    }
  } catch (err) {
    console.error('Failed to load application state:', err);
    showToast('Failed to load application data', 'error');
  }
}

// Update Status Badges & Date
function updateStatusUI(data) {
  currentStatus = data;

  if (data.today) {
    headerDateDisplay.textContent = `${data.today.displayString} (${data.today.dateString})`;
  }

  // Google Sheets Status
  const sheets = data.sheets || {};
  if (sheets.status === 'CONNECTED') {
    sheetsStatusText.textContent = `Connected (${sheets.count || 0} rows)`;
    sheetsStatusText.className = 'text-emerald-400 font-semibold';
  } else if (sheets.status === 'NOT_CONFIGURED') {
    sheetsStatusText.textContent = 'Not Linked (Click Settings)';
    sheetsStatusText.className = 'text-slate-400 font-semibold';
    sheetsStatusText.title = 'Add your Google Sheet link in Settings';
  } else {
    sheetsStatusText.textContent = 'Disconnected / Error';
    sheetsStatusText.className = 'text-red-400 font-semibold';
    sheetsStatusText.title = sheets.message || sheets.warning || 'Connection error';
  }

  // WhatsApp Status
  const wa = data.whatsapp || {};
  if (wa.status === 'READY') {
    waStatusText.textContent = wa.user?.pushname ? `Ready (${wa.user.pushname})` : 'Ready';
    waStatusText.className = 'text-emerald-400 font-semibold';
    waStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
    // Hide QR modal if open
    qrModal.classList.add('hidden');
  } else if (wa.status === 'QR_READY') {
    waStatusText.textContent = 'Scan QR Needed';
    waStatusText.className = 'text-amber-400 font-semibold';
    waStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping';
    if (wa.qrDataUrl) {
      qrImageElement.src = wa.qrDataUrl;
      qrImageElement.classList.remove('hidden');
      qrPlaceholder.classList.add('hidden');
    }
  } else if (wa.status === 'AUTHENTICATED') {
    waStatusText.textContent = 'Authenticated';
    waStatusText.className = 'text-blue-400 font-semibold';
    waStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-blue-400';
  } else {
    waStatusText.textContent = wa.status || 'Initializing...';
    waStatusText.className = 'text-slate-400 font-semibold';
    waStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-500 animate-pulse';
  }
}

// Update Today's and Upcoming Birthdays List
function updateBirthdaysUI(data) {
  currentData = data;

  statTodayCount.textContent = data.stats?.totalStudentsCelebratedToday || data.today.length;
  statPendingCount.textContent = data.stats?.pendingTodayCount || 0;
  statSentCount.textContent = data.stats?.sentTodayCount || 0;
  statUpcomingCount.textContent = data.stats?.upcomingCount || 0;

  todayBadgeCount.textContent = data.today.length;
  upcomingBadgeCount.textContent = data.upcoming.length;

  sendAllBtn.disabled = data.stats?.pendingTodayCount === 0 || isDispatching;

  // Render Today's List
  if (data.today.length === 0) {
    todayBirthdaysList.innerHTML = `
      <div class="p-8 text-center text-slate-500">
        <i class="fa-solid fa-mug-hot text-2xl text-slate-600 mb-2"></i>
        <p class="text-sm font-medium">No student birthdays found for today.</p>
        <p class="text-xs text-slate-600 mt-1">Check the upcoming list below for birthdays happening this week.</p>
      </div>
    `;
  } else {
    todayBirthdaysList.innerHTML = data.today.map(student => {
      const isSent = student.status === 'SENT_TODAY';
      const branchBadge = student.branch.toLowerCase().includes('head') 
        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
        : 'bg-blue-500/10 text-blue-400 border-blue-500/20';

      const statusBadge = isSent
        ? '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><i class="fa-solid fa-check"></i> Wish Sent</span>'
        : '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><i class="fa-regular fa-clock"></i> Pending</span>';

      const initial = student.name ? student.name.charAt(0).toUpperCase() : '?';

      return `
        <div class="p-4 hover:bg-slate-800/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center space-x-3.5">
            <div class="h-10 w-10 rounded-full bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold text-sm shadow">
              ${initial}
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h4 class="text-sm font-bold text-white">${student.name}</h4>
                <span class="px-2 py-0.5 text-[10px] font-semibold rounded-md border ${branchBadge}">${student.branch}</span>
              </div>
              <div class="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                <span><i class="fa-solid fa-phone text-[10px] text-slate-500 mr-1"></i>${student.phoneDisplay}</span>
                <span>•</span>
                <span><i class="fa-solid fa-cake-candles text-[10px] text-slate-500 mr-1"></i>Turning <strong class="text-slate-200">${student.age || 'N/A'}</strong></span>
                <span>•</span>
                <span>DOB: ${student.dobFormatted}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-3 self-end md:self-center">
            ${statusBadge}

            <!-- Direct WhatsApp Web.js Dispatch Button -->
            <button 
              class="send-single-btn px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-700/80 hover:bg-emerald-600 hover:text-white text-slate-200 border border-slate-600/60 transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              data-id="${student.id}"
              data-phone="${student.phone}"
              data-name="${student.name}"
              ${isSent || isDispatching ? 'disabled' : ''}
              title="Send automated message via linked WhatsApp"
            >
              <i class="fa-brands fa-whatsapp text-emerald-400"></i>
              ${isSent ? 'Sent' : 'Send Wish'}
            </button>

            <!-- Native Desktop App URI Link Fallback -->
            <a 
              href="whatsapp://send?phone=${student.phone}&text=${encodeURIComponent(formatPreview(student))}"
              class="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 rounded-xl border border-slate-700/40 transition text-xs"
              title="Open directly in Windows WhatsApp Desktop App"
            >
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners to single send buttons
    document.querySelectorAll('.send-single-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const studentId = btn.getAttribute('data-id');
        const targetStudent = currentData.today.find(s => s.id === studentId);
        if (targetStudent) {
          await dispatchSingle(targetStudent, btn);
        }
      });
    });
  }

  // Render Upcoming List
  if (data.upcoming.length === 0) {
    upcomingBirthdaysList.innerHTML = `
      <div class="p-4 text-center text-slate-500 text-xs">
        No upcoming birthdays in the next 7 days.
      </div>
    `;
  } else {
    upcomingBirthdaysList.innerHTML = data.upcoming.map(student => {
      const inDaysText = student.daysUntil === 1 ? 'Tomorrow' : `In ${student.daysUntil} days`;
      return `
        <div class="p-3 px-6 hover:bg-slate-800/30 transition flex items-center justify-between text-xs">
          <div class="flex items-center space-x-3">
            <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span class="font-semibold text-slate-200">${student.name}</span>
            <span class="text-slate-500">(${student.branch})</span>
          </div>
          <div class="flex items-center space-x-4 text-slate-400">
            <span>DOB: ${student.dobFormatted} (Turning ${student.age || 'N/A'})</span>
            <span class="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 font-semibold border border-purple-500/20 text-[10px]">${inDaysText}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Update Message Template State & UI
function updateTemplateUI(res) {
  if (res.template) {
    currentTemplate = res.template;
    templateTextarea.value = currentTemplate;
    updateTemplatePreview();
  }
}

function formatPreview(student = null) {
  const sample = student || (currentData.today[0] || { name: 'Kavindu Perera', branch: 'College', age: 18 });
  const base = currentTemplate || 'Dear {name}, Happy Birthday! 🎂🎉';
  const firstName = sample.name ? sample.name.trim().split(' ')[0] : 'Student';
  return base
    .replace(/{name}/g, sample.name || 'Student')
    .replace(/{first_name}/g, firstName)
    .replace(/{branch}/g, sample.branch || 'Sussex')
    .replace(/{age}/g, sample.age ? `${sample.age}` : '18');
}

function updateTemplatePreview() {
  templatePreviewText.textContent = formatPreview();
}

// Auto-Send 10-Second Countdown
function startCountdown(seconds = 10, targetCount = 0) {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownRemaining = seconds;
  countdownTargetCount.textContent = targetCount;
  countdownBanner.classList.remove('hidden');

  function tick() {
    countdownSecondsBadge.textContent = `${countdownRemaining}s`;
    const percentage = (countdownRemaining / seconds) * 100;
    countdownProgressBar.style.width = `${percentage}%`;

    if (countdownRemaining <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      countdownBanner.classList.add('hidden');
      showToast('Countdown finished. Starting automatic dispatch...', 'info');
      dispatchBatchAll();
    }
    countdownRemaining--;
  }

  tick();
  countdownInterval = setInterval(tick, 1000);
}

function cancelCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    countdownBanner.classList.add('hidden');
    showToast('Auto-send countdown cancelled by user.', 'warning');
  }
}

// Send Single Student Wish
async function dispatchSingle(student, btnElement) {
  if (isDispatching) return;
  btnElement.disabled = true;
  btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Sending...';

  try {
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: student.id,
        phone: student.phone,
        name: student.name,
        branch: student.branch,
        age: student.age,
        template: currentTemplate
      })
    }).then(r => r.json());

    if (res.success) {
      showToast(`Birthday wish sent to ${student.name}! 🎂`, 'success');
      fetchAllState();
    } else {
      showToast(res.error || 'Failed to send message', 'error');
      btnElement.disabled = false;
      btnElement.innerHTML = '<i class="fa-brands fa-whatsapp text-emerald-400"></i> Retry';
    }
  } catch (err) {
    showToast(err.message, 'error');
    btnElement.disabled = false;
    btnElement.innerHTML = '<i class="fa-brands fa-whatsapp text-emerald-400"></i> Retry';
  }
}

// Send Batch Wishes (All Pending)
async function dispatchBatchAll() {
  const pendingStudents = currentData.today.filter(s => s.status === 'PENDING_TODAY');
  if (pendingStudents.length === 0) {
    showToast('No pending birthday wishes to send today.', 'info');
    return;
  }

  isDispatching = true;
  sendAllBtn.disabled = true;
  sendAllBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending Batch...';

  showToast(`Dispatching wishes to ${pendingStudents.length} student(s) with anti-ban pacing...`, 'info');

  try {
    const res = await fetch('/api/send-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: currentTemplate
      })
    }).then(r => r.json());

    if (res.success) {
      showToast(`Batch complete: ${res.successful} sent, ${res.skipped} skipped, ${res.failed} failed.`, 'success');
    } else {
      showToast(res.error || 'Batch dispatch encountered errors', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    isDispatching = false;
    sendAllBtn.disabled = false;
    sendAllBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send All Wishes Now';
    fetchAllState();
  }
}

// Helper: Extract Spreadsheet ID from URL
function extractSpreadsheetIdFromUrl(url) {
  if (!url) return '';
  const match = String(url).trim().match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match && match[1] ? match[1] : String(url).trim();
}

// Load Settings into Settings Modal
async function loadSettingsIntoModal() {
  try {
    const [settingsRes, authRes] = await Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/auth/google/status').then(r => r.json())
    ]);

    if (settingsRes.success && settingsRes.settings) {
      const s = settingsRes.settings;
      settingSpreadsheetUrl.value = s.spreadsheetUrl || (s.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${s.spreadsheetId}/edit` : '');
      settingExtractedId.value = s.spreadsheetId || extractSpreadsheetIdFromUrl(settingSpreadsheetUrl.value);
      settingSheetName.value = s.sheetName || 'INQUIRY DETAILS 2026/27';
      settingAutoSendOnBoot.checked = Boolean(s.autoSendOnBoot);
      settingCountdownSeconds.value = s.autoSendDelaySeconds || 10;
      settingMinDelay.value = Math.round((s.minDispatchDelayMs || 5000) / 1000);
      settingMaxDelay.value = Math.round((s.maxDispatchDelayMs || 12000) / 1000);
      settingGoogleClientId.value = s.googleClientId || '';
      settingGoogleClientSecret.value = s.googleClientSecret || '';

      if (s.credentialsConfigured) {
        credsStatusLabel.innerHTML = '<span class="text-emerald-400 font-semibold"><i class="fa-solid fa-check"></i> Configured</span>';
        displayServiceEmail.textContent = s.serviceAccountEmail || 'Configured via credentials.json';
      } else {
        credsStatusLabel.innerHTML = '<span class="text-amber-400 font-semibold"><i class="fa-solid fa-triangle-exclamation"></i> Not Configured</span>';
        displayServiceEmail.textContent = 'Paste JSON key below to configure';
      }

      testConnResultMsg.textContent = '';
    }

    // Update Google OAuth UI
    if (authRes.signedIn && authRes.userEmail) {
      googleAuthStatusPill.textContent = 'Signed In';
      googleAuthStatusPill.className = 'px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      googleUserDisplayTitle.textContent = authRes.userEmail;
      googleUserDisplaySubtitle.textContent = 'Active Google session. Private sheet access enabled.';
      googleSignInBtn.classList.add('hidden');
      googleSignOutBtn.classList.remove('hidden');
    } else {
      googleAuthStatusPill.textContent = 'Not Signed In';
      googleAuthStatusPill.className = 'px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700';
      googleUserDisplayTitle.textContent = 'Not Signed In to Google';
      googleUserDisplaySubtitle.textContent = 'Sign in with your Google account to access your private sheet without sharing.';
      googleSignInBtn.classList.remove('hidden');
      googleSignOutBtn.classList.add('hidden');
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
    showToast('Failed to load settings', 'error');
  }
}

// Save Settings Handler
async function saveSettingsFromModal() {
  saveSettingsBtn.disabled = true;
  saveSettingsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  const rawUrl = settingSpreadsheetUrl.value.trim();
  const sheetName = settingSheetName.value.trim() || 'INQUIRY DETAILS 2026/27';
  const credsJson = settingCredentialsJson.value.trim();
  const autoSend = settingAutoSendOnBoot.checked;
  const countdown = parseInt(settingCountdownSeconds.value, 10) || 10;
  const minDelay = (parseInt(settingMinDelay.value, 10) || 5) * 1000;
  const maxDelay = (parseInt(settingMaxDelay.value, 10) || 12) * 1000;
  const clientId = settingGoogleClientId.value.trim();
  const clientSecret = settingGoogleClientSecret.value.trim();

  try {
    const payload = {
      spreadsheetUrl: rawUrl,
      sheetName,
      autoSendOnBoot: autoSend,
      autoSendDelaySeconds: countdown,
      minDispatchDelayMs: minDelay,
      maxDispatchDelayMs: maxDelay,
      googleClientId: clientId,
      googleClientSecret: clientSecret
    };

    if (credsJson) {
      payload.credentialsJsonContent = credsJson;
    }

    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast('Settings saved successfully!', 'success');
      settingsModal.classList.add('hidden');
      settingCredentialsJson.value = ''; // Clear textarea for security
      fetchAllState();
    } else {
      showToast(res.error || 'Failed to save settings', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveSettingsBtn.disabled = false;
    saveSettingsBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save & Apply Settings';
  }
}

// Test Live Connection to Google Sheet
async function testGoogleSheetsLive() {
  testSheetConnBtn.disabled = true;
  testSheetConnBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing...';
  testConnResultMsg.className = 'text-xs text-amber-400';
  testConnResultMsg.textContent = 'Connecting to Google Sheets...';

  try {
    // Save current values first if changed
    const rawUrl = settingSpreadsheetUrl.value.trim();
    const sheetName = settingSheetName.value.trim();
    const credsJson = settingCredentialsJson.value.trim();

    if (rawUrl || sheetName || credsJson) {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetUrl: rawUrl,
          sheetName,
          ...(credsJson ? { credentialsJsonContent: credsJson } : {})
        })
      });
    }

    const res = await fetch('/api/sheets/test').then(r => r.json());
    if (res.status === 'CONNECTED') {
      testConnResultMsg.className = 'text-xs text-emerald-400 font-semibold';
      testConnResultMsg.innerHTML = `<i class="fa-solid fa-check"></i> Connected! Synced ${res.count} student rows.`;
      settingsSheetStatusBadge.textContent = 'Connected';
      settingsSheetStatusBadge.className = 'px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    } else if (res.status === 'NOT_CONFIGURED') {
      testConnResultMsg.className = 'text-xs text-amber-400';
      testConnResultMsg.innerHTML = `<i class="fa-solid fa-info-circle"></i> Please paste a Google Sheet URL above.`;
      settingsSheetStatusBadge.textContent = 'Not Linked';
      settingsSheetStatusBadge.className = 'px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-800 text-slate-400 border border-slate-700';
    } else {
      testConnResultMsg.className = 'text-xs text-red-400';
      testConnResultMsg.innerHTML = `<i class="fa-solid fa-xmark"></i> ${res.error || res.message || 'Connection failed'}`;
      settingsSheetStatusBadge.textContent = 'Error';
      settingsSheetStatusBadge.className = 'px-2 py-0.5 text-[10px] font-semibold rounded-md bg-red-500/10 text-red-400 border border-red-500/20';
    }
  } catch (err) {
    testConnResultMsg.className = 'text-xs text-red-400';
    testConnResultMsg.textContent = err.message;
  } finally {
    testSheetConnBtn.disabled = false;
    testSheetConnBtn.innerHTML = '<i class="fa-solid fa-plug text-emerald-400"></i> Test Connection Live';
  }
}

// Reset WhatsApp Session Handler
async function resetWhatsAppSession() {
  if (!confirm('Are you sure you want to unlink the current WhatsApp session and generate a new QR code?')) {
    return;
  }

  showToast('Resetting WhatsApp session...', 'info');
  try {
    const res = await fetch('/api/whatsapp/reset', { method: 'POST' }).then(r => r.json());
    if (res.success) {
      showToast(res.message || 'Session reset. Open QR modal to re-pair.', 'success');
      qrImageElement.classList.add('hidden');
      qrPlaceholder.classList.remove('hidden');
      fetchAllState();
    } else {
      showToast(res.error || 'Failed to reset session', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}
async function toggleLedger() {
  if (ledgerContainer.classList.contains('hidden')) {
    try {
      const records = await fetch('/api/ledger').then(r => r.json());
      if (!records || records.length === 0) {
        ledgerList.innerHTML = '<p class="text-slate-500 italic">No sent records found in sent_log.json yet.</p>';
      } else {
        ledgerList.innerHTML = records.map(rec => `
          <div class="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span class="text-emerald-400 font-semibold">[${rec.dateSent}]</span>
              <strong class="text-white">${rec.name}</strong> (${rec.phone})
              <span class="text-slate-500 text-[10px]">via ${rec.method}</span>
            </div>
            <span class="text-slate-400 text-[10px]">${new Date(rec.timestamp).toLocaleTimeString()}</span>
          </div>
        `).join('');
      }
      ledgerContainer.classList.remove('hidden');
      toggleLedgerBtn.textContent = 'Hide Details';
    } catch (err) {
      showToast('Failed to load ledger records', 'error');
    }
  } else {
    ledgerContainer.classList.add('hidden');
    toggleLedgerBtn.textContent = 'Show Details';
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  fetchAllState();

  // Periodic polling for status (QR or ready) every 4s
  setInterval(async () => {
    try {
      const statusRes = await fetch('/api/status').then(r => r.json());
      updateStatusUI(statusRes);
    } catch (e) {}
  }, 4000);

  // Sync Data
  refreshDataBtn.addEventListener('click', () => {
    showToast('Refreshing data from Google Sheets...', 'info');
    fetchAllState();
  });

  // Send All
  sendAllBtn.addEventListener('click', () => {
    cancelCountdown();
    dispatchBatchAll();
  });

  // Countdown Buttons
  cancelCountdownBtn.addEventListener('click', cancelCountdown);
  dispatchNowBtn.addEventListener('click', () => {
    cancelCountdown();
    dispatchBatchAll();
  });

  // Toggle Ledger
  toggleLedgerBtn.addEventListener('click', toggleLedger);

  // Settings Modal Triggers
  openSettingsModalBtn.addEventListener('click', () => {
    loadSettingsIntoModal();
    settingsModal.classList.remove('hidden');
  });
  closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
  cancelSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
  saveSettingsBtn.addEventListener('click', saveSettingsFromModal);
  testSheetConnBtn.addEventListener('click', testGoogleSheetsLive);

  // Auto-extract Spreadsheet ID on URL typing or pasting
  settingSpreadsheetUrl.addEventListener('input', () => {
    settingExtractedId.value = extractSpreadsheetIdFromUrl(settingSpreadsheetUrl.value);
  });

  // Toggle OAuth App Configuration
  if (toggleOAuthFieldsBtn) {
    toggleOAuthFieldsBtn.addEventListener('click', () => {
      oauthConfigFields.classList.toggle('hidden');
      toggleOAuthChevron.classList.toggle('fa-chevron-up');
      toggleOAuthChevron.classList.toggle('fa-chevron-down');
    });
  }

  // Toggle Service Account Credentials
  if (toggleServiceAccountBtn) {
    toggleServiceAccountBtn.addEventListener('click', () => {
      serviceAccountFields.classList.toggle('hidden');
    });
  }

  // Google Sign Out Button
  if (googleSignOutBtn) {
    googleSignOutBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to sign out from your Google Account?')) return;
      try {
        const res = await fetch('/api/auth/google/signout', { method: 'POST' }).then(r => r.json());
        if (res.success) {
          showToast('Signed out of Google account.', 'info');
          loadSettingsIntoModal();
          fetchAllState();
        }
      } catch (e) {
        showToast('Error signing out', 'error');
      }
    });
  }

  // QR Modal Buttons
  if (doneQrModalBtn) {
    doneQrModalBtn.addEventListener('click', () => qrModal.classList.add('hidden'));
  }
  if (resetSessionBtn) {
    resetSessionBtn.addEventListener('click', resetWhatsAppSession);
  }
  whatsappStatusBtn.addEventListener('click', () => {
    if (currentStatus.whatsapp?.status === 'QR_READY') {
      qrModal.classList.remove('hidden');
    } else if (currentStatus.whatsapp?.status === 'READY') {
      showToast('WhatsApp session is active and ready!', 'success');
    } else {
      showToast(`WhatsApp status: ${currentStatus.whatsapp?.status || 'Starting...'}`, 'info');
    }
  });
  closeQrModalBtn.addEventListener('click', () => qrModal.classList.add('hidden'));

  // Template Modal
  openTemplateModalBtn.addEventListener('click', () => {
    templateTextarea.value = currentTemplate;
    updateTemplatePreview();
    templateModal.classList.remove('hidden');
  });
  closeTemplateModalBtn.addEventListener('click', () => templateModal.classList.add('hidden'));
  cancelTemplateBtn.addEventListener('click', () => templateModal.classList.add('hidden'));

  templateTextarea.addEventListener('input', () => {
    currentTemplate = templateTextarea.value;
    updateTemplatePreview();
  });

  document.querySelectorAll('.insert-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.getAttribute('data-tag');
      templateTextarea.value += ` ${tag}`;
      currentTemplate = templateTextarea.value;
      updateTemplatePreview();
    });
  });

  saveTemplateBtn.addEventListener('click', async () => {
    const newTemplate = templateTextarea.value.trim();
    if (!newTemplate) {
      showToast('Template cannot be empty', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: newTemplate })
      }).then(r => r.json());

      if (res.success) {
        currentTemplate = newTemplate;
        templateModal.classList.add('hidden');
        showToast('Birthday message template saved successfully!', 'success');
      }
    } catch (err) {
      showToast('Failed to save template', 'error');
    }
  });
});

