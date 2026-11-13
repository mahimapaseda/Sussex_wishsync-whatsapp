const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const config = require('../config/env');
const settings = require('./settings');
const pkg = require('../../package.json');

let embeddedSecrets = {};
try {
  embeddedSecrets = require('../config/oauth.secrets');
} catch (e) {}

/**
 * Updater State Machine
 * Status values: 'IDLE' | 'CHECKING' | 'AVAILABLE' | 'UP_TO_DATE' | 'DOWNLOADING' | 'READY_TO_INSTALL' | 'ERROR'
 */
const updaterState = {
  status: 'IDLE',
  currentVersion: pkg.version || '1.2.0',
  updateInfo: null,
  progress: {
    percent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    downloadedMB: '0.0',
    totalMB: '0.0',
    speedKBps: 0
  },
  downloadedFilePath: null,
  error: null,
  lastCheckedAt: null
};

let activeDownloadReq = null;
let activeFileStream = null;

/**
 * Returns effective GitHub credentials and repository targets.
 */
function getGitHubConfig() {
  const userSettings = settings.loadSettings();
  const token = (
    userSettings.githubToken ||
    process.env.GITHUB_TOKEN ||
    embeddedSecrets.GITHUB_TOKEN ||
    config.GITHUB_TOKEN ||
    ''
  ).trim();

  const owner = (
    userSettings.githubRepoOwner ||
    process.env.GITHUB_REPO_OWNER ||
    embeddedSecrets.GITHUB_REPO_OWNER ||
    config.GITHUB_REPO_OWNER ||
    'mahimapaseda'
  ).trim();

  const repo = (
    userSettings.githubRepoName ||
    process.env.GITHUB_REPO_NAME ||
    embeddedSecrets.GITHUB_REPO_NAME ||
    config.GITHUB_REPO_NAME ||
    'Sussex_wishsync-whatsapp'
  ).trim();

  return { token, owner, repo };
}

/**
 * Parses a semantic version string (e.g., 'v1.2.0', '1.2.0-beta') into numeric [major, minor, patch].
 */
function parseSemver(v) {
  if (!v) return [0, 0, 0];
  const clean = String(v).trim().replace(/^[vV]/, '');
  const [core] = clean.split('-');
  const parts = core.split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

/**
 * Compares two semantic version strings.
 * Returns 1 if v1 > v2, -1 if v1 < v2, and 0 if equal.
 */
function compareSemver(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);
  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}

function isNewerVersion(remote, local) {
  return compareSemver(remote, local) > 0;
}

/**
 * Locates the target installer asset inside the GitHub release assets array.
 * Prioritizes NSIS Setup executable (e.g., "WishSync Setup 1.2.0.exe"), then any ".exe".
 */
function findInstallerAsset(assets) {
  if (!Array.isArray(assets) || assets.length === 0) return null;
  const setupAsset = assets.find(a => /setup.*\.exe$/i.test(a.name));
  if (setupAsset) return setupAsset;
  const anyExe = assets.find(a => /\.exe$/i.test(a.name));
  if (anyExe) return anyExe;
  return assets[0] || null;
}

/**
 * Gets the current in-memory updater status.
 */
function getStatus() {
  const ghConfig = getGitHubConfig();
  return {
    ...updaterState,
    hasTokenConfigured: Boolean(ghConfig.token),
    repoOwner: ghConfig.owner,
    repoName: ghConfig.repo
  };
}

/**
 * Checks GitHub Releases for updates.
 */
function checkForUpdates(customConfig = {}) {
  const ghConfig = { ...getGitHubConfig(), ...customConfig };
  const currentVersion = updaterState.currentVersion;

  updaterState.status = 'CHECKING';
  updaterState.error = null;

  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/repos/${encodeURIComponent(ghConfig.owner)}/${encodeURIComponent(ghConfig.repo)}/releases/latest`;
    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'WishSync-Updater',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    if (ghConfig.token) {
      headers['Authorization'] = `Bearer ${ghConfig.token}`;
    }

    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        updaterState.lastCheckedAt = new Date().toISOString();

        if (res.statusCode === 401) {
          const err = new Error('GitHub authentication failed: Token is invalid or expired.');
          updaterState.status = 'ERROR';
          updaterState.error = err.message;
          return reject(err);
        }
        if (res.statusCode === 404) {
          const err = new Error(`Repository "${ghConfig.owner}/${ghConfig.repo}" not found or private. Please ensure your GitHub Token has read permissions.`);
          updaterState.status = 'ERROR';
          updaterState.error = err.message;
          return reject(err);
        }
        if (res.statusCode === 403) {
          const err = new Error('GitHub API rate limit exceeded or access forbidden. Check token permissions.');
          updaterState.status = 'ERROR';
          updaterState.error = err.message;
          return reject(err);
        }
        if (res.statusCode !== 200) {
          const err = new Error(`GitHub API error (HTTP ${res.statusCode}): ${data.slice(0, 150)}`);
          updaterState.status = 'ERROR';
          updaterState.error = err.message;
          return reject(err);
        }

        try {
          const release = JSON.parse(data);
          const rawTag = release.tag_name || '';
          const remoteVersion = rawTag.replace(/^[vV]/, '');
          const isAvailable = isNewerVersion(remoteVersion, currentVersion);
          const targetAsset = findInstallerAsset(release.assets);

          const updateInfo = {
            releaseId: release.id,
            tagName: rawTag,
            version: remoteVersion,
            releaseName: release.name || rawTag,
            releaseNotes: release.body || 'No release notes provided.',
            publishedAt: release.published_at,
            htmlUrl: release.html_url,
            asset: targetAsset ? {
              id: targetAsset.id,
              name: targetAsset.name,
              size: targetAsset.size,
              apiUrl: targetAsset.url,
              contentType: targetAsset.content_type
            } : null
          };

          updaterState.updateInfo = updateInfo;
          updaterState.status = isAvailable ? 'AVAILABLE' : 'UP_TO_DATE';

          resolve({
            updateAvailable: isAvailable,
            currentVersion,
            latestVersion: remoteVersion,
            updateInfo
          });
        } catch (parseErr) {
          updaterState.status = 'ERROR';
          updaterState.error = `Failed to parse release response: ${parseErr.message}`;
          reject(parseErr);
        }
      });
    });

    req.on('error', (err) => {
      updaterState.status = 'ERROR';
      updaterState.error = `Network error connecting to GitHub: ${err.message}`;
      updaterState.lastCheckedAt = new Date().toISOString();
      reject(err);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      const timeoutErr = new Error('GitHub API request timed out after 15 seconds.');
      updaterState.status = 'ERROR';
      updaterState.error = timeoutErr.message;
      reject(timeoutErr);
    });
  });
}

/**
 * Downloads a private release asset binary from the GitHub API.
 * CRITICAL: When GitHub redirects to AWS S3 storage (HTTP 302 Found),
 * the Authorization header MUST be stripped to prevent S3 rejection.
 */
function downloadReleaseAsset(assetApiUrl, targetFilePath, token, onProgress) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(assetApiUrl);
    const initialHeaders = {
      'User-Agent': 'WishSync-Updater',
      'Accept': 'application/octet-stream',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) {
      initialHeaders['Authorization'] = `Bearer ${token}`;
    }

    const startDownload = (downloadUrl, headers, isRedirect = false) => {
      const isHttps = downloadUrl.startsWith('https:');
      const client = isHttps ? https : http;

      const req = client.get(downloadUrl, { headers }, (res) => {
        // Handle 302/301 redirect to storage (AWS S3)
        if (res.statusCode === 302 || res.statusCode === 301) {
          const redirectLocation = res.headers.location;
          if (!redirectLocation) {
            return reject(new Error('Redirect location missing in GitHub asset response.'));
          }

          // Strip GitHub Authorization header when following cross-origin redirect to AWS S3
          const s3Headers = {
            'User-Agent': 'WishSync-Updater',
            'Accept': '*/*'
          };

          return startDownload(redirectLocation, s3Headers, true);
        }

        if (res.statusCode !== 200) {
          let errBody = '';
          res.on('data', c => { errBody += c; });
          res.on('end', () => {
            reject(new Error(`Failed to download update binary (HTTP ${res.statusCode}): ${errBody.slice(0, 150)}`));
          });
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastTime = Date.now();
        let lastDownloaded = 0;

        const fileStream = fs.createWriteStream(targetFilePath);
        activeFileStream = fileStream;

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const now = Date.now();
          let speedKBps = updaterState.progress.speedKBps;

          if (now - lastTime >= 500) {
            const timeDiffSec = (now - lastTime) / 1000;
            const bytesDiff = downloadedBytes - lastDownloaded;
            speedKBps = Math.round((bytesDiff / 1024) / timeDiffSec);
            lastTime = now;
            lastDownloaded = downloadedBytes;
          }

          const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
          const progressPayload = {
            percent,
            downloadedBytes,
            totalBytes,
            downloadedMB: (downloadedBytes / (1024 * 1024)).toFixed(1),
            totalMB: (totalBytes / (1024 * 1024)).toFixed(1),
            speedKBps
          };

          updaterState.progress = progressPayload;
          if (typeof onProgress === 'function') {
            onProgress(progressPayload);
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            activeFileStream = null;
            activeDownloadReq = null;
            resolve({
              filePath: targetFilePath,
              totalBytes,
              downloadedBytes
            });
          });
        });

        fileStream.on('error', (err) => {
          activeFileStream = null;
          activeDownloadReq = null;
          try { fs.unlinkSync(targetFilePath); } catch (e) {}
          reject(err);
        });
      });

      activeDownloadReq = req;

      req.on('error', (err) => {
        activeDownloadReq = null;
        try { fs.unlinkSync(targetFilePath); } catch (e) {}
        reject(err);
      });
    };

    startDownload(assetApiUrl, initialHeaders, false);
  });
}

/**
 * Initiates the download for the currently detected update.
 */
async function downloadUpdate(onProgress) {
  if (!updaterState.updateInfo || !updaterState.updateInfo.asset) {
    throw new Error('No update asset available to download. Check for updates first.');
  }

  const { token } = getGitHubConfig();
  const asset = updaterState.updateInfo.asset;
  const updateDir = path.join(os.tmpdir(), 'WishSync-Updates');

  if (!fs.existsSync(updateDir)) {
    fs.mkdirSync(updateDir, { recursive: true });
  }

  const targetPath = path.join(updateDir, asset.name);

  updaterState.status = 'DOWNLOADING';
  updaterState.progress = {
    percent: 0,
    downloadedBytes: 0,
    totalBytes: asset.size || 0,
    downloadedMB: '0.0',
    totalMB: ((asset.size || 0) / (1024 * 1024)).toFixed(1),
    speedKBps: 0
  };
  updaterState.error = null;

  try {
    const result = await downloadReleaseAsset(asset.apiUrl, targetPath, token, (prog) => {
      if (typeof onProgress === 'function') onProgress(prog);
    });

    updaterState.status = 'READY_TO_INSTALL';
    updaterState.downloadedFilePath = result.filePath;
    updaterState.progress.percent = 100;

    return {
      success: true,
      filePath: result.filePath,
      fileSize: result.downloadedBytes
    };
  } catch (err) {
    updaterState.status = 'ERROR';
    updaterState.error = `Download failed: ${err.message}`;
    throw err;
  }
}

/**
 * Spawns the downloaded installer and gracefully exits the current app so files are unlocked.
 */
function installUpdate() {
  const filePath = updaterState.downloadedFilePath;
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Downloaded installer not found at "${filePath}". Please download the update again.`);
  }

  console.log(`[Updater] Launching update installer: ${filePath}`);

  // Launch detached installer process
  const child = spawn(filePath, [], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  });
  child.unref();

  // Clean shutdown of Express & Electron
  setTimeout(async () => {
    try {
      if (global.wishSyncQuitApp && typeof global.wishSyncQuitApp === 'function') {
        await global.wishSyncQuitApp();
      } else {
        process.exit(0);
      }
    } catch (e) {
      process.exit(0);
    }
  }, 1200);

  return { success: true, message: 'Installer launched. WishSync will now close to complete the update.' };
}

/**
 * Cancels any active download in progress.
 */
function cancelDownload() {
  if (activeDownloadReq) {
    try { activeDownloadReq.destroy(); } catch (e) {}
    activeDownloadReq = null;
  }
  if (activeFileStream) {
    try { activeFileStream.close(); } catch (e) {}
    activeFileStream = null;
  }
  if (updaterState.status === 'DOWNLOADING') {
    updaterState.status = updaterState.updateInfo ? 'AVAILABLE' : 'IDLE';
  }
  return { success: true };
}

module.exports = {
  getStatus,
  parseSemver,
  compareSemver,
  isNewerVersion,
  findInstallerAsset,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  cancelDownload,
  getGitHubConfig
};

