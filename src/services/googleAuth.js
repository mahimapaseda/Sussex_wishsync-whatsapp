const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const config = require('../config/env');
const settings = require('./settings');

const TOKEN_PATH = path.join(config.DATA_DIR, 'google_token.json');
const REDIRECT_URI = `http://localhost:${config.PORT}/auth/google/callback`;

// Default Google OAuth2 scopes for reading user email and spreadsheets
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  SHEETS_SCOPE
];

/**
 * Checks whether an OAuth token payload includes Google Sheets read permission.
 */
function hasSheetsScope(tokens) {
  if (!tokens || typeof tokens.scope !== 'string') return true;
  const granted = tokens.scope.split(/\s+/).filter(Boolean);
  return granted.includes(SHEETS_SCOPE) || granted.includes('https://www.googleapis.com/auth/spreadsheets');
}

/**
 * Creates and returns configured OAuth2 client.
 */
function getOAuth2Client() {
  const currentSettings = settings.loadSettings();
  const clientId = currentSettings.googleClientId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = currentSettings.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  );

  // If saved tokens exist, attach them
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const raw = fs.readFileSync(TOKEN_PATH, 'utf8');
      const tokens = JSON.parse(raw);
      oauth2Client.setCredentials(tokens);

      // Listen for token updates (e.g. automatic refresh)
      oauth2Client.on('tokens', (newTokens) => {
        saveTokens({ ...tokens, ...newTokens });
      });
    } catch (e) {
      console.error('[GoogleAuth] Error loading existing tokens:', e.message);
    }
  }

  return oauth2Client;
}

/**
 * Generates Google Sign-In consent URL.
 */
function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Google Client ID and Client Secret must be configured in Settings first.');
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Requests refresh_token
    prompt: 'consent',     // Ensures refresh_token & scope checkboxes are shown
    include_granted_scopes: true,
    scope: SCOPES
  });
}

/**
 * Saves tokens securely to disk.
 */
function saveTokens(tokens) {
  try {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf8');
    console.log('[GoogleAuth] Google OAuth tokens saved successfully.');
  } catch (err) {
    console.error('[GoogleAuth] Failed to save tokens:', err.message);
  }
}

/**
 * Exchanges authorization code for tokens and retrieves user info.
 */
async function handleCallback(code) {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('OAuth2 client not initialized');
  }

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Fetch logged in user's profile info
  let userEmail = 'Google User';
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    userEmail = userInfo.data.email || 'Google User';
  } catch (e) {
    console.warn('[GoogleAuth] Could not fetch user profile:', e.message);
  }

  // Reject partial consent if user left "See all your Google Spreadsheets" unchecked
  if (!hasSheetsScope(tokens)) {
    console.warn(`[GoogleAuth] Login for ${userEmail} lacked Google Spreadsheets scope.`);
    return { success: false, missingSheetsScope: true, email: userEmail };
  }

  const tokenData = {
    ...tokens,
    userEmail,
    signedInAt: new Date().toISOString()
  };

  saveTokens(tokenData);

  // Update settings with user email
  settings.updateSettings({
    googleUserEmail: userEmail,
    googleAuthConnected: true
  });

  return { success: true, email: userEmail };
}

/**
 * Checks current Google Sign-in status.
 */
function getAuthStatus() {
  const currentSettings = settings.loadSettings();
  const hasClientId = Boolean(currentSettings.googleClientId || process.env.GOOGLE_CLIENT_ID);
  const hasSecret = Boolean(currentSettings.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET);
  const hasToken = fs.existsSync(TOKEN_PATH);

  let userEmail = currentSettings.googleUserEmail || null;
  let sheetsScopeGranted = false;
  if (hasToken) {
    try {
      const raw = fs.readFileSync(TOKEN_PATH, 'utf8');
      const data = JSON.parse(raw);
      if (!userEmail) userEmail = data.userEmail || null;
      sheetsScopeGranted = hasSheetsScope(data);
    } catch (e) {}
  }

  return {
    configured: hasClientId && hasSecret,
    signedIn: hasToken && Boolean(userEmail),
    hasSheetsScope: sheetsScopeGranted,
    userEmail,
    clientIdConfigured: hasClientId,
    clientSecretConfigured: hasSecret
  };
}

/**
 * Signs out and deletes local Google OAuth tokens.
 */
function signOut() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
    settings.updateSettings({
      googleUserEmail: null,
      googleAuthConnected: false
    });
    console.log('[GoogleAuth] Signed out and cleared local OAuth token.');
    return { success: true, message: 'Signed out successfully.' };
  } catch (err) {
    console.error('[GoogleAuth] Error signing out:', err.message);
    throw err;
  }
}

/**
 * Returns an authenticated sheets API client if user is signed in.
 */
function getAuthenticatedSheetsClient() {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client || !fs.existsSync(TOKEN_PATH)) {
    return null;
  }
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

module.exports = {
  getOAuth2Client,
  getAuthUrl,
  handleCallback,
  getAuthStatus,
  signOut,
  getAuthenticatedSheetsClient,
  TOKEN_PATH
};

