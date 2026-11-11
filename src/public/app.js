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
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleIcon = document.getElementById('themeToggleIcon');
const themeToggleText = document.getElementById('themeToggleText');
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

// Manual Phone Number Dispatch Elements
const openManualSendModalBtn = document.getElementById('openManualSendModalBtn');
const navManualSendBtn = document.getElementById('navManualSendBtn');
const manualSendModal = document.getElementById('manualSendModal');
const closeManualSendModalBtn = document.getElementById('closeManualSendModalBtn');
const cancelManualSendBtn = document.getElementById('cancelManualSendBtn');
const manualSendForm = document.getElementById('manualSendForm');
const manualInputPhone = document.getElementById('manualInputPhone');
const manualPhoneStatusBadge = document.getElementById('manualPhoneStatusBadge');
const manualInputName = document.getElementById('manualInputName');
const manualInputBranch = document.getElementById('manualInputBranch');
const manualInputMessage = document.getElementById('manualInputMessage');
const manualResetTemplateBtn = document.getElementById('manualResetTemplateBtn');
const manualDesktopAppLink = document.getElementById('manualDesktopAppLink');
const submitManualSendBtn = document.getElementById('submitManualSendBtn');

// Theme Management: Light & Dark Mode
function updateThemeUI(theme) {
  if (theme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    if (themeToggleIcon) themeToggleIcon.className = 'fa-solid fa-sun text-amber-500';
    if (themeToggleText) themeToggleText.textContent = 'Light';
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    if (themeToggleIcon) themeToggleIcon.className = 'fa-solid fa-moon text-amber-400';
    if (themeToggleText) themeToggleText.textContent = 'Dark';
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';
  localStorage.setItem('sheetpulse_theme', newTheme);
  updateThemeUI(newTheme);
  showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
}

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
    }

    updateStatusUI(statusRes);
    updateBirthdaysUI(birthdaysRes);
    updateBranchFilterPills();
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
  updateWhatsAppUI(data.whatsapp);
}

// Dedicated WhatsApp UI updater (called on full fetch or fast polling)
function updateWhatsAppUI(wa) {
  if (!wa) return;
  if (!currentStatus) currentStatus = {};
  currentStatus.whatsapp = wa;

  if (wa.status === 'READY') {
    waStatusText.textContent = wa.user?.pushname ? `Ready (${wa.user.pushname})` : 'Connected';
    waStatusText.className = 'text-emerald-400 font-semibold';
    waStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
    if (!qrModal.classList.contains('hidden')) {
      qrModal.classList.add('hidden');
      showToast('WhatsApp successfully linked and ready!', 'success');
    }
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
    waStatusText.textContent = 'Authenticated...';
    waStatusText.className = 'text-blue-400 font-semibold';
    waStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse';
  } else if (wa.status === 'INITIALIZING') {
    waStatusText.textContent = 'Connecting...';
    waStatusText.className = 'text-amber-400 font-semibold';
    waStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';
  } else if (wa.status === 'ERROR' || wa.status === 'DISCONNECTED') {
    waStatusText.textContent = 'Tap to Reconnect';
    waStatusText.className = 'text-rose-400 font-semibold';
    waStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse';
  } else {
    waStatusText.textContent = wa.status || 'Starting...';
    waStatusText.className = 'text-slate-400 font-semibold';
    waStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-500 animate-pulse';
  }
}

// Update Branch Filter Pills on Dashboard
function updateBranchFilterPills() {
  if (!branchFilterPills) return;

  const totalToday = currentData.today ? currentData.today.length : 0;
  if (filterAllCount) filterAllCount.textContent = totalToday;

  const normalize = str => (str || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();

  const allBtnClass = selectedBranchFilter === 'ALL'
    ? 'bg-blue-600 text-white shadow-sm'
    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/5';

  const branchPillsHtml = [
    `<button type="button" class="branch-filter-btn px-3 py-1 rounded-lg text-xs font-semibold ${allBtnClass}" data-branch="ALL">All Branches (${totalToday})</button>`
  ];

  currentBranches.forEach(b => {
    const normBranchName = normalize(b.name);
    // Count today's birthdays for this branch
    const branchCount = (currentData.today || []).filter(s => {
      if (!s) return false;
      if (s.branchId && s.branchId === b.id) return true;
      if (s.id && s.id.startsWith(b.id)) return true;
      const normStudentBranch = normalize(s.branch);
      if (normStudentBranch === normBranchName) return true;
      if (normStudentBranch && normBranchName && (normStudentBranch.includes(normBranchName) || normBranchName.includes(normStudentBranch))) return true;
      return false;
    }).length;

    const isActive = selectedBranchFilter === b.id || normalize(selectedBranchFilter) === normBranchName;
    const btnClass = isActive 
      ? 'bg-blue-600 text-white shadow-sm' 
      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/5';

    branchPillsHtml.push(`
      <button type="button" class="branch-filter-btn px-3 py-1 rounded-lg text-xs font-semibold ${btnClass} flex items-center gap-1.5" data-branch="${b.id}">
        <span class="w-1.5 h-1.5 rounded-full ${b.enabled ? 'bg-emerald-400' : 'bg-slate-500'}"></span>
        <span>${b.name}</span>
        <span class="px-1.5 py-0.2 bg-black/10 dark:bg-black/30 rounded-md text-[10px] font-bold">${branchCount}</span>
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
    const normalize = str => (str || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
    const isMatch = s => {
      if (!s) return false;
      if (s.branchId && s.branchId === selectedBranchFilter) return true;
      if (s.id && s.id.startsWith(selectedBranchFilter)) return true;
      const targetBranch = currentBranches.find(b => b.id === selectedBranchFilter);
      if (targetBranch) {
        const normTarget = normalize(targetBranch.name);
        const normStudentBranch = normalize(s.branch);
        if (normStudentBranch === normTarget) return true;
        if (normStudentBranch && normTarget && (normStudentBranch.includes(normTarget) || normTarget.includes(normStudentBranch))) return true;
      }
      const normFilter = normalize(selectedBranchFilter);
      const normStudentBranch = normalize(s.branch);
      if (normStudentBranch === normFilter) return true;
      if (normStudentBranch && normFilter && (normStudentBranch.includes(normFilter) || normFilter.includes(normStudentBranch))) return true;
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
      <div class="p-12 text-center text-slate-500 dark:text-slate-400">
        <div class="h-14 w-14 rounded-2xl bg-amber-400/10 text-amber-500 dark:text-amber-400 flex items-center justify-center text-2xl mx-auto mb-3 border border-amber-400/20">
          <i class="fa-solid fa-calendar-check"></i>
        </div>
        <p class="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">No Student Birthdays Today ${selectedBranchFilter !== 'ALL' ? 'in this branch' : 'Across Active Branches'}</p>
        <p class="text-xs text-slate-500 dark:text-slate-500 mt-1 max-w-md mx-auto">All branches are synced in Asia/Colombo timezone. Review the 7-day forecast below for upcoming celebrations.</p>
      </div>
    `;
  } else {
    todayBirthdaysList.innerHTML = displayToday.map(student => {
      const isSent = student.status === 'SENT_TODAY';
      const branchLower = (student.branch || '').toLowerCase();
      let branchBadgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      if (branchLower.includes('ambalangoda')) {
        branchBadgeClass = 'bg-amber-400/15 text-amber-700 dark:text-amber-300 border-amber-400/30';
      } else if (branchLower.includes('galle')) {
        branchBadgeClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      } else if (branchLower.includes('ampara')) {
        branchBadgeClass = 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
      }

      const statusBadge = isSent
        ? '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25"><i class="fa-solid fa-circle-check text-emerald-500 dark:text-emerald-400"></i> Wish Delivered</span>'
        : '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/30"><i class="fa-regular fa-clock text-amber-500 dark:text-amber-400"></i> Pending Wish</span>';

      const initial = student.name ? student.name.charAt(0).toUpperCase() : '?';

      return `
        <div class="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-start space-x-3.5 flex-1 min-w-0">
            <div class="relative shrink-0 mt-0.5">
              <div class="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-base shadow-md font-display">
                ${initial}
              </div>
              <span class="absolute -top-1.5 -right-1.5 text-xs text-amber-300 drop-shadow">👑</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center flex-wrap gap-2">
                <h4 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-display truncate">${student.name}</h4>
                <span class="px-2.5 py-0.5 text-[10px] font-semibold rounded-md border ${branchBadgeClass}">${student.branch}</span>
              </div>
              <div class="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span class="text-slate-700 dark:text-slate-300 font-mono"><i class="fa-solid fa-phone text-[10px] text-slate-400 dark:text-slate-500 mr-1.5"></i>${student.phoneDisplay}</span>
                <span class="text-slate-300 dark:text-slate-600">•</span>
                <span class="text-amber-600 dark:text-amber-300 font-medium"><i class="fa-solid fa-cake-candles text-[10px] text-amber-500 dark:text-amber-400 mr-1.5"></i>Turning <strong class="text-slate-900 dark:text-white">${student.age || 'N/A'}</strong></span>
                <span class="text-slate-300 dark:text-slate-600">•</span>
                <span>Born: <strong class="text-slate-700 dark:text-slate-300">${student.dobFormatted}</strong></span>
              </div>
              <!-- Live Personalized Message Preview Snippet -->
              <div class="mt-2.5 px-3 py-1.5 rounded-xl bg-amber-500/[0.04] dark:bg-black/25 border border-amber-500/10 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <i class="fa-solid fa-quote-left text-amber-500/60 text-[10px] shrink-0"></i>
                <span class="truncate italic">${formatPreview(student)}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-2.5 self-end md:self-center shrink-0">
            ${statusBadge}

            <!-- Direct Automated WhatsApp Dispatch Button -->
            <button 
              class="send-single-btn px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              data-id="${student.id}"
              data-phone="${student.phone}"
              data-name="${student.name}"
              ${isSent || isDispatching ? 'disabled' : ''}
              title="Send personalized birthday message via WhatsApp"
            >
              <i class="fa-brands fa-whatsapp text-white text-sm"></i>
              ${isSent ? 'Sent' : 'Send Wish'}
            </button>

            <!-- Native Desktop App URI Link Fallback -->
            <a 
              href="whatsapp://send?phone=${student.phone}&text=${encodeURIComponent(formatPreview(student))}"
              class="theme-pill p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 rounded-xl border transition text-xs"
              title="Open chat in Windows WhatsApp Desktop App"
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
      <div class="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
        No upcoming birthdays recorded in the next 7 days across active branches.
      </div>
    `;
  } else {
    upcomingBirthdaysList.innerHTML = data.upcoming.map(student => {
      const inDaysText = student.daysUntil === 1 ? 'Tomorrow' : `In ${student.daysUntil} days`;
      return `
        <div class="p-3.5 px-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div class="flex items-center space-x-3">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
            <div>
              <span class="font-bold text-slate-900 dark:text-white font-display">${student.name}</span>
              <span class="text-slate-500 dark:text-slate-400 ml-1.5 font-medium">(${student.branch})</span>
            </div>
          </div>
          <div class="flex items-center space-x-4 text-slate-500 dark:text-slate-400 self-end sm:self-auto shrink-0">
            <span>DOB: <strong class="text-slate-700 dark:text-slate-300 font-mono">${student.dobFormatted}</strong> (Turning <strong class="text-slate-900 dark:text-white">${student.age || 'N/A'}</strong>)</span>
            <span class="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 font-semibold border border-blue-500/20 text-[11px] font-mono">${inDaysText}</span>
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
      <div class="p-4 rounded-2xl surface-subtle border ${isEnabled ? 'border-slate-200 dark:border-white/10 hover:border-blue-500/40' : 'border-slate-200/40 dark:border-white/5 opacity-60'} transition flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-start space-x-3.5">
          <div class="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/20 shrink-0 mt-0.5">
            <i class="fa-solid fa-building-columns"></i>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h4 class="text-sm font-bold text-slate-900 dark:text-white font-display">${b.name}</h4>
              <span class="px-2 py-0.5 text-[10px] font-semibold rounded-md ${isEnabled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}">
                ${isEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span><i class="fa-solid fa-table text-slate-400 dark:text-slate-500 mr-1 text-[11px]"></i>Tab: <strong class="text-slate-700 dark:text-slate-300">${b.sheetName}</strong></span>
              <span>•</span>
              <a href="${b.spreadsheetUrl || '#'}" target="_blank" class="text-blue-500 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono text-[11px]" title="${b.spreadsheetUrl}">
                <i class="fa-solid fa-link text-[10px]"></i> ${shortUrl}
              </a>
            </div>
            ${b.customTemplate ? `<p class="text-[11px] text-purple-600 dark:text-purple-300 italic mt-1">Custom template: "${b.customTemplate.substring(0, 45)}..."</p>` : ''}
          </div>
        </div>

        <!-- Branch Actions -->
        <div class="flex items-center space-x-2.5 self-end md:self-center shrink-0">
          <!-- Toggle Enabled Switch -->
          <button 
            type="button" 
            class="toggle-branch-btn px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${isEnabled ? 'theme-pill' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'}"
            data-id="${b.id}"
            data-enabled="${isEnabled}"
          >
            ${isEnabled ? 'Disable' : 'Enable'}
          </button>

          <!-- Test Connection Button -->
          <button 
            type="button" 
            class="test-branch-btn theme-pill px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 hover:border-blue-400"
            data-id="${b.id}"
          >
            <i class="fa-solid fa-plug text-blue-500 dark:text-blue-400 text-[11px]"></i> Test
          </button>

          <!-- Edit Button -->
          <button 
            type="button" 
            class="edit-branch-btn theme-pill p-2 rounded-xl text-xs"
            data-id="${b.id}"
            title="Edit Branch Settings"
          >
            <i class="fa-solid fa-pen"></i>
          </button>

          <!-- Delete Button -->
          <button 
            type="button" 
            class="delete-branch-btn theme-pill p-2 text-red-500 dark:text-red-400 hover:bg-red-500/10 rounded-xl text-xs"
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

  const autoSend = settingAutoSendOnBoot.checked;
  const countdown = parseInt(settingCountdownSeconds.value, 10) || 10;
  const minDelay = (parseInt(settingMinDelay.value, 10) || 5) * 1000;
  const maxDelay = (parseInt(settingMaxDelay.value, 10) || 12) * 1000;

  try {
    const payload = {
      autoSendOnBoot: autoSend,
      autoSendDelaySeconds: countdown,
      minDispatchDelayMs: minDelay,
      maxDispatchDelayMs: maxDelay
    };

    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast('Settings saved successfully!', 'success');
      settingsModal.classList.add('hidden');
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

// ==========================================
// Manual Phone Number Dispatch Logic
// ==========================================

function sanitizeClientPhone(rawPhone) {
  if (!rawPhone) return { digits: '', formatted: '', isValid: false };
  let digits = String(rawPhone).trim().replace(/\D/g, '');
  if (digits.startsWith('0094')) digits = digits.substring(2);
  else if (digits.startsWith('0') && digits.length === 10) digits = '94' + digits.substring(1);
  else if (digits.length === 9 && digits.startsWith('7')) digits = '94' + digits;

  const isSLMobile = /^947\d{8}$/.test(digits);
  const isValid = isSLMobile || (digits.length >= 10 && digits.length <= 15);
  let formatted = digits;
  if (isSLMobile) {
    formatted = `+${digits.substring(0, 2)} ${digits.substring(2, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}`;
  } else if (digits) {
    formatted = `+${digits}`;
  }
  return { digits, formatted, isValid };
}

function updateManualPhoneValidation() {
  if (!manualInputPhone) return;
  const val = manualInputPhone.value.trim();
  const res = sanitizeClientPhone(val);

  if (!val) {
    manualPhoneStatusBadge.textContent = 'e.g. 077 123 4567';
    manualPhoneStatusBadge.className = 'text-[10px] font-mono text-slate-400';
  } else if (res.isValid) {
    manualPhoneStatusBadge.textContent = `✓ ${res.formatted}`;
    manualPhoneStatusBadge.className = 'text-[10px] font-mono text-emerald-500 font-bold';
  } else {
    manualPhoneStatusBadge.textContent = '✗ Invalid phone format';
    manualPhoneStatusBadge.className = 'text-[10px] font-mono text-red-400 font-semibold';
  }

  // Update desktop app fallback URI link
  const msg = manualInputMessage ? (manualInputMessage.value.trim() || currentTemplate) : currentTemplate;
  if (manualDesktopAppLink) {
    manualDesktopAppLink.href = `whatsapp://send?phone=${res.digits}&text=${encodeURIComponent(msg)}`;
  }
}

function openManualSendModal() {
  if (!manualSendModal) return;

  // Populate branches in dropdown
  if (manualInputBranch) {
    const opts = [
      '<option value="Sussex College Network">Sussex College Network</option>'
    ];
    currentBranches.forEach(b => {
      opts.push(`<option value="${b.name}">${b.name}</option>`);
    });
    manualInputBranch.innerHTML = opts.join('');
  }

  // Set message text
  if (manualInputMessage) {
    manualInputMessage.value = currentTemplate;
  }
  updateManualPhoneValidation();
  manualSendModal.classList.remove('hidden');
  setTimeout(() => {
    if (manualInputPhone) manualInputPhone.focus();
  }, 60);
}

function closeManualSendModal() {
  if (manualSendModal) manualSendModal.classList.add('hidden');
}

async function handleManualSendSubmit(e) {
  e.preventDefault();
  const phoneRaw = manualInputPhone.value.trim();
  const phoneInfo = sanitizeClientPhone(phoneRaw);
  if (!phoneInfo.isValid) {
    showToast('Please enter a valid Sri Lankan mobile number (e.g. 07XXXXXXXX) or international number.', 'warning');
    manualInputPhone.focus();
    return;
  }

  const messageText = manualInputMessage.value.trim();
  if (!messageText) {
    showToast('Message text cannot be empty.', 'warning');
    return;
  }

  submitManualSendBtn.disabled = true;
  const originalBtnText = submitManualSendBtn.innerHTML;
  submitManualSendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-sm"></i> Sending Wish...';

  try {
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phoneInfo.digits,
        name: manualInputName.value.trim() || 'Little Sunshine',
        branch: manualInputBranch.value || 'Sussex College Network',
        template: messageText
      })
    }).then(r => r.json());

    if (res.success) {
      showToast(`Birthday wish sent successfully to ${phoneInfo.formatted}! 🎉`, 'success');
      closeManualSendModal();
      manualInputPhone.value = '';
      manualInputName.value = '';
      fetchAllState();
    } else {
      showToast(res.error || 'Failed to send WhatsApp message', 'error');
    }
  } catch (err) {
    showToast(`Send error: ${err.message}`, 'error');
  } finally {
    submitManualSendBtn.disabled = false;
    submitManualSendBtn.innerHTML = originalBtnText;
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Theme (Dark / Light)
  const savedTheme = localStorage.getItem('sheetpulse_theme') || 'dark';
  updateThemeUI(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  fetchAllState();

  // Periodic polling for WhatsApp connection status (fast, lightweight, zero sheet overhead)
  setInterval(async () => {
    try {
      const waRes = await fetch('/api/whatsapp/status').then(r => r.json());
      updateWhatsAppUI(waRes);
    } catch (e) {}
  }, 3000);

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

  // Google Sign In & OAuth Post-Message / Polling Listener
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
      showToast(`Google Sign-In successful (${event.data.email})!`, 'success');
      loadSettingsIntoModal();
      fetchAllState();
    }
  });

  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', () => {
      // Poll auth status after clicking Sign In so once completed in the external browser,
      // the software immediately updates and reloads the active user session!
      let checks = 0;
      const pollInterval = setInterval(async () => {
        checks++;
        try {
          const authRes = await fetch('/api/auth/google/status').then(r => r.json());
          if (authRes.signedIn && authRes.userEmail) {
            clearInterval(pollInterval);
            showToast(`Connected to Google as ${authRes.userEmail}!`, 'success');
            loadSettingsIntoModal();
            fetchAllState();
          }
        } catch (e) {}
        if (checks > 60) clearInterval(pollInterval); // Stop polling after 2 minutes
      }, 2000);
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
  whatsappStatusBtn.addEventListener('click', async () => {
    const wa = currentStatus.whatsapp || {};
    if (wa.status === 'READY') {
      showToast(wa.user?.phone ? `WhatsApp is connected (+${wa.user.phone})` : 'WhatsApp session is active and ready!', 'success');
      return;
    }

    // Open QR modal right away
    qrModal.classList.remove('hidden');

    if (wa.status === 'QR_READY' && wa.qrDataUrl) {
      qrImageElement.src = wa.qrDataUrl;
      qrImageElement.classList.remove('hidden');
      qrPlaceholder.classList.add('hidden');
    } else {
      // Display spinner placeholder and request clean pairing reset if in ERROR or stuck
      qrImageElement.classList.add('hidden');
      qrPlaceholder.classList.remove('hidden');
      try {
        showToast('Refreshing WhatsApp session...', 'info');
        await fetch('/api/whatsapp/reset', { method: 'POST' });
        const freshWa = await fetch('/api/whatsapp/status').then(r => r.json());
        updateWhatsAppUI(freshWa);
      } catch (err) {
        console.error('Error refreshing WhatsApp session:', err);
      }
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

  // Manual Send Modal Triggers & Form
  if (openManualSendModalBtn) {
    openManualSendModalBtn.addEventListener('click', openManualSendModal);
  }
  if (navManualSendBtn) {
    navManualSendBtn.addEventListener('click', openManualSendModal);
  }
  if (closeManualSendModalBtn) {
    closeManualSendModalBtn.addEventListener('click', closeManualSendModal);
  }
  if (cancelManualSendBtn) {
    cancelManualSendBtn.addEventListener('click', closeManualSendModal);
  }
  if (manualInputPhone) {
    manualInputPhone.addEventListener('input', updateManualPhoneValidation);
  }
  if (manualInputMessage) {
    manualInputMessage.addEventListener('input', updateManualPhoneValidation);
  }
  if (manualResetTemplateBtn) {
    manualResetTemplateBtn.addEventListener('click', () => {
      manualInputMessage.value = currentTemplate;
      updateManualPhoneValidation();
    });
  }
  if (manualSendForm) {
    manualSendForm.addEventListener('submit', handleManualSendSubmit);
  }

  const developerModal = document.getElementById('developerModal');
  const openDeveloperModalBtn = document.getElementById('openDeveloperModalBtn');
  const closeDeveloperModalBtn = document.getElementById('closeDeveloperModalBtn');
  const doneDeveloperModalBtn = document.getElementById('doneDeveloperModalBtn');

  if (developerModal) {
    const closeDeveloperModal = () => developerModal.classList.add('hidden');
    if (openDeveloperModalBtn) {
      openDeveloperModalBtn.addEventListener('click', () => {
        developerModal.classList.remove('hidden');
      });
    }
    if (closeDeveloperModalBtn) {
      closeDeveloperModalBtn.addEventListener('click', closeDeveloperModal);
    }
    if (doneDeveloperModalBtn) {
      doneDeveloperModalBtn.addEventListener('click', closeDeveloperModal);
    }
    developerModal.addEventListener('click', (e) => {
      if (e.target === developerModal) {
        closeDeveloperModal();
      }
    });
  }
});

