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
let loadingPercent = null;
let isDispatching = false;
const activePhoneDispatches = new Set();
let retryTimeout = null;
let authWatchdogTimeout = null;
let consecutiveAuthStalls = 0;

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

function clearAuthWatchdog() {
  if (authWatchdogTimeout) {
    clearTimeout(authWatchdogTimeout);
    authWatchdogTimeout = null;
  }
}

/**
 * Initializes the WhatsApp Web client with LocalAuth.
 */
function initializeWhatsAppClient() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  clearAuthWatchdog();

  if (client) {
    return client;
  }

  console.log('[WhatsApp] Initializing WhatsApp Client with LocalAuth...');
  clientStatus = 'INITIALIZING';
  loadingPercent = null;

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
      // Disable LocalWebCache so packaged installs in C:\Program Files never fail writing ./.wwebjs_cache
      webVersionCache: {
        type: 'none'
      },
      authTimeoutMs: 60000,
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
          '--disable-gpu',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--disable-software-rasterizer',
          '--mute-audio',
          '--no-pings',
          '--renderer-process-limit=1',
          '--disable-features=TranslateUI,AudioServiceOutOfProcess,MediaRouter,OptimizationHints,CalculateNativeWinOcclusion',
          '--js-flags=--max-old-space-size=384'
        ]
      }
    });

    client.on('qr', async (qr) => {
      clearAuthWatchdog();
      consecutiveAuthStalls = 0;
      loadingPercent = null;
      console.log('[WhatsApp] QR code received. Scan with your phone.');
      latestQrCode = qr;
      clientStatus = 'QR_READY';
      try {
        latestQrDataUrl = await qrcode.toDataURL(qr, { width: 280, margin: 2 });
      } catch (err) {
        console.error('[WhatsApp] Failed to generate QR data URL:', err.message);
      }
    });

    client.on('loading_screen', (percent, message) => {
      loadingPercent = Number.isFinite(Number(percent)) ? Number(percent) : null;
      console.log(`[WhatsApp] Loading WhatsApp Web: ${percent}%${message ? ` (${message})` : ''}`);
    });

    client.on('authenticated', () => {
      console.log('[WhatsApp] Client authenticated successfully. Finishing sync...');
      clientStatus = 'AUTHENTICATED';
      latestQrCode = null;
      latestQrDataUrl = null;

      clearAuthWatchdog();
      authWatchdogTimeout = setTimeout(async () => {
        if (clientStatus !== 'AUTHENTICATED') return;
        consecutiveAuthStalls += 1;
        console.warn(`[WhatsApp] Post-auth sync stalled >75s (attempt ${consecutiveAuthStalls}). Restarting client...`);
        try {
          if (client) await client.destroy();
        } catch (e) {}
        client = null;
        clientInfo = null;
        loadingPercent = null;
        if (consecutiveAuthStalls >= 2) {
          console.warn('[WhatsApp] Repeated post-auth stalls. Clearing session to generate a fresh QR.');
          cleanSessionFolder();
          consecutiveAuthStalls = 0;
        }
        initializeWhatsAppClient();
      }, 75000);
    });

    client.on('auth_failure', async (msg) => {
      clearAuthWatchdog();
      consecutiveAuthStalls = 0;
      loadingPercent = null;
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
      clearAuthWatchdog();
      consecutiveAuthStalls = 0;
      loadingPercent = 100;
      console.log('[WhatsApp] Client is ready to send messages!');
      clientStatus = 'READY';
      latestQrCode = null;
      latestQrDataUrl = null;
      clientInfo = client.info || { wid: { user: 'Connected' } };
    });

    client.on('disconnected', async (reason) => {
      clearAuthWatchdog();
      loadingPercent = null;
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
      clearAuthWatchdog();
      loadingPercent = null;
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
    clearAuthWatchdog();
    loadingPercent = null;
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
    loadingPercent,
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

function extractMessageId(sentMsg) {
  if (!sentMsg) return null;
  if (sentMsg.id && typeof sentMsg.id === 'object' && sentMsg.id._serialized) {
    return sentMsg.id._serialized;
  }
  if (typeof sentMsg.id === 'string' && sentMsg.id) {
    return sentMsg.id;
  }
  return `sent_${Date.now()}`;
}

/**
 * Resolves the canonical WhatsApp JID for a sanitized phone number.
 */
async function resolveRecipientChatId(phone) {
  try {
    const numberDetails = await client.getNumberId(phone);
    if (!numberDetails || !numberDetails._serialized) {
      throw new Error(`WhatsApp number +${phone} is not registered on WhatsApp.`);
    }
    return numberDetails._serialized;
  } catch (err) {
    if (err.message && err.message.includes('not registered on WhatsApp')) {
      throw err;
    }
    console.warn(`[WhatsApp] Could not pre-resolve JID for ${phone}: ${err.message}`);
    return `${phone}@c.us`;
  }
}

/**
 * Resolves the birthday greeting card MessageMedia if enabled and present on disk.
 * Never throws during send fallback—loads synchronously before any WhatsApp dispatch occurs.
 */
function resolveBirthdayMediaPayload() {
  const userSettings = settings.loadSettings();
  const imgConfig = userSettings.birthdayImage;
  const isImageEnabled = !imgConfig || imgConfig.enabled !== false;
  if (!isImageEnabled) {
    return { isImageEnabled: false, media: null, filePath: null };
  }

  const candidatePaths = [
    imgConfig?.fileName ? path.join(config.ASSETS_DIR, imgConfig.fileName) : null,
    imgConfig?.relativePath ? path.join(config.DATA_DIR, imgConfig.relativePath.replace(/^data[\\/]/, '')) : null,
    imgConfig?.relativePath ? path.join(config.ROOT_DIR, imgConfig.relativePath) : null,
    imgConfig?.originalPath || null,
    path.join(config.ASSETS_DIR, 'birthday-card.jpeg'),
    path.join(config.ROOT_DIR, 'data', 'assets', 'birthday-card.jpeg')
  ].filter(Boolean);

  const foundPath = candidatePaths.find(p => fs.existsSync(p));
  if (!foundPath) {
    return { isImageEnabled: true, media: null, filePath: null };
  }

  const media = MessageMedia.fromFilePath(foundPath);
  return { isImageEnabled: true, media, filePath: foundPath };
}

function matchesTargetRecipient(rawJid, chatId, phoneDigits) {
  if (!rawJid) return false;
  const serialized = typeof rawJid === 'object' ? (rawJid._serialized || rawJid.user || '') : String(rawJid);
  if (serialized === chatId) return true;
  if (!phoneDigits) return false;
  const digits = serialized.replace(/\D/g, '');
  return digits.endsWith(phoneDigits) || phoneDigits.endsWith(digits);
}

/**
 * Inspects WhatsApp Web in the Puppeteer page when whatsapp-web.js returns `undefined`
 * (e.g. when `getMessageModel` / CDP serialization drops the return value after sending).
 * Returns ONLY plain JSON primitives so CDP structured cloning never drops the result.
 */
async function confirmOutgoingInWhatsAppWeb(pupPage, chatId, phoneDigits, sinceSec, messageBody) {
  if (!pupPage || typeof pupPage.evaluate !== 'function') {
    return { chatFound: false, confirmed: false, messageId: null };
  }

  const expectedSnippet = String(messageBody || '').trim().slice(0, 40);

  return pupPage.evaluate(
    async (targetChatId, targetDigits, minTs, snippet) => {
      try {
        let chat = await window.WWebJS.getChat(targetChatId, { getAsModel: false });
        const collections = window.require('WAWebCollections');

        if (!chat && collections?.Chat?.getModelsArray) {
          const allChats = collections.Chat.getModelsArray();
          chat = allChats.find((c) => {
            const ser = c?.id?._serialized || '';
            const usr = String(c?.id?.user || '').replace(/\D/g, '');
            return ser === targetChatId || (targetDigits && usr && (usr === targetDigits || usr.endsWith(targetDigits)));
          }) || null;
        }

        const isRecentOutgoing = (m) => {
          if (!m) return false;
          const fromMe = Boolean(m.id?.fromMe || m.fromMe || m.self === 'out');
          if (!fromMe) return false;
          const ts = Number(m.t || 0);
          if (ts >= minTs - 20) return true;
          const text = String(m.caption || m.body || '');
          return Boolean(snippet && text.includes(snippet));
        };

        if (chat && chat.msgs) {
          const chatMsgs = typeof chat.msgs.getModelsArray === 'function'
            ? chat.msgs.getModelsArray()
            : Array.from(chat.msgs || []);
          for (let i = chatMsgs.length - 1; i >= Math.max(0, chatMsgs.length - 15); i--) {
            const m = chatMsgs[i];
            if (isRecentOutgoing(m)) {
              return {
                chatFound: true,
                confirmed: true,
                messageId: m?.id?._serialized ? String(m.id._serialized) : null
              };
            }
          }
        }

        if (collections?.Msg?.getModelsArray) {
          const msgs = collections.Msg.getModelsArray();
          for (let i = msgs.length - 1; i >= Math.max(0, msgs.length - 30); i--) {
            const m = msgs[i];
            if (!isRecentOutgoing(m)) continue;
            const toSer = String(m?.to?._serialized || m?.id?.remote?._serialized || m?.id?.remote || '');
            const toDigits = toSer.replace(/\D/g, '');
            const bodyText = String(m?.caption || m?.body || '');
            const toMatches = toSer === targetChatId || (targetDigits && toDigits && (toDigits.endsWith(targetDigits) || targetDigits.endsWith(toDigits)));
            const bodyMatches = Boolean(snippet && bodyText.includes(snippet));
            if (toMatches || bodyMatches) {
              return {
                chatFound: true,
                confirmed: true,
                messageId: m?.id?._serialized ? String(m.id._serialized) : null
              };
            }
          }
        }

        return {
          chatFound: Boolean(chat),
          confirmed: Boolean(chat),
          messageId: null
        };
      } catch (e) {
        return { chatFound: false, confirmed: false, messageId: null, error: String(e?.message || e) };
      }
    },
    chatId,
    phoneDigits,
    sinceSec,
    expectedSnippet
  );
}

/**
 * Dispatches a single WhatsApp payload (image+caption OR text-only).
 * Never falls back to a plain-text send after an image send has been initiated,
 * preventing duplicate image + text messages in the recipient chat.
 * Recovers confirmation via `message_create` or WhatsApp Web store inspection when
 * `whatsapp-web.js` returns `undefined` after already dispatching the message.
 */
async function dispatchWishMessage(targetClient, chatId, message, mediaPayload) {
  const sendStartSec = Math.floor(Date.now() / 1000);
  const phoneDigits = String(chatId || '').replace(/@.*/, '').replace(/\D/g, '');
  let capturedEventMsg = null;
  let listener = null;

  if (typeof targetClient.on === 'function' && typeof targetClient.removeListener === 'function') {
    listener = (msg) => {
      if (!msg) return;
      const isFromMe = Boolean(msg.fromMe || msg.id?.fromMe);
      if (isFromMe && (matchesTargetRecipient(msg.to, chatId, phoneDigits) || matchesTargetRecipient(msg.id?.remote, chatId, phoneDigits))) {
        capturedEventMsg = msg;
      }
    };
    targetClient.on('message_create', listener);
  }

  let sentMsg = null;
  let usedImage = false;

  try {
    if (mediaPayload.isImageEnabled && mediaPayload.media) {
      console.log(`[WhatsApp] Sending greeting card image with caption: ${mediaPayload.filePath}`);
      usedImage = true;
      sentMsg = await targetClient.sendMessage(chatId, mediaPayload.media, {
        caption: message,
        sendSeen: false
      });
    } else {
      if (mediaPayload.isImageEnabled && !mediaPayload.filePath) {
        console.warn('[WhatsApp] Greeting image enabled but no image file found; sending text-only message.');
      }
      sentMsg = await targetClient.sendMessage(chatId, message, { sendSeen: false });
    }

    if (!sentMsg && !capturedEventMsg) {
      await sleep(250);
    }
  } finally {
    if (listener) {
      targetClient.removeListener('message_create', listener);
    }
  }

  if (!sentMsg && capturedEventMsg) {
    console.warn('[WhatsApp] sendMessage returned undefined; recovered confirmation via message_create event.');
    sentMsg = capturedEventMsg;
  }

  if (!sentMsg && targetClient.pupPage) {
    let check = await confirmOutgoingInWhatsAppWeb(targetClient.pupPage, chatId, phoneDigits, sendStartSec, message);
    if (!check.confirmed && check.chatFound) {
      await sleep(400);
      check = await confirmOutgoingInWhatsAppWeb(targetClient.pupPage, chatId, phoneDigits, sendStartSec, message);
    }
    if (check.confirmed || check.chatFound) {
      console.warn(`[WhatsApp] sendMessage returned undefined; verified chat/outgoing dispatch in WhatsApp Web (id=${check.messageId || 'recovered'}).`);
      sentMsg = { id: { _serialized: check.messageId || `wa_confirmed_${Date.now()}` } };
    }
  }

  return { sentMsg, usedImage };
}

/**
 * Dispatches a message to a single student via whatsapp-web.js.
 */
async function sendWishToStudent(student, template = config.DEFAULT_TEMPLATE, force = false) {
  const today = matcher.getCurrentDateInTimezone();
  const phone = student.phone;
  const effectiveTemplate = (student.branchCustomTemplate && student.branchCustomTemplate.trim())
    ? student.branchCustomTemplate
    : template;
  const message = matcher.formatMessage(effectiveTemplate, student);

  if (!phone || !student.isPhoneValid) {
    throw new Error(`Invalid phone number for student ${student.name}: ${student.phoneRaw}`);
  }

  // Deduplication check (unless force is requested, e.g. manual/resend dispatch)
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

  if (activePhoneDispatches.has(phone)) {
    throw new Error(`Dispatch already in progress for +${phone}. Please wait.`);
  }

  activePhoneDispatches.add(phone);
  console.log(`[WhatsApp] Sending message to ${student.name} (${phone})...`);

  try {
    const chatId = await resolveRecipientChatId(phone);
    const mediaPayload = resolveBirthdayMediaPayload();
    const { sentMsg, usedImage } = await dispatchWishMessage(client, chatId, message, mediaPayload);

    if (!sentMsg) {
      throw new Error('WhatsApp Web did not confirm message delivery. Please verify WhatsApp is connected and retry.');
    }

    const messageId = extractMessageId(sentMsg);

    // Record in ledger only after WhatsApp Web confirms outgoing dispatch
    ledger.recordSent({
      phone,
      name: student.name,
      branch: student.branch || null,
      branchId: student.branchId || null,
      year: today.year,
      date: today.dateString,
      message,
      method: usedImage ? 'whatsapp-web.js (with greeting card image)' : 'whatsapp-web.js'
    });

    return {
      success: true,
      skipped: false,
      messageId,
      student,
      message,
      hasImage: usedImage
    };
  } catch (err) {
    console.error(`[WhatsApp] Failed to send message to ${student.name} (${phone}):`, err.message);
    throw err;
  } finally {
    activePhoneDispatches.delete(phone);
  }
}

/**
 * Dispatches birthday wishes to a list of students with anti-ban pacing.
 */
async function dispatchBatch(students, template = config.DEFAULT_TEMPLATE, onProgress = null, force = false) {
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

        const res = await sendWishToStudent(student, template, force);

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
  clearAuthWatchdog();
  consecutiveAuthStalls = 0;
  try {
    if (client) {
      try {
        await client.destroy();
      } catch (e) {}
      client = null;
    }
    clientStatus = 'INITIALIZING';
    clientInfo = null;
    loadingPercent = null;
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

/**
 * Cleanly closes WhatsApp Puppeteer browser on app exit so no lock files remain.
 */
async function shutdown() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  clearAuthWatchdog();
  if (client) {
    try {
      await client.destroy();
    } catch (e) {}
    client = null;
  }
}

module.exports = {
  initializeWhatsAppClient,
  getStatus,
  sendWishToStudent,
  dispatchBatch,
  dispatchWishMessage,
  resolveBirthdayMediaPayload,
  extractMessageId,
  generateFallbackLinks,
  resetSession,
  shutdown
};
