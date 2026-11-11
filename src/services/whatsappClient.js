const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');
const ledger = require('./ledger');
const matcher = require('./birthdayMatcher');
const settings = require('./settings');

let client = null;
let clientStatus = 'INITIALIZING'; // INITIALIZING, QR_READY, AUTHENTICATED, READY, DISCONNECTED, ERROR
let latestQrCode = null;
let latestQrDataUrl = null;
let clientInfo = null;
let isDispatching = false;
let retryTimeout = null;

// Ensure auth directory exists in writeable DATA_DIR
const authDataPath = path.join(config.DATA_DIR, '.wwebjs_auth');
if (!fs.existsSync(authDataPath)) {
  fs.mkdirSync(authDataPath, { recursive: true });
}

// Migrate existing auth directory from ROOT_DIR if present
const legacyAuthPath = path.join(config.ROOT_DIR, '.wwebjs_auth');
if (legacyAuthPath !== authDataPath && fs.existsSync(legacyAuthPath)) {
  try {
    const legacySession = path.join(legacyAuthPath, `session-${config.WHATSAPP_CLIENT_ID}`);
    const targetSession = path.join(authDataPath, `session-${config.WHATSAPP_CLIENT_ID}`);
    if (fs.existsSync(legacySession) && !fs.existsSync(targetSession)) {
      fs.cpSync(legacySession, targetSession, { recursive: true });
      console.log('[WhatsApp] Migrated active session to AppData storage.');
    }
  } catch (mErr) {
    console.warn('[WhatsApp] Session migration notice:', mErr.message);
  }
}

/**
 * Safely removes session directory if corrupted or logged out
 */
function cleanSessionFolder() {
  const sessionDir = path.join(authDataPath, `session-${config.WHATSAPP_CLIENT_ID}`);
  if (fs.existsSync(sessionDir)) {
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log('[WhatsApp] Cleaned session directory from disk.');
    } catch (e) {
      console.warn('[WhatsApp] Could not remove session directory:', e.message);
    }
  }
}

/**
 * Auto-detects local Chrome or Edge executable on Windows if available.
 */
function getSystemChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const standardPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];

  for (const p of standardPaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  return undefined;
}

/**
 * Returns random delay in milliseconds between min and max.
 */
function getRandomDelay(min = config.MIN_DISPATCH_DELAY_MS, max = config.MAX_DISPATCH_DELAY_MS) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep helper.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Initializes the WhatsApp Web client with LocalAuth.
 */
function initializeWhatsAppClient() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }

  if (client) {
    return client;
  }

  console.log('[WhatsApp] Initializing WhatsApp Client with LocalAuth...');
  clientStatus = 'INITIALIZING';

  try {
    const chromePath = getSystemChromePath();
    if (chromePath) {
      console.log(`[WhatsApp] Using detected system browser: ${chromePath}`);
    }

    client = new Client({
      authStrategy: new LocalAuth({
        clientId: config.WHATSAPP_CLIENT_ID,
        dataPath: authDataPath
      }),
      deviceName: 'WishSync',
      browserName: 'WishSync',
      puppeteer: {
        headless: true,
        executablePath: chromePath,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-default-browser-check',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--disable-background-networking',
          '--disable-software-rasterizer',
          '--mute-audio',
          '--no-pings',
          '--aggressive-cache-discard',
          '--disk-cache-size=15728640',
          '--media-cache-size=5242880',
          '--renderer-process-limit=1',
          '--disable-features=TranslateUI,BlinkGenPropertyTrees,AudioServiceOutOfProcess,MediaRouter,OptimizationHints,CalculateNativeWinOcclusion',
          '--js-flags=--max-old-space-size=192 --optimize-for-size'
        ]
      }
    });

    client.on('qr', async (qr) => {
      console.log('[WhatsApp] QR code received. Scan with your phone.');
      latestQrCode = qr;
      clientStatus = 'QR_READY';
      try {
        latestQrDataUrl = await qrcode.toDataURL(qr, { width: 280, margin: 2 });
      } catch (err) {
        console.error('[WhatsApp] Failed to generate QR data URL:', err.message);
      }
    });

    client.on('authenticated', () => {
      console.log('[WhatsApp] Client authenticated successfully.');
      clientStatus = 'AUTHENTICATED';
      latestQrCode = null;
      latestQrDataUrl = null;
    });

    client.on('auth_failure', async (msg) => {
      console.error('[WhatsApp] Authentication failure:', msg);
      clientStatus = 'AUTH_FAILURE';
      latestQrCode = null;
      latestQrDataUrl = null;
      try {
        await client.destroy();
      } catch (e) {}
      client = null;
      cleanSessionFolder();
      retryTimeout = setTimeout(() => initializeWhatsAppClient(), 2000);
    });

    client.on('ready', () => {
      console.log('[WhatsApp] Client is ready to send messages!');
      clientStatus = 'READY';
      latestQrCode = null;
      latestQrDataUrl = null;
      clientInfo = client.info || { wid: { user: 'Connected' } };
    });

    client.on('disconnected', async (reason) => {
      console.warn('[WhatsApp] Client disconnected:', reason);
      clientStatus = 'DISCONNECTED';
      clientInfo = null;
      latestQrCode = null;
      latestQrDataUrl = null;
      try {
        await client.destroy();
      } catch (e) {}
      client = null;

      cleanSessionFolder();
      console.log('[WhatsApp] Auto-recovering: generating fresh QR session in 2s...');
      retryTimeout = setTimeout(() => initializeWhatsAppClient(), 2000);
    });

    client.initialize().catch(async (err) => {
      console.error('[WhatsApp] Client initialization failed:', err.message);
      clientStatus = 'ERROR';
      try {
        await client.destroy();
      } catch (e) {}
      client = null;

      cleanSessionFolder();
      console.log('[WhatsApp] Retrying client initialization in 3 seconds...');
      retryTimeout = setTimeout(() => initializeWhatsAppClient(), 3000);
    });

  } catch (err) {
    console.error('[WhatsApp] Failed to instantiate WhatsApp client:', err.message);
    clientStatus = 'ERROR';
    cleanSessionFolder();
    retryTimeout = setTimeout(() => initializeWhatsAppClient(), 3000);
  }

  return client;
}

/**
 * Gets the current status of the WhatsApp client.
 */
function getStatus() {
  const hasLocalSession = fs.existsSync(path.join(authDataPath, `session-${config.WHATSAPP_CLIENT_ID}`));
  return {
    status: clientStatus,
    isReady: clientStatus === 'READY',
    hasSession: hasLocalSession,
    qrDataUrl: latestQrDataUrl,
    user: clientInfo ? { phone: clientInfo.wid?.user, pushname: clientInfo.pushname } : null,
    isDispatching
  };
}

/**
 * Generates desktop URI protocol and web links for manual/fallback dispatch.
 */
function generateFallbackLinks(phone, text) {
  const sanitized = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return {
    desktopUri: `whatsapp://send?phone=${sanitized}&text=${encodedText}`,
    webUrl: `https://web.whatsapp.com/send?phone=${sanitized}&text=${encodedText}`
  };
}

/**
 * Dispatches a message to a single student via whatsapp-web.js.
 */
async function sendWishToStudent(student, template = config.DEFAULT_TEMPLATE, force = false) {
  const today = matcher.getCurrentDateInTimezone();
  const phone = student.phone;
  const message = matcher.formatMessage(template, student);

  if (!phone || !student.isPhoneValid) {
    throw new Error(`Invalid phone number for student ${student.name}: ${student.phoneRaw}`);
  }

  // Deduplication check (unless force is requested, e.g. manual dispatch)
  if (!force && ledger.hasBeenSentThisYear(phone, today.year)) {
    console.log(`[WhatsApp] Skip: Wish already sent to ${student.name} (${phone}) for ${today.year}`);
    return {
      success: true,
      skipped: true,
      reason: 'ALREADY_SENT_THIS_YEAR',
      student
    };
  }

  if (clientStatus !== 'READY' || !client) {
    // Return fallback info if client is not ready
    const fallback = generateFallbackLinks(phone, message);
    throw new Error(`WhatsApp client not ready (Status: ${clientStatus}). Use desktop link: ${fallback.desktopUri}`);
  }

  const chatId = `${phone}@c.us`;
  console.log(`[WhatsApp] Sending message to ${student.name} (${chatId})...`);

  try {
    let sentMsg = null;
    let usedImage = false;

    // Check if birthday greeting image is configured and available
    try {
      const userSettings = settings.loadSettings();
      const imgConfig = userSettings.birthdayImage;
      const isImageEnabled = !imgConfig || imgConfig.enabled !== false;
      const candidatePaths = [
        imgConfig?.relativePath ? path.join(config.ROOT_DIR, imgConfig.relativePath) : null,
        imgConfig?.originalPath || null,
        path.join(config.DATA_DIR, 'assets', 'birthday-card.jpeg')
      ].filter(Boolean);

      const foundPath = candidatePaths.find(p => fs.existsSync(p));
      if (isImageEnabled && foundPath) {
        console.log(`[WhatsApp] Attaching birthday greeting image: ${foundPath}`);
        const media = MessageMedia.fromFilePath(foundPath);
        sentMsg = await client.sendMessage(chatId, media, { caption: message });
        usedImage = true;
      }
    } catch (imgErr) {
      console.warn('[WhatsApp] Could not send image greeting card, falling back to direct text:', imgErr.message);
    }

    if (!usedImage) {
      sentMsg = await client.sendMessage(chatId, message);
    }

    // Record in ledger immediately upon dispatch confirmation
    ledger.recordSent({
      phone,
      name: student.name,
      year: today.year,
      date: today.dateString,
      message,
      method: usedImage ? 'whatsapp-web.js (with greeting card image)' : 'whatsapp-web.js'
    });

    return {
      success: true,
      skipped: false,
      messageId: sentMsg?.id?._serialized || (typeof sentMsg?.id === 'string' ? sentMsg.id : `msg_${Date.now()}`),
      student,
      message,
      hasImage: usedImage
    };
  } catch (err) {
    console.error(`[WhatsApp] Failed to send message to ${student.name} (${phone}):`, err.message);
    throw err;
  }
}

/**
 * Dispatches birthday wishes to a list of students with anti-ban pacing.
 */
async function dispatchBatch(students, template = config.DEFAULT_TEMPLATE, onProgress = null) {
  if (isDispatching) {
    throw new Error('A batch dispatch is already in progress.');
  }

  isDispatching = true;
  const results = {
    total: students.length,
    successful: 0,
    skipped: 0,
    failed: 0,
    details: []
  };

  try {
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      try {
        if (onProgress) {
          onProgress({ index: i + 1, total: students.length, student, state: 'SENDING' });
        }

        const res = await sendWishToStudent(student, template);

        if (res.skipped) {
          results.skipped++;
          results.details.push({ student: student.name, phone: student.phone, status: 'SKIPPED' });
        } else {
          results.successful++;
          results.details.push({ student: student.name, phone: student.phone, status: 'SENT' });
        }

        if (onProgress) {
          onProgress({ index: i + 1, total: students.length, student, state: 'SUCCESS' });
        }

        // Anti-ban jitter delay if there are more students to send
        if (i < students.length - 1 && !res.skipped) {
          const delay = getRandomDelay();
          console.log(`[WhatsApp] Anti-ban pacing: Waiting ${Math.round(delay / 1000)}s before next message...`);
          if (onProgress) {
            onProgress({ index: i + 1, total: students.length, state: 'WAITING', delayMs: delay });
          }
          await sleep(delay);
        }

      } catch (err) {
        results.failed++;
        results.details.push({
          student: student.name,
          phone: student.phone,
          status: 'FAILED',
          error: err.message
        });

        if (onProgress) {
          onProgress({ index: i + 1, total: students.length, student, state: 'FAILED', error: err.message });
        }
      }
    }
  } finally {
    isDispatching = false;
  }

  return results;
}

/**
 * Resets the local WhatsApp session to allow re-pairing with a new phone.
 */
async function resetSession() {
  console.log('[WhatsApp] Resetting WhatsApp session...');
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  try {
    if (client) {
      try {
        await client.destroy();
      } catch (e) {}
      client = null;
    }
    clientStatus = 'INITIALIZING';
    clientInfo = null;
    latestQrCode = null;
    latestQrDataUrl = null;

    cleanSessionFolder();

    // Re-initialize fresh client
    initializeWhatsAppClient();
    return { success: true, message: 'Session reset initiated. Generating fresh QR code...' };
  } catch (err) {
    console.error('[WhatsApp] Error resetting session:', err.message);
    throw err;
  }
}

module.exports = {
  initializeWhatsAppClient,
  getStatus,
  sendWishToStudent,
  dispatchBatch,
  generateFallbackLinks,
  resetSession
};
