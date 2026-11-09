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

let currentBranches = [];
let selectedBranchFilter = 'ALL';
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

// Branch Management Modal Elements
const branchesModal = document.getElementById('branchesModal');
const openBranchesModalBtn = document.getElementById('openBranchesModalBtn');
const closeBranchesModalBtn = document.getElementById('closeBranchesModalBtn');
const closeBranchesFooterBtn = document.getElementById('closeBranchesFooterBtn');
const addNewBranchBtn = document.getElementById('addNewBranchBtn');
const branchFormDrawer = document.getElementById('branchFormDrawer');
const branchFormTitle = document.getElementById('branchFormTitle');
const cancelBranchFormBtn = document.getElementById('cancelBranchFormBtn');
const saveBranchBtn = document.getElementById('saveBranchBtn');
const editBranchId = document.getElementById('editBranchId');
const branchInputName = document.getElementById('branchInputName');
const branchInputTab = document.getElementById('branchInputTab');
const branchInputUrl = document.getElementById('branchInputUrl');
const branchInputTemplate = document.getElementById('branchInputTemplate');
const branchesListContainer = document.getElementById('branchesListContainer');
const navBranchCountBadge = document.getElementById('navBranchCountBadge');
const branchFilterPills = document.getElementById('branchFilterPills');
const filterAllCount = document.getElementById('filterAllCount');
const settingsModal = document.getElementById('settingsModal');
const openSettingsModalBtn = document.getElementById('openSettingsModalBtn');
const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingCredentialsJson = document.getElementById('settingCredentialsJson');
const credsStatusLabel = document.getElementById('credsStatusLabel');
const displayServiceEmail = document.getElementById('displayServiceEmail');
const settingsOpenBranchesBtn = document.getElementById('settingsOpenBranchesBtn');
const settingsBranchCountBadge = document.getElementById('settingsBranchCountBadge');
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
    const [statusRes, birthdaysRes, templateRes, branchesRes] = await Promise.all([
      fetch('/api/status').then(r => r.json()),
      fetch('/api/birthdays').then(r => r.json()),
      fetch('/api/template').then(r => r.json()),
      fetch('/api/branches').then(r => r.json())
    ]);

    if (branchesRes.success && Array.isArray(branchesRes.branches)) {
      currentBranches = branchesRes.branches;
      navBranchCountBadge.textContent = currentBranches.length;
      updateBranchFilterPills();
    }

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

// Update Branch Filter Pills on Dashboard
function updateBranchFilterPills() {
  if (!branchFilterPills) return;

  const totalToday = currentData.today ? currentData.today.length : 0;
  if (filterAllCount) filterAllCount.textContent = totalToday;

  const branchPillsHtml = [
    `<button type="button" class="branch-filter-btn px-3 py-1 rounded-lg text-xs font-semibold ${selectedBranchFilter === 'ALL' ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}" data-branch="ALL">All Branches (${totalToday})</button>`
  ];

  currentBranches.forEach(b => {
    // Count today's birthdays for this branch
    const branchCount = (currentData.today || []).filter(s => 
      (s.branch && s.branch.toLowerCase() === b.name.toLowerCase()) || (s.branchId === b.id)
    ).length;

    const isActive = selectedBranchFilter === b.id || selectedBranchFilter === b.name;
    const btnClass = isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700';

    branchPillsHtml.push(`
      <button type="button" class="branch-filter-btn px-3 py-1 rounded-lg text-xs font-semibold ${btnClass} flex items-center gap-1.5" data-branch="${b.id}">
        <span class="w-1.5 h-1.5 rounded-full ${b.enabled ? 'bg-emerald-400' : 'bg-slate-500'}"></span>
        <span>${b.name}</span>
        <span class="px-1.5 py-0.2 bg-black/20 rounded-md text-[10px] font-bold">${branchCount}</span>
      </button>
    `);
  });

  branchFilterPills.innerHTML = branchPillsHtml.join('');

  // Wire click events
  document.querySelectorAll('.branch-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedBranchFilter = btn.getAttribute('data-branch');
      updateBranchFilterPills();
      updateBirthdaysUI(currentData);
    });
  });
}

// Update Today's and Upcoming Birthdays List
function updateBirthdaysUI(data) {
  currentData = data;

  // Filter students based on selected branch filter
  let displayToday = data.today || [];
  let displayUpcoming = data.upcoming || [];

  if (selectedBranchFilter !== 'ALL') {
    const isMatch = s => {
      if (!s) return false;
      if (s.branchId && s.branchId === selectedBranchFilter) return true;
      const targetBranch = currentBranches.find(b => b.id === selectedBranchFilter);
      if (targetBranch && s.branch && s.branch.trim().toLowerCase() === targetBranch.name.trim().toLowerCase()) return true;
      if (s.branch && s.branch.trim().toLowerCase() === selectedBranchFilter.trim().toLowerCase()) return true;
      return false;
    };
    displayToday = displayToday.filter(isMatch);
    displayUpcoming = displayUpcoming.filter(isMatch);
  }

  const pendingCount = displayToday.filter(s => s.status === 'PENDING_TODAY').length;
  const sentCount = displayToday.filter(s => s.status === 'SENT_TODAY').length;

  statTodayCount.textContent = displayToday.length;
  statPendingCount.textContent = pendingCount;
  statSentCount.textContent = sentCount;
  statUpcomingCount.textContent = displayUpcoming.length;

  todayBadgeCount.textContent = displayToday.length;
  upcomingBadgeCount.textContent = displayUpcoming.length;

  sendAllBtn.disabled = pendingCount === 0 || isDispatching;

  // Render Today's List
  if (displayToday.length === 0) {
    todayBirthdaysList.innerHTML = `
      <div class="p-8 text-center text-slate-500">
        <i class="fa-solid fa-mug-hot text-2xl text-slate-600 mb-2"></i>
        <p class="text-sm font-medium">No student birthdays found for today ${selectedBranchFilter !== 'ALL' ? 'in this branch' : ''}.</p>
        <p class="text-xs text-slate-600 mt-1">Check the upcoming list below for birthdays happening this week.</p>
      </div>
    `;
  } else {
    todayBirthdaysList.innerHTML = displayToday.map(student => {
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

// ==========================================
// Multi-Branch Management Panel Logic
// ==========================================

async function loadBranchesManager() {
  branchesListContainer.innerHTML = `
    <div class="p-8 text-center text-slate-500 text-xs">
      <i class="fa-solid fa-spinner fa-spin text-xl mb-2 text-blue-400"></i>
      <p>Loading configured branch sheets...</p>
    </div>
  `;

  try {
    const res = await fetch('/api/branches').then(r => r.json());
    if (res.success && Array.isArray(res.branches)) {
      currentBranches = res.branches;
      navBranchCountBadge.textContent = currentBranches.length;
      renderBranchesList(currentBranches);
      updateBranchFilterPills();
    }
  } catch (err) {
    branchesListContainer.innerHTML = `<div class="p-4 text-center text-red-400 text-xs">Error loading branches: ${err.message}</div>`;
  }
}

function renderBranchesList(branches) {
  if (branches.length === 0) {
    branchesListContainer.innerHTML = `
      <div class="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-slate-400 text-xs space-y-2">
        <i class="fa-solid fa-network-wired text-3xl text-slate-600 mb-1"></i>
        <p class="font-bold text-white text-sm">No Branch Sheets Added Yet</p>
        <p class="text-slate-500 max-w-md mx-auto">Add each of your Sussex branches (Ambalangoda, Galle, etc.) with their respective Google Sheet links.</p>
        <button id="emptyAddBranchBtn" type="button" class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-md transition">
          + Add Your First Branch Sheet
        </button>
      </div>
    `;
    const btn = document.getElementById('emptyAddBranchBtn');
    if (btn) btn.addEventListener('click', openAddBranchForm);
    return;
  }

  branchesListContainer.innerHTML = branches.map(b => {
    const isEnabled = b.enabled !== false;
    const shortUrl = b.spreadsheetUrl ? (b.spreadsheetUrl.length > 50 ? b.spreadsheetUrl.substring(0, 47) + '...' : b.spreadsheetUrl) : b.spreadsheetId;

    return `
      <div class="p-4 rounded-2xl bg-slate-950/70 border ${isEnabled ? 'border-slate-800 hover:border-blue-500/40' : 'border-slate-800/40 opacity-60'} transition flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-start space-x-3.5">
          <div class="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/20 shrink-0 mt-0.5">
            <i class="fa-solid fa-building-columns"></i>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h4 class="text-sm font-bold text-white">${b.name}</h4>
              <span class="px-2 py-0.5 text-[10px] font-semibold rounded-md ${isEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}">
                ${isEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
              <span><i class="fa-solid fa-table text-slate-500 mr-1 text-[11px]"></i>Tab: <strong class="text-slate-300">${b.sheetName}</strong></span>
              <span>•</span>
              <a href="${b.spreadsheetUrl || '#'}" target="_blank" class="text-blue-400 hover:underline flex items-center gap-1 font-mono text-[11px]" title="${b.spreadsheetUrl}">
                <i class="fa-solid fa-link text-[10px]"></i> ${shortUrl}
              </a>
            </div>
            ${b.customTemplate ? `<p class="text-[11px] text-purple-300 italic mt-1">Custom template: "${b.customTemplate.substring(0, 45)}..."</p>` : ''}
          </div>
        </div>

        <!-- Branch Actions -->
        <div class="flex items-center space-x-2.5 self-end md:self-center shrink-0">
          <!-- Toggle Enabled Switch -->
          <button 
            type="button" 
            class="toggle-branch-btn px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${isEnabled ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'}"
            data-id="${b.id}"
            data-enabled="${isEnabled}"
          >
            ${isEnabled ? 'Disable' : 'Enable'}
          </button>

          <!-- Test Connection Button -->
          <button 
            type="button" 
            class="test-branch-btn px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
            data-id="${b.id}"
          >
            <i class="fa-solid fa-plug text-blue-400 text-[11px]"></i> Test
          </button>

          <!-- Edit Button -->
          <button 
            type="button" 
            class="edit-branch-btn p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition text-xs"
            data-id="${b.id}"
            title="Edit Branch Settings"
          >
            <i class="fa-solid fa-pen"></i>
          </button>

          <!-- Delete Button -->
          <button 
            type="button" 
            class="delete-branch-btn p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition text-xs"
            data-id="${b.id}"
            data-name="${b.name}"
            title="Delete Branch"
          >
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Wire Branch Card Event Listeners
  document.querySelectorAll('.toggle-branch-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const curEnabled = btn.getAttribute('data-enabled') === 'true';
      await toggleBranchEnabled(id, !curEnabled);
    });
  });

  document.querySelectorAll('.test-branch-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      await testSingleBranchConnection(id, btn);
    });
  });

  document.querySelectorAll('.edit-branch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const branch = currentBranches.find(b => b.id === id);
      if (branch) openEditBranchForm(branch);
    });
  });

  document.querySelectorAll('.delete-branch-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      if (confirm(`Are you sure you want to remove "${name}" branch sheet?`)) {
        await deleteBranchById(id);
      }
    });
  });
}

function openAddBranchForm() {
  editBranchId.value = '';
  branchInputName.value = '';
  branchInputTab.value = 'INQUIRY DETAILS 202627';
  branchInputUrl.value = '';
  branchInputTemplate.value = '';
  branchFormTitle.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add New Branch Sheet';
  branchFormDrawer.classList.remove('hidden');
  branchInputName.focus();
}

function openEditBranchForm(branch) {
  editBranchId.value = branch.id;
  branchInputName.value = branch.name || '';
  branchInputTab.value = branch.sheetName || 'INQUIRY DETAILS 202627';
  branchInputUrl.value = branch.spreadsheetUrl || branch.spreadsheetId || '';
  branchInputTemplate.value = branch.customTemplate || '';
  branchFormTitle.innerHTML = `<i class="fa-solid fa-pen"></i> Edit Branch: ${branch.name}`;
  branchFormDrawer.classList.remove('hidden');
}

function closeBranchForm() {
  branchFormDrawer.classList.add('hidden');
}

async function saveBranchRecord() {
  const name = branchInputName.value.trim();
  const url = branchInputUrl.value.trim();
  const tab = branchInputTab.value.trim() || 'INQUIRY DETAILS 202627';
  const tpl = branchInputTemplate.value.trim();
  const branchId = editBranchId.value;

  if (!name) {
    showToast('Branch name is required', 'warning');
    return;
  }
  if (!url) {
    showToast('Google Sheet URL or Spreadsheet ID is required', 'warning');
    return;
  }

  saveBranchBtn.disabled = true;
  saveBranchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  try {
    let res;
    if (branchId) {
      // Update
      res = await fetch(`/api/branches/${branchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, spreadsheetUrl: url, sheetName: tab, customTemplate: tpl })
      }).then(r => r.json());
    } else {
      // Add
      res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, spreadsheetUrl: url, sheetName: tab, customTemplate: tpl })
      }).then(r => r.json());
    }

    if (res.success) {
      showToast(`Branch "${name}" saved successfully!`, 'success');
      closeBranchForm();
      await loadBranchesManager();
      fetchAllState();
    } else {
      showToast(res.error || 'Failed to save branch', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveBranchBtn.disabled = false;
    saveBranchBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Branch';
  }
}

async function toggleBranchEnabled(id, enabled) {
  try {
    const res = await fetch(`/api/branches/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    }).then(r => r.json());

    if (res.success) {
      showToast(`Branch ${enabled ? 'enabled' : 'disabled'}`, 'info');
      await loadBranchesManager();
      fetchAllState();
    }
  } catch (err) {
    showToast('Failed to update branch status', 'error');
  }
}

async function testSingleBranchConnection(id, btnElement) {
  btnElement.disabled = true;
  btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Testing...';

  try {
    const res = await fetch(`/api/branches/${id}/test`).then(r => r.json());
    if (res.success) {
      showToast(`✓ Connected! Synced ${res.count} student rows.`, 'success');
      btnElement.className = 'test-branch-btn px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition flex items-center gap-1.5';
      btnElement.innerHTML = `<i class="fa-solid fa-check"></i> ${res.count} rows`;
    } else {
      showToast(res.error || 'Branch connection failed', 'error');
      btnElement.className = 'test-branch-btn px-3 py-1.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-semibold transition flex items-center gap-1.5';
      btnElement.innerHTML = `<i class="fa-solid fa-xmark"></i> Failed`;
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setTimeout(() => {
      btnElement.disabled = false;
      btnElement.className = 'test-branch-btn px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5';
      btnElement.innerHTML = '<i class="fa-solid fa-plug text-blue-400 text-[11px]"></i> Test';
    }, 4000);
  }
}

async function deleteBranchById(id) {
  try {
    const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' }).then(r => r.json());
    if (res.success) {
      showToast('Branch removed successfully', 'info');
      await loadBranchesManager();
      fetchAllState();
    }
  } catch (err) {
    showToast('Failed to delete branch', 'error');
  }
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
      const branches = s.branches || [];
      const activeCount = branches.filter(b => b.enabled !== false).length;
      if (settingsBranchCountBadge) {
        settingsBranchCountBadge.textContent = `${activeCount} / ${branches.length} Active`;
      }
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

  const credsJson = settingCredentialsJson.value.trim();
  const autoSend = settingAutoSendOnBoot.checked;
  const countdown = parseInt(settingCountdownSeconds.value, 10) || 10;
  const minDelay = (parseInt(settingMinDelay.value, 10) || 5) * 1000;
  const maxDelay = (parseInt(settingMaxDelay.value, 10) || 12) * 1000;
  const clientId = settingGoogleClientId.value.trim();
  const clientSecret = settingGoogleClientSecret.value.trim();

  try {
    const payload = {
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

  // Branch Modal Triggers
  if (openBranchesModalBtn) {
    openBranchesModalBtn.addEventListener('click', () => {
      loadBranchesManager();
      branchesModal.classList.remove('hidden');
    });
  }
  if (closeBranchesModalBtn) {
    closeBranchesModalBtn.addEventListener('click', () => branchesModal.classList.add('hidden'));
  }
  if (closeBranchesFooterBtn) {
    closeBranchesFooterBtn.addEventListener('click', () => branchesModal.classList.add('hidden'));
  }
  if (addNewBranchBtn) {
    addNewBranchBtn.addEventListener('click', openAddBranchForm);
  }
  if (cancelBranchFormBtn) {
    cancelBranchFormBtn.addEventListener('click', closeBranchForm);
  }
  if (saveBranchBtn) {
    saveBranchBtn.addEventListener('click', saveBranchRecord);
  }

  // Settings Modal Triggers
  openSettingsModalBtn.addEventListener('click', () => {
    loadSettingsIntoModal();
    settingsModal.classList.remove('hidden');
  });
  closeSettingsModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
  cancelSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
  saveSettingsBtn.addEventListener('click', saveSettingsFromModal);

  if (settingsOpenBranchesBtn) {
    settingsOpenBranchesBtn.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
      openBranchesModal();
    });
  }

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

