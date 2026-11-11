// WishSync Frontend Client — Sussex College Network

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
let activeWorkspaceTab = 'today';
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

// Workspace Tabs
const tabBtnToday = document.getElementById('tabBtnToday');
const tabBtnUpcoming = document.getElementById('tabBtnUpcoming');
const tabBtnLedger = document.getElementById('tabBtnLedger');
const tabPanelToday = document.getElementById('tabPanelToday');
const tabPanelUpcoming = document.getElementById('tabPanelUpcoming');
const tabPanelLedger = document.getElementById('tabPanelLedger');
const branchFilterStrip = document.getElementById('branchFilterStrip');

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

// Settings Modal Elements
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

// WhatsApp QR Modal Elements
const qrModal = document.getElementById('qrModal');
const closeQrModalBtn = document.getElementById('closeQrModalBtn');
const doneQrModalBtn = document.getElementById('doneQrModalBtn');
const resetSessionBtn = document.getElementById('resetSessionBtn');
const qrImageElement = document.getElementById('qrImageElement');
const qrPlaceholder = document.getElementById('qrPlaceholder');

// Template Modal Elements
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

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Theme Management (Light default desktop palette, optional Dark mode)
function updateThemeUI(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    if (themeToggleIcon) themeToggleIcon.className = 'fa-solid fa-sun text-[11px] text-amber-400';
    if (themeToggleText) themeToggleText.textContent = 'Dark';
  } else {
    document.documentElement.classList.remove('dark');
    if (themeToggleIcon) themeToggleIcon.className = 'fa-solid fa-moon text-[11px] text-[var(--text-muted)]';
    if (themeToggleText) themeToggleText.textContent = 'Light';
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';
  localStorage.setItem('wishsync_theme', newTheme);
  updateThemeUI(newTheme);
  showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} appearance`, 'info');
}

// Workspace Tab Switching
function switchWorkspaceTab(tabName) {
  activeWorkspaceTab = tabName;

  const tabs = [
    { name: 'today', btn: tabBtnToday, panel: tabPanelToday },
    { name: 'upcoming', btn: tabBtnUpcoming, panel: tabPanelUpcoming },
    { name: 'ledger', btn: tabBtnLedger, panel: tabPanelLedger }
  ];

  tabs.forEach(t => {
    const isActive = t.name === tabName;
    if (t.panel) {
      t.panel.classList.toggle('hidden', !isActive);
    }
    if (t.btn) {
      t.btn.className = isActive
        ? 'workspace-tab px-3.5 py-3 text-xs font-semibold border-b-2 border-[#1B365D] dark:border-blue-400 text-[#1B365D] dark:text-white flex items-center gap-2 whitespace-nowrap'
        : 'workspace-tab px-3.5 py-3 text-xs font-medium border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-2 whitespace-nowrap';
    }
  });

  if (branchFilterStrip) {
    branchFilterStrip.classList.toggle('hidden', tabName === 'ledger');
  }

  if (tabName === 'ledger') {
    loadLedgerRecords();
  }
}

// Utility: Toast Notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const styles = type === 'success'
    ? 'bg-emerald-700 border-emerald-800 text-white'
    : type === 'error'
    ? 'bg-red-700 border-red-800 text-white'
    : type === 'warning'
    ? 'bg-amber-600 border-amber-700 text-white'
    : 'bg-[#1B365D] border-[#152A4A] text-white';

  toast.className = `px-3.5 py-2.5 rounded-md text-xs shadow-lg border flex items-center gap-2 transition-all transform duration-200 opacity-0 translate-y-2 ${styles}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'} text-xs shrink-0"></i>
    <span>${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 220);
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

    if (activeWorkspaceTab === 'ledger') {
      loadLedgerRecords();
    }

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
    sheetsStatusText.className = 'font-medium text-emerald-700 dark:text-emerald-400';
  } else if (sheets.status === 'NOT_CONFIGURED') {
    sheetsStatusText.textContent = 'Not linked';
    sheetsStatusText.className = 'font-medium text-[var(--text-muted)]';
    sheetsStatusText.title = 'Add your Google Sheet link in Branches';
  } else {
    sheetsStatusText.textContent = 'Disconnected';
    sheetsStatusText.className = 'font-medium text-red-700 dark:text-red-400';
    sheetsStatusText.title = sheets.message || sheets.warning || 'Connection error';
  }

  updateWhatsAppUI(data.whatsapp);
}

// Dedicated WhatsApp UI Updater
function updateWhatsAppUI(wa) {
  if (!wa) return;
  if (!currentStatus) currentStatus = {};
  currentStatus.whatsapp = wa;

  if (wa.status === 'READY') {
    waStatusText.textContent = wa.user?.pushname ? `Connected (${wa.user.pushname})` : 'Connected';
    waStatusText.className = 'font-medium text-emerald-700 dark:text-emerald-400';
    waStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-600';
    if (!qrModal.classList.contains('hidden')) {
      qrModal.classList.add('hidden');
      showToast('WhatsApp connected and ready.', 'success');
    }
  } else if (wa.status === 'QR_READY') {
    waStatusText.textContent = 'Scan QR required';
    waStatusText.className = 'font-medium text-amber-700 dark:text-amber-400';
    waStatusDot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
    if (wa.qrDataUrl) {
      qrImageElement.src = wa.qrDataUrl;
      qrImageElement.classList.remove('hidden');
      qrPlaceholder.classList.add('hidden');
    }
  } else if (wa.status === 'AUTHENTICATED') {
    waStatusText.textContent = 'Authenticating...';
    waStatusText.className = 'font-medium text-[#1B365D] dark:text-blue-400';
    waStatusDot.className = 'w-2 h-2 rounded-full bg-[#1B365D] dark:bg-blue-400 animate-pulse';
  } else if (wa.status === 'INITIALIZING') {
    waStatusText.textContent = 'Starting...';
    waStatusText.className = 'font-medium text-amber-700 dark:text-amber-400';
    waStatusDot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
  } else if (wa.status === 'ERROR' || wa.status === 'DISCONNECTED') {
    waStatusText.textContent = 'Click to reconnect';
    waStatusText.className = 'font-medium text-red-700 dark:text-red-400';
    waStatusDot.className = 'w-2 h-2 rounded-full bg-red-600';
  } else {
    waStatusText.textContent = wa.status || 'Starting...';
    waStatusText.className = 'font-medium text-[var(--text-muted)]';
    waStatusDot.className = 'w-2 h-2 rounded-full bg-gray-400';
  }
}

// Update Branch Filter Pills
function updateBranchFilterPills() {
  if (!branchFilterPills) return;

  const totalToday = currentData.today ? currentData.today.length : 0;
  if (filterAllCount) filterAllCount.textContent = totalToday;

  const normalize = str => (str || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();

  const allBtnClass = selectedBranchFilter === 'ALL'
    ? 'bg-[#1B365D] text-white border-[#152A4A]'
    : 'btn-neutral text-[var(--text-secondary)]';

  const branchPillsHtml = [
    `<button type="button" class="branch-filter-btn px-2.5 py-1 rounded-md text-xs font-medium border ${allBtnClass}" data-branch="ALL">All Branches (${totalToday})</button>`
  ];

  currentBranches.forEach(b => {
    const normBranchName = normalize(b.name);
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
      ? 'bg-[#1B365D] text-white border-[#152A4A]'
      : 'btn-neutral text-[var(--text-secondary)]';

    branchPillsHtml.push(`
      <button type="button" class="branch-filter-btn px-2.5 py-1 rounded-md text-xs font-medium border ${btnClass} flex items-center gap-1.5" data-branch="${escapeHtml(b.id)}">
        <span class="w-1.5 h-1.5 rounded-full ${b.enabled ? 'bg-emerald-500' : 'bg-gray-400'}"></span>
        <span>${escapeHtml(b.name)}</span>
        <span class="font-mono text-[11px] opacity-80">(${branchCount})</span>
      </button>
    `);
  });

  branchFilterPills.innerHTML = branchPillsHtml.join('');

  document.querySelectorAll('.branch-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedBranchFilter = btn.getAttribute('data-branch');
      updateBranchFilterPills();
      updateBirthdaysUI(currentData);
    });
  });
}

// Render Today & Upcoming Student Tables
function updateBirthdaysUI(data) {
  currentData = data;

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

  // Render Today's Table
  if (displayToday.length === 0) {
    todayBirthdaysList.innerHTML = `
      <div class="p-10 text-center text-[var(--text-muted)]">
        <p class="text-sm font-semibold text-[var(--text-primary)]">No birthdays today ${selectedBranchFilter !== 'ALL' ? 'for this branch' : 'across active branches'}</p>
        <p class="text-xs mt-1">All enabled sheets are synced in Asia/Colombo timezone. Check the Upcoming tab for the next 7 days.</p>
      </div>
    `;
  } else {
    const rowsHtml = displayToday.map(student => {
      const isSent = student.status === 'SENT_TODAY';
      const statusBadge = isSent
        ? '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Delivered</span>'
        : '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Pending</span>';

      const previewMsg = formatPreview(student);

      return `
        <tr class="hover:bg-[var(--bg-toolbar)] transition">
          <td class="px-4 py-3 align-top">
            <div class="font-semibold text-[var(--text-primary)]">${escapeHtml(student.name)}</div>
            <div class="text-xs text-[var(--text-muted)] mt-0.5 max-w-md truncate" title="${escapeHtml(previewMsg)}">${escapeHtml(previewMsg)}</div>
          </td>
          <td class="px-4 py-3 align-top whitespace-nowrap">
            <span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[var(--bg-toolbar)] border border-[var(--border-hairline)] text-[var(--text-secondary)]">
              ${escapeHtml(student.branch)}
            </span>
          </td>
          <td class="px-4 py-3 align-top whitespace-nowrap text-xs">
            <div class="font-mono text-[var(--text-primary)] tabular-nums">${escapeHtml(student.dobFormatted)}</div>
            <div class="text-[var(--text-muted)] mt-0.5">Turning ${escapeHtml(student.age || 'N/A')}</div>
          </td>
          <td class="px-4 py-3 align-top whitespace-nowrap font-mono text-xs text-[var(--text-primary)] tabular-nums">
            ${escapeHtml(student.phoneDisplay)}
          </td>
          <td class="px-4 py-3 align-top whitespace-nowrap">
            ${statusBadge}
          </td>
          <td class="px-4 py-3 align-top whitespace-nowrap text-right">
            <div class="inline-flex items-center gap-1.5">
              <button
                type="button"
                class="send-single-btn px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-700 hover:bg-emerald-600 text-white transition flex items-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed"
                data-id="${escapeHtml(student.id)}"
                data-phone="${escapeHtml(student.phone)}"
                data-name="${escapeHtml(student.name)}"
                ${isSent || isDispatching ? 'disabled' : ''}
                title="Send birthday card and message via WhatsApp"
              >
                <i class="fa-brands fa-whatsapp"></i>
                <span>${isSent ? 'Sent' : 'Send Wish'}</span>
              </button>
              <a
                href="whatsapp://send?phone=${encodeURIComponent(student.phone)}&text=${encodeURIComponent(previewMsg)}"
                class="btn-neutral p-1.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                title="Open in WhatsApp Desktop"
              >
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    todayBirthdaysList.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-[var(--border-hairline)] bg-[var(--bg-toolbar)] text-[11px] font-semibold text-[var(--text-muted)]">
              <th class="px-4 py-2.5">Student</th>
              <th class="px-4 py-2.5">Branch</th>
              <th class="px-4 py-2.5">Date of Birth</th>
              <th class="px-4 py-2.5">WhatsApp</th>
              <th class="px-4 py-2.5">Status</th>
              <th class="px-4 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--border-hairline)] text-xs">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll('.send-single-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const studentId = btn.getAttribute('data-id');
        const targetStudent = currentData.today.find(s => s.id === studentId);
        if (targetStudent) {
          await dispatchSingle(targetStudent, btn);
        }
      });
    });
  }

  // Render Upcoming 7 Days Table
  if (displayUpcoming.length === 0) {
    upcomingBirthdaysList.innerHTML = `
      <div class="p-10 text-center text-[var(--text-muted)] text-xs">
        No upcoming birthdays in the next 7 days${selectedBranchFilter !== 'ALL' ? ' for this branch' : ' across active branches'}.
      </div>
    `;
  } else {
    const upRows = displayUpcoming.map(student => {
      const inDaysText = student.daysUntil === 1 ? 'Tomorrow' : `In ${student.daysUntil} days`;
      return `
        <tr class="hover:bg-[var(--bg-toolbar)] transition">
          <td class="px-4 py-3 font-semibold text-[var(--text-primary)]">${escapeHtml(student.name)}</td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[var(--bg-toolbar)] border border-[var(--border-hairline)] text-[var(--text-secondary)]">
              ${escapeHtml(student.branch)}
            </span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap font-mono text-[var(--text-primary)] tabular-nums">${escapeHtml(student.dobFormatted)}</td>
          <td class="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">Turning ${escapeHtml(student.age || 'N/A')}</td>
          <td class="px-4 py-3 whitespace-nowrap text-right">
            <span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[var(--bg-toolbar)] border border-[var(--border-hairline)] text-[#1B365D] dark:text-blue-300 font-mono">
              ${inDaysText}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    upcomingBirthdaysList.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-[var(--border-hairline)] bg-[var(--bg-toolbar)] text-[11px] font-semibold text-[var(--text-muted)]">
              <th class="px-4 py-2.5">Student</th>
              <th class="px-4 py-2.5">Branch</th>
              <th class="px-4 py-2.5">Date of Birth</th>
              <th class="px-4 py-2.5">Upcoming Age</th>
              <th class="px-4 py-2.5 text-right">Schedule</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--border-hairline)] text-xs">
            ${upRows}
          </tbody>
        </table>
      </div>
    `;
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

// Auto-Send Countdown
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
    showToast('Automatic dispatch cancelled.', 'warning');
  }
}

// Send Single Student Wish
async function dispatchSingle(student, btnElement) {
  if (isDispatching) return;
  btnElement.disabled = true;
  btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Sending...</span>';

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
      showToast(`Birthday wish sent to ${student.name}.`, 'success');
      fetchAllState();
    } else {
      showToast(res.error || 'Failed to send message', 'error');
      btnElement.disabled = false;
      btnElement.innerHTML = '<i class="fa-brands fa-whatsapp"></i><span>Retry</span>';
    }
  } catch (err) {
    showToast(err.message, 'error');
    btnElement.disabled = false;
    btnElement.innerHTML = '<i class="fa-brands fa-whatsapp"></i><span>Retry</span>';
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
  sendAllBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Sending Batch...</span>';

  showToast(`Sending wishes to ${pendingStudents.length} student(s)...`, 'info');

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
    sendAllBtn.innerHTML = '<i class="fa-brands fa-whatsapp text-sm"></i><span>Send All Pending Wishes</span>';
    fetchAllState();
  }
}

// Multi-Branch Management Panel Logic
async function loadBranchesManager() {
  branchesListContainer.innerHTML = `
    <div class="p-8 text-center text-[var(--text-muted)] text-xs">
      <i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Loading branch sheets...
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
    branchesListContainer.innerHTML = `<div class="p-4 text-center text-red-600 text-xs">Error loading branches: ${escapeHtml(err.message)}</div>`;
  }
}

function renderBranchesList(branches) {
  if (branches.length === 0) {
    branchesListContainer.innerHTML = `
      <div class="p-8 rounded-lg app-toolbar border border-[var(--border-hairline)] text-center text-xs space-y-2">
        <p class="font-semibold text-[var(--text-primary)] text-sm">No branch sheets configured</p>
        <p class="text-[var(--text-muted)] max-w-md mx-auto">Add your Sussex branches along with their Google Sheet links and worksheet tab names.</p>
        <button id="emptyAddBranchBtn" type="button" class="btn-primary mt-2 px-4 py-2 rounded-md font-semibold">
          + Add Branch Sheet
        </button>
      </div>
    `;
    const btn = document.getElementById('emptyAddBranchBtn');
    if (btn) btn.addEventListener('click', openAddBranchForm);
    return;
  }

  branchesListContainer.innerHTML = branches.map(b => {
    const isEnabled = b.enabled !== false;
    const shortUrl = b.spreadsheetUrl ? (b.spreadsheetUrl.length > 52 ? b.spreadsheetUrl.substring(0, 49) + '...' : b.spreadsheetUrl) : b.spreadsheetId;

    return `
      <div class="p-3.5 rounded-lg app-toolbar border border-[var(--border-hairline)] ${isEnabled ? '' : 'opacity-65'} flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h4 class="text-xs font-bold text-[var(--text-primary)] truncate">${escapeHtml(b.name)}</h4>
            <span class="px-2 py-0.5 text-[11px] font-medium rounded ${isEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-[var(--bg-panel)] border border-[var(--border-hairline)] text-[var(--text-muted)]'}">
              ${isEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)] mt-1">
            <span>Tab: <strong class="text-[var(--text-secondary)]">${escapeHtml(b.sheetName)}</strong></span>
            <span>·</span>
            <a href="${escapeHtml(b.spreadsheetUrl || '#')}" target="_blank" class="text-[#1B365D] dark:text-blue-400 hover:underline font-mono text-[11px]" title="${escapeHtml(b.spreadsheetUrl)}">
              ${escapeHtml(shortUrl)}
            </a>
          </div>
          ${b.customTemplate ? `<p class="text-[11px] text-[var(--text-muted)] mt-1">Custom template: "${escapeHtml(b.customTemplate.substring(0, 50))}..."</p>` : ''}
        </div>

        <div class="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            type="button"
            class="toggle-branch-btn btn-neutral px-2.5 py-1.5 rounded-md text-xs font-medium transition"
            data-id="${escapeHtml(b.id)}"
            data-enabled="${isEnabled}"
          >
            ${isEnabled ? 'Disable' : 'Enable'}
          </button>

          <button
            type="button"
            class="test-branch-btn btn-neutral px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5"
            data-id="${escapeHtml(b.id)}"
          >
            <i class="fa-solid fa-plug text-[11px] text-[var(--text-muted)]"></i> Test
          </button>

          <button
            type="button"
            class="edit-branch-btn btn-neutral p-1.5 rounded-md text-xs"
            data-id="${escapeHtml(b.id)}"
            title="Edit Branch"
          >
            <i class="fa-solid fa-pen"></i>
          </button>

          <button
            type="button"
            class="delete-branch-btn btn-neutral p-1.5 text-red-600 dark:text-red-400 rounded-md text-xs"
            data-id="${escapeHtml(b.id)}"
            data-name="${escapeHtml(b.name)}"
            title="Delete Branch"
          >
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

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
      if (confirm(`Remove "${name}" branch sheet from WishSync?`)) {
        await deleteBranchById(id);
      }
    });
  });
}

function openAddBranchForm() {
  editBranchId.value = '';
  branchInputName.value = '';
  branchInputTab.value = 'INQUIRY DETAILS 2026/27';
  branchInputUrl.value = '';
  branchInputTemplate.value = '';
  branchFormTitle.textContent = 'Add New Branch Sheet';
  branchFormDrawer.classList.remove('hidden');
  branchInputName.focus();
}

function openEditBranchForm(branch) {
  editBranchId.value = branch.id;
  branchInputName.value = branch.name || '';
  branchInputTab.value = branch.sheetName || 'INQUIRY DETAILS 2026/27';
  branchInputUrl.value = branch.spreadsheetUrl || branch.spreadsheetId || '';
  branchInputTemplate.value = branch.customTemplate || '';
  branchFormTitle.textContent = `Edit Branch: ${branch.name}`;
  branchFormDrawer.classList.remove('hidden');
}

function closeBranchForm() {
  branchFormDrawer.classList.add('hidden');
}

async function saveBranchRecord() {
  const name = branchInputName.value.trim();
  const url = branchInputUrl.value.trim();
  const tab = branchInputTab.value.trim() || 'INQUIRY DETAILS 2026/27';
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
      res = await fetch(`/api/branches/${branchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, spreadsheetUrl: url, sheetName: tab, customTemplate: tpl })
      }).then(r => r.json());
    } else {
      res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, spreadsheetUrl: url, sheetName: tab, customTemplate: tpl })
      }).then(r => r.json());
    }

    if (res.success) {
      showToast(`Branch "${name}" saved.`, 'success');
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
  btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing...';

  try {
    const res = await fetch(`/api/branches/${id}/test`).then(r => r.json());
    if (res.success) {
      showToast(`Connected. Synced ${res.count} student rows.`, 'success');
      btnElement.className = 'test-branch-btn px-2.5 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-medium flex items-center gap-1.5';
      btnElement.innerHTML = `<i class="fa-solid fa-check"></i> ${res.count} rows`;
    } else {
      showToast(res.error || 'Branch connection failed', 'error');
      btnElement.className = 'test-branch-btn px-2.5 py-1.5 rounded-md bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-medium flex items-center gap-1.5';
      btnElement.innerHTML = '<i class="fa-solid fa-xmark"></i> Failed';
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setTimeout(() => {
      btnElement.disabled = false;
      btnElement.className = 'test-branch-btn btn-neutral px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5';
      btnElement.innerHTML = '<i class="fa-solid fa-plug text-[11px] text-[var(--text-muted)]"></i> Test';
    }, 4000);
  }
}

async function deleteBranchById(id) {
  try {
    const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' }).then(r => r.json());
    if (res.success) {
      showToast('Branch removed', 'info');
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

    if (authRes.signedIn && authRes.userEmail) {
      googleAuthStatusPill.textContent = 'Signed in';
      googleAuthStatusPill.className = 'px-2 py-0.5 text-[11px] font-medium rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      googleUserDisplayTitle.textContent = authRes.userEmail;
      googleUserDisplaySubtitle.textContent = 'Connected. Private Google Sheets access is active.';
      googleSignInBtn.classList.add('hidden');
      googleSignOutBtn.classList.remove('hidden');
    } else {
      googleAuthStatusPill.textContent = 'Not signed in';
      googleAuthStatusPill.className = 'px-2 py-0.5 text-[11px] font-medium rounded bg-[var(--bg-panel)] border border-[var(--border-hairline)] text-[var(--text-muted)]';
      googleUserDisplayTitle.textContent = 'Not signed in';
      googleUserDisplaySubtitle.textContent = 'Sign in to read private Sussex branch spreadsheets.';
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
      showToast('Settings saved.', 'success');
      settingsModal.classList.add('hidden');
      fetchAllState();
    } else {
      showToast(res.error || 'Failed to save settings', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveSettingsBtn.disabled = false;
    saveSettingsBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
  }
}

// Reset WhatsApp Session Handler
async function resetWhatsAppSession() {
  if (!confirm('Unlink the current WhatsApp session and generate a new QR code?')) {
    return;
  }

  showToast('Resetting WhatsApp session...', 'info');
  try {
    const res = await fetch('/api/whatsapp/reset', { method: 'POST' }).then(r => r.json());
    if (res.success) {
      showToast(res.message || 'Session reset. Scan the new QR code.', 'success');
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

// Load Delivery Log (`sent_log.json`)
async function loadLedgerRecords() {
  if (!ledgerList) return;
  try {
    const records = await fetch('/api/ledger').then(r => r.json());
    if (!records || records.length === 0) {
      ledgerList.innerHTML = '<div class="p-8 text-center text-xs text-[var(--text-muted)]">No delivered birthday wishes recorded yet.</div>';
    } else {
      ledgerList.innerHTML = records.map(rec => `
        <div class="px-5 py-3 flex items-center justify-between gap-4 text-xs hover:bg-[var(--bg-toolbar)] transition">
          <div class="min-w-0">
            <span class="font-mono text-emerald-700 dark:text-emerald-400 mr-2">[${escapeHtml(rec.dateSent)}]</span>
            <strong class="text-[var(--text-primary)]">${escapeHtml(rec.name)}</strong>
            <span class="font-mono text-[var(--text-secondary)] ml-1.5">(${escapeHtml(rec.phone)})</span>
            <span class="text-[var(--text-muted)] ml-2 text-[11px]">via ${escapeHtml(rec.method)}</span>
          </div>
          <span class="text-[var(--text-muted)] font-mono text-[11px] shrink-0">${new Date(rec.timestamp).toLocaleTimeString()}</span>
        </div>
      `).join('');
    }
  } catch (err) {
    showToast('Failed to load delivery log', 'error');
  }
}

// Manual Phone Number Dispatch Logic
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
    manualPhoneStatusBadge.className = 'text-[11px] font-mono text-[var(--text-muted)]';
  } else if (res.isValid) {
    manualPhoneStatusBadge.textContent = `Valid: ${res.formatted}`;
    manualPhoneStatusBadge.className = 'text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold';
  } else {
    manualPhoneStatusBadge.textContent = 'Invalid number format';
    manualPhoneStatusBadge.className = 'text-[11px] font-mono text-red-700 dark:text-red-400 font-semibold';
  }

  const msg = manualInputMessage ? (manualInputMessage.value.trim() || currentTemplate) : currentTemplate;
  if (manualDesktopAppLink) {
    manualDesktopAppLink.href = `whatsapp://send?phone=${res.digits}&text=${encodeURIComponent(msg)}`;
  }
}

function openManualSendModal() {
  if (!manualSendModal) return;

  if (manualInputBranch) {
    const opts = ['<option value="Sussex College Network">Sussex College Network</option>'];
    currentBranches.forEach(b => {
      opts.push(`<option value="${escapeHtml(b.name)}">${escapeHtml(b.name)}</option>`);
    });
    manualInputBranch.innerHTML = opts.join('');
  }

  if (manualInputMessage) {
    manualInputMessage.value = currentTemplate;
  }
  updateManualPhoneValidation();
  manualSendModal.classList.remove('hidden');
  setTimeout(() => {
    if (manualInputPhone) manualInputPhone.focus();
  }, 50);
}

function closeManualSendModal() {
  if (manualSendModal) manualSendModal.classList.add('hidden');
}

async function handleManualSendSubmit(e) {
  e.preventDefault();
  const phoneRaw = manualInputPhone.value.trim();
  const phoneInfo = sanitizeClientPhone(phoneRaw);
  if (!phoneInfo.isValid) {
    showToast('Enter a valid Sri Lankan mobile number (e.g. 07XXXXXXXX) or international number.', 'warning');
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
  submitManualSendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Sending...</span>';

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
      showToast(`Birthday wish sent to ${phoneInfo.formatted}.`, 'success');
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
  const savedTheme = localStorage.getItem('wishsync_theme') || 'light';
  updateThemeUI(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  // Workspace tabs
  if (tabBtnToday) tabBtnToday.addEventListener('click', () => switchWorkspaceTab('today'));
  if (tabBtnUpcoming) tabBtnUpcoming.addEventListener('click', () => switchWorkspaceTab('upcoming'));
  if (tabBtnLedger) tabBtnLedger.addEventListener('click', () => switchWorkspaceTab('ledger'));

  fetchAllState();

  setInterval(async () => {
    try {
      const waRes = await fetch('/api/whatsapp/status').then(r => r.json());
      updateWhatsAppUI(waRes);
    } catch (e) {}
  }, 3000);

  refreshDataBtn.addEventListener('click', () => {
    showToast('Syncing Google Sheets...', 'info');
    fetchAllState();
  });

  sendAllBtn.addEventListener('click', () => {
    cancelCountdown();
    dispatchBatchAll();
  });

  cancelCountdownBtn.addEventListener('click', cancelCountdown);
  dispatchNowBtn.addEventListener('click', () => {
    cancelCountdown();
    dispatchBatchAll();
  });

  if (toggleLedgerBtn) {
    toggleLedgerBtn.addEventListener('click', loadLedgerRecords);
  }

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
      loadBranchesManager();
      branchesModal.classList.remove('hidden');
    });
  }

  // Google Sign-In OAuth Listeners
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
      showToast(`Google account connected (${event.data.email}).`, 'success');
      loadSettingsIntoModal();
      fetchAllState();
    }
  });

  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', () => {
      let checks = 0;
      const pollInterval = setInterval(async () => {
        checks++;
        try {
          const authRes = await fetch('/api/auth/google/status').then(r => r.json());
          if (authRes.signedIn && authRes.userEmail) {
            clearInterval(pollInterval);
            showToast(`Connected to Google as ${authRes.userEmail}.`, 'success');
            loadSettingsIntoModal();
            fetchAllState();
          }
        } catch (e) {}
        if (checks > 60) clearInterval(pollInterval);
      }, 2000);
    });
  }

  if (googleSignOutBtn) {
    googleSignOutBtn.addEventListener('click', async () => {
      if (!confirm('Sign out from your Google Account?')) return;
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

  // QR Modal
  if (doneQrModalBtn) {
    doneQrModalBtn.addEventListener('click', () => qrModal.classList.add('hidden'));
  }
  if (resetSessionBtn) {
    resetSessionBtn.addEventListener('click', resetWhatsAppSession);
  }
  whatsappStatusBtn.addEventListener('click', async () => {
    const wa = currentStatus.whatsapp || {};
    if (wa.status === 'READY') {
      showToast(wa.user?.phone ? `WhatsApp connected (+${wa.user.phone})` : 'WhatsApp session is active.', 'success');
      return;
    }

    qrModal.classList.remove('hidden');

    if (wa.status === 'QR_READY' && wa.qrDataUrl) {
      qrImageElement.src = wa.qrDataUrl;
      qrImageElement.classList.remove('hidden');
      qrPlaceholder.classList.add('hidden');
    } else {
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
        showToast('Birthday message template saved.', 'success');
      }
    } catch (err) {
      showToast('Failed to save template', 'error');
    }
  });

  // Manual Send Modal
  if (openManualSendModalBtn) openManualSendModalBtn.addEventListener('click', openManualSendModal);
  if (navManualSendBtn) navManualSendBtn.addEventListener('click', openManualSendModal);
  if (closeManualSendModalBtn) closeManualSendModalBtn.addEventListener('click', closeManualSendModal);
  if (cancelManualSendBtn) cancelManualSendBtn.addEventListener('click', closeManualSendModal);
  if (manualInputPhone) manualInputPhone.addEventListener('input', updateManualPhoneValidation);
  if (manualInputMessage) manualInputMessage.addEventListener('input', updateManualPhoneValidation);
  if (manualResetTemplateBtn) {
    manualResetTemplateBtn.addEventListener('click', () => {
      manualInputMessage.value = currentTemplate;
      updateManualPhoneValidation();
    });
  }
  if (manualSendForm) {
    manualSendForm.addEventListener('submit', handleManualSendSubmit);
  }

  // Developer Modal
  const developerModal = document.getElementById('developerModal');
  const openDeveloperModalBtn = document.getElementById('openDeveloperModalBtn');
  const closeDeveloperModalBtn = document.getElementById('closeDeveloperModalBtn');
  const doneDeveloperModalBtn = document.getElementById('doneDeveloperModalBtn');

  if (developerModal) {
    const closeDeveloperModal = () => developerModal.classList.add('hidden');
    if (openDeveloperModalBtn) {
      openDeveloperModalBtn.addEventListener('click', () => developerModal.classList.remove('hidden'));
    }
    if (closeDeveloperModalBtn) closeDeveloperModalBtn.addEventListener('click', closeDeveloperModal);
    if (doneDeveloperModalBtn) doneDeveloperModalBtn.addEventListener('click', closeDeveloperModal);
  }

  // Close open dialogs on backdrop click or Escape key
  [branchesModal, settingsModal, qrModal, templateModal, manualSendModal, developerModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [branchesModal, settingsModal, qrModal, templateModal, manualSendModal, developerModal].forEach(modal => {
        if (modal && !modal.classList.contains('hidden')) {
          modal.classList.add('hidden');
        }
      });
    }
  });
});
