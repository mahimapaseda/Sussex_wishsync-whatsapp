const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const screenshotPath = path.join(ROOT_DIR, 'docs', 'screenshots', 'dashboard-dark.png');
let screenshotBase64 = '';
if (fs.existsSync(screenshotPath)) {
  screenshotBase64 = 'data:image/png;base64,' + fs.readFileSync(screenshotPath).toString('base64');
}

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sussex College Systems Architecture - Mahima Paseda</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-bg: #070D18;
      --color-surface: #0E1726;
      --color-surface-hover: #152238;
      --color-surface-card: rgba(14, 23, 38, 0.85);
      --color-border: rgba(255, 255, 255, 0.08);
      --color-border-glow: rgba(59, 130, 246, 0.3);
      --color-primary: #3B82F6;
      --color-primary-glow: rgba(59, 130, 246, 0.15);
      --color-emerald: #10B981;
      --color-emerald-glow: rgba(16, 185, 129, 0.15);
      --color-amber: #F59E0B;
      --color-amber-glow: rgba(245, 158, 11, 0.15);
      --color-text-main: #F8FAFC;
      --color-text-muted: #94A3B8;
      --color-text-dim: #64748B;
      --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-heading: 'Space Grotesk', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background: var(--color-bg);
      color: var(--color-text-main);
      font-family: var(--font-body);
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      user-select: none;
    }

    /* Ambient background lighting */
    .ambient-glow {
      position: fixed;
      top: -20%;
      right: -10%;
      width: 60vw;
      height: 60vw;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }
    .ambient-glow-2 {
      position: fixed;
      bottom: -20%;
      left: -10%;
      width: 50vw;
      height: 50vw;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    /* Top Progress Bar */
    .progress-bar-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: rgba(255, 255, 255, 0.04);
      z-index: 100;
    }
    .progress-bar-fill {
      height: 100%;
      width: 33.33%;
      background: linear-gradient(90deg, #3B82F6, #10B981, #F59E0B);
      transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Top Brand Bar */
    .top-brand-bar {
      position: fixed;
      top: 14px;
      left: 36px;
      right: 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 90;
      pointer-events: none;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(14, 23, 38, 0.7);
      backdrop-filter: blur(12px);
      padding: 6px 16px;
      border-radius: 100px;
      border: 1px solid var(--color-border);
      pointer-events: auto;
    }
    .brand-crest {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: linear-gradient(135deg, #1E3A8A, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 11px;
      color: #F8FAFC;
      letter-spacing: -0.5px;
    }
    .brand-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
      color: #E2E8F0;
    }
    .brand-sub {
      font-size: 11px;
      color: var(--color-text-dim);
      border-left: 1px solid var(--color-border);
      padding-left: 8px;
    }
    .top-badges {
      display: flex;
      gap: 8px;
      pointer-events: auto;
    }
    .system-status-pill {
      font-size: 11px;
      font-family: var(--font-mono);
      color: #10B981;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 10px;
      border-radius: 100px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot-pulse {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 8px #10B981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    /* Main Deck (16:9 Aspect ratio) */
    .slide-deck {
      position: relative;
      width: 100vw;
      height: 100vh;
      max-width: calc(100vh * 16 / 9);
      max-height: calc(100vw * 9 / 16);
      margin: auto;
      inset: 0;
      overflow: hidden;
      z-index: 10;
    }

    .slide {
      position: absolute;
      inset: 0;
      padding: 70px 48px 65px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.35s ease, transform 0.35s ease;
      transform: scale(0.98);
      pointer-events: none;
    }
    .slide.active {
      opacity: 1;
      visibility: visible;
      transform: scale(1);
      pointer-events: auto;
    }

    /* Slide Header */
    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .slide-badge-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .system-category-badge {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .badge-wishsync { color: #10B981; }
    .badge-meta { color: #3B82F6; }
    .badge-sussex { color: #F59E0B; }

    .slide-main-title {
      font-family: var(--font-heading);
      font-size: clamp(26px, 2.5vw, 36px);
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .slide-tagline {
      font-size: clamp(13px, 1.1vw, 15px);
      color: var(--color-text-muted);
      font-weight: 400;
      max-width: 520px;
      text-align: right;
    }

    /* Slide Content Layout (2 Columns) */
    .slide-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      flex: 1;
      min-height: 0;
      align-items: stretch;
    }

    /* Left Column: Purpose & Specs */
    .specs-col {
      display: flex;
      flex-direction: column;
      gap: 14px;
      overflow-y: auto;
      padding-right: 6px;
    }
    .specs-col::-webkit-scrollbar {
      width: 4px;
    }
    .specs-col::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    .card-block {
      background: var(--color-surface-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 14px 18px;
      backdrop-filter: blur(10px);
      transition: border-color 0.2s ease, transform 0.2s ease;
    }
    .card-block:hover {
      border-color: rgba(255, 255, 255, 0.18);
      background: rgba(18, 30, 49, 0.9);
    }
    .card-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #E2E8F0;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-title-icon {
      font-size: 14px;
    }

    .features-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .features-list li {
      font-size: 12.5px;
      line-height: 1.45;
      color: #CBD5E1;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .bullet-arrow {
      color: #3B82F6;
      font-weight: 700;
      margin-top: -1px;
    }
    .bullet-arrow.green { color: #10B981; }
    .bullet-arrow.amber { color: #F59E0B; }

    /* Specification Grid Inside Card */
    .spec-table {
      display: grid;
      grid-template-columns: 120px 1fr;
      row-gap: 6px;
      column-gap: 12px;
      font-size: 12px;
    }
    .spec-key {
      color: var(--color-text-dim);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 500;
    }
    .spec-val {
      color: #E2E8F0;
      font-weight: 500;
      line-height: 1.4;
    }
    .spec-pill {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 10.5px;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #93C5FD;
      margin-right: 4px;
      margin-bottom: 2px;
    }

    /* Right Column: Interactive Screenshot / UI Mockup */
    .visual-col {
      display: flex;
      flex-direction: column;
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--color-border);
      background: #090F1B;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
    }
    .window-header {
      height: 32px;
      background: #0F172A;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      flex-shrink: 0;
    }
    .window-dots {
      display: flex;
      gap: 6px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot-red { background: #EF4444; }
    .dot-yellow { background: #F59E0B; }
    .dot-green { background: #10B981; }
    .window-title {
      font-family: var(--font-mono);
      font-size: 11px;
      color: #94A3B8;
      letter-spacing: 0.2px;
    }
    .window-status-chip {
      font-size: 10px;
      font-family: var(--font-mono);
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .window-body {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #050B14;
    }
    .window-body img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
    }

    /* Meta2Excel Mockup Screen */
    .meta-mockup {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #F8FAFC;
      color: #1E293B;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .meta-top-ribbon {
      background: #1F4E78;
      color: #FFF;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meta-actions-bar {
      background: #E2E8F0;
      padding: 8px 14px;
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #CBD5E1;
    }
    .meta-btn {
      font-size: 11px;
      font-weight: 600;
      padding: 5px 12px;
      border-radius: 4px;
      border: 1px solid #94A3B8;
      background: #FFF;
      cursor: default;
    }
    .meta-btn.primary {
      background: #217346;
      color: #FFF;
      border-color: #1E5E3A;
    }
    .meta-dropzone {
      margin: 10px 14px;
      border: 2px dashed #94A3B8;
      background: #EDF2F7;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      font-size: 11px;
      color: #475569;
    }
    .meta-table-wrap {
      flex: 1;
      margin: 0 14px 10px;
      background: #FFF;
      border: 1px solid #CBD5E1;
      overflow: hidden;
      font-size: 11px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
    }
    .meta-table th {
      background: #F1F5F9;
      color: #334155;
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid #CBD5E1;
      font-weight: 600;
    }
    .meta-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #E2E8F0;
      color: #1E293B;
    }
    .meta-status-footer {
      background: #1F4E78;
      color: #E2E8F0;
      padding: 4px 14px;
      font-size: 10.5px;
      display: flex;
      justify-content: space-between;
      font-family: monospace;
    }

    /* Sussex Web Portal Mockup Screen */
    .sussex-mockup {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #0B132B;
      color: #F8FAFC;
      position: relative;
      overflow: hidden;
    }
    .sussex-nav-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 18px;
      background: rgba(10, 25, 47, 0.95);
      border-bottom: 1px solid rgba(255, 215, 0, 0.2);
    }
    .sussex-crest-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 13px;
      color: #FFD700;
    }
    .sussex-nav-links {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: #CBD5E1;
    }
    .sussex-hero-preview {
      flex: 1;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: radial-gradient(circle at 80% 20%, rgba(255, 215, 0, 0.08), transparent 50%),
                  radial-gradient(circle at 20% 80%, rgba(30, 58, 138, 0.3), transparent 60%);
    }
    .sussex-hero-badge {
      display: inline-block;
      font-size: 10px;
      background: rgba(255, 215, 0, 0.15);
      border: 1px solid rgba(255, 215, 0, 0.4);
      color: #FDE047;
      padding: 2px 8px;
      border-radius: 100px;
      margin-bottom: 8px;
      width: fit-content;
    }
    .sussex-hero-heading {
      font-family: var(--font-heading);
      font-size: 18px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 6px;
      line-height: 1.2;
    }
    .sussex-hero-text {
      font-size: 11.5px;
      color: #94A3B8;
      max-width: 380px;
      line-height: 1.4;
      margin-bottom: 12px;
    }
    .sussex-metric-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .sussex-metric-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 8px;
      text-align: center;
    }
    .sussex-metric-num {
      font-size: 15px;
      font-weight: 800;
      color: #FFD700;
    }
    .sussex-metric-lbl {
      font-size: 9.5px;
      color: #94A3B8;
      margin-top: 2px;
    }

    /* Fixed Professional Footer (Every Slide) */
    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid var(--color-border);
      font-size: 11.5px;
      color: var(--color-text-dim);
    }
    .footer-author {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #CBD5E1;
      font-weight: 600;
    }
    .author-highlight {
      color: #F8FAFC;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .footer-context {
      color: var(--color-text-dim);
    }
    .footer-hint {
      font-family: var(--font-mono);
      font-size: 10px;
      color: #64748B;
    }

    /* Bottom Floating Nav Bar */
    .nav-floating-bar {
      position: fixed;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(14, 23, 38, 0.85);
      border: 1px solid var(--color-border);
      backdrop-filter: blur(16px);
      padding: 6px 16px;
      border-radius: 100px;
      display: flex;
      align-items: center;
      gap: 14px;
      z-index: 100;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    .nav-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.2s ease;
    }
    .nav-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
    }
    .nav-counter {
      font-family: var(--font-mono);
      font-size: 12px;
      color: #CBD5E1;
      font-weight: 500;
      min-width: 65px;
      text-align: center;
    }
    .nav-action-btn {
      background: transparent;
      border: none;
      color: #94A3B8;
      cursor: pointer;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: var(--font-mono);
      transition: color 0.2s;
    }
    .nav-action-btn:hover {
      color: #FFF;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .slide {
        padding: 60px 24px 60px 24px;
      }
      .slide-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      .visual-col {
        min-height: 220px;
      }
      .top-brand-bar {
        left: 20px;
        right: 20px;
      }
    }
  </style>
</head>
<body>

  <!-- Ambient Light -->
  <div class="ambient-glow"></div>
  <div class="ambient-glow-2"></div>

  <!-- Progress Bar -->
  <div class="progress-bar-container">
    <div class="progress-bar-fill" id="progressBar"></div>
  </div>

  <!-- Top Global Branding -->
  <div class="top-brand-bar">
    <div class="brand-group">
      <div class="brand-crest">SC</div>
      <div class="brand-title">Sussex College Sri Lanka</div>
      <div class="brand-sub">Digital Infrastructure Portfolio</div>
    </div>
    <div class="top-badges">
      <div class="system-status-pill">
        <span class="status-dot-pulse"></span>
        <span>PRODUCTION VERIFIED</span>
      </div>
    </div>
  </div>

  <!-- Slide Deck -->
  <div class="slide-deck">

    <!-- ========================================== -->
    <!-- SLIDE 1 : WISHSYNC (THIS PROJECT) -->
    <!-- ========================================== -->
    <div class="slide active" id="slide-1">
      <div class="slide-header">
        <div class="slide-badge-title">
          <span class="system-category-badge badge-wishsync">System 01 : Automated Outreach & Dispatch</span>
          <h1 class="slide-main-title">WishSync Automation Engine</h1>
        </div>
        <p class="slide-tagline">Automated WhatsApp Birthday Greeting & Multi-Branch Inquiries Dispatch Engine</p>
      </div>

      <div class="slide-grid">
        <!-- Left: Purpose & Specs -->
        <div class="specs-col">
          <div class="card-block">
            <div class="card-title">
              <span class="card-title-icon">🎯</span>
              <span>What It Is Used For</span>
            </div>
            <ul class="features-list">
              <li>
                <span class="bullet-arrow green">▶</span>
                <span><strong>Automated Birthday Greetings:</strong> Daily background scheduler checks inquiry/student databases and delivers personalized birthday greetings via WhatsApp.</span>
              </li>
              <li>
                <span class="bullet-arrow green">▶</span>
                <span><strong>Multi-Campus Scalability:</strong> Manages centralized dispatches across 20+ Sussex College branches without manual intervention.</span>
              </li>
              <li>
                <span class="bullet-arrow green">▶</span>
                <span><strong>Anti-Ban Protection:</strong> Employs human-simulated randomized dispatch delays (5s to 12s jitter) to safeguard official institutional WhatsApp numbers.</span>
              </li>
              <li>
                <span class="bullet-arrow green">▶</span>
                <span><strong>Dynamic Personalization & Media:</strong> Merges candidate names, branches, and custom text with automated birthday flyer images from local assets.</span>
              </li>
              <li>
                <span class="bullet-arrow green">▶</span>
                <span><strong>Delivery Intelligence:</strong> Real-time delivery logging, auto-retry on transient disconnections, and delivered-today deduplication guards.</span>
              </li>
            </ul>
          </div>

          <div class="card-block">
            <div class="card-title">
              <span class="card-title-icon">⚙️</span>
              <span>Technical Specifications</span>
            </div>
            <div class="spec-table">
              <span class="spec-key">Runtime / Stack</span>
              <span class="spec-val">
                <span class="spec-pill">Electron 39</span>
                <span class="spec-pill">Node.js 22</span>
                <span class="spec-pill">Express REST API</span>
              </span>

              <span class="spec-key">WhatsApp Core</span>
              <span class="spec-val"><code>whatsapp-web.js</code> + Puppeteer Chromium (Local Session Persistence)</span>

              <span class="spec-key">Data Sync</span>
              <span class="spec-val">Google Sheets API v4 (OAuth 2.0 PKCE / Auto-Refresh) + Offline CSV fallback</span>

              <span class="spec-key">Auto-Updater</span>
              <span class="spec-val">In-app Semver Auto-Updater via Private GitHub Releases REST API (v1.2.1)</span>

              <span class="spec-key">Port / Network</span>
              <span class="spec-val">Internal Express Daemon: <code>http://localhost:3847</code> (100% Private Localhost)</span>

              <span class="spec-key">Storage Directory</span>
              <span class="spec-val"><code>%APPDATA%\\WishSync</code> (Zero data loss across software version upgrades)</span>
            </div>
          </div>
        </div>

        <!-- Right: Real System Screenshot -->
        <div class="visual-col">
          <div class="window-header">
            <div class="window-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            <span class="window-title">WishSync v1.2.1 - Live Operations Dashboard</span>
            <span class="window-status-chip">ACTIVE MONITOR</span>
          </div>
          <div class="window-body">
            ${screenshotBase64 ? `<img src="${screenshotBase64}" alt="WishSync Operations Dashboard">` : `
            <div style="padding: 24px; text-align: center; color: #94A3B8;">
              <div style="font-size: 32px; margin-bottom: 10px;">📊</div>
              <div style="font-size: 15px; font-weight: 600; color: #FFF;">WishSync Executive Operations Dashboard</div>
              <div style="font-size: 12px; margin-top: 6px;">Live WhatsApp QR Session / Google Sheets Two-Way Synchronization</div>
            </div>`}
          </div>
        </div>
      </div>

      <!-- Slide Footer -->
      <div class="slide-footer">
        <div class="footer-author">
          <span>Lead Engineer:</span>
          <span class="author-highlight">Mahima Paseda</span>
        </div>
        <div class="footer-context">Sussex College Automated Messaging Ecosystem | Version 1.2.1 Production</div>
        <div class="footer-hint">Slide 1 of 3 (Press → or Space)</div>
      </div>
    </div>


    <!-- ========================================== -->
    <!-- SLIDE 2 : META2EXCEL (META RECEIPTS LITE) -->
    <!-- ========================================== -->
    <div class="slide" id="slide-2">
      <div class="slide-header">
        <div class="slide-badge-title">
          <span class="system-category-badge badge-meta">System 02 : Financial & Marketing Analytics</span>
          <h1 class="slide-main-title">Meta Receipts Lite (Meta2Excel)</h1>
        </div>
        <p class="slide-tagline">High-Performance Meta (Facebook) Ads Receipt PDF to Excel & CSV Conversion Engine</p>
      </div>

      <div class="slide-grid">
        <!-- Left: Purpose & Specs -->
        <div class="specs-col">
          <div class="card-block">
            <div class="card-title">
              <span class="card-title-icon">🎯</span>
              <span>What It Is Used For</span>
            </div>
            <ul class="features-list">
              <li>
                <span class="bullet-arrow">▶</span>
                <span><strong>Automated Invoicing & Audit Reconciliation:</strong> Parses high-volume Meta Ads receipt PDFs directly into structured, accounting-compliant Excel worksheets.</span>
              </li>
              <li>
                <span class="bullet-arrow">▶</span>
                <span><strong>Multi-Campus Campaign Attribution:</strong> Automatically detects branch names (Horana, Galle, Kandy, etc.) and campaign tags from invoice line items.</span>
              </li>
              <li>
                <span class="bullet-arrow">▶</span>
                <span><strong>Smart Currency Detection:</strong> Parses and standardizes diverse billing currencies (LKR, USD, EUR) with precision decimal formatting.</span>
              </li>
              <li>
                <span class="bullet-arrow">▶</span>
                <span><strong>Intelligent Deduplication:</strong> Identifies transaction IDs and eliminates overlapping or duplicate invoice downloads automatically.</span>
              </li>
              <li>
                <span class="bullet-arrow">▶</span>
                <span><strong>100% Offline & Private:</strong> Zero cloud upload; financial ad data remains strictly inside the college finance department.</span>
              </li>
            </ul>
          </div>

          <div class="card-block">
            <div class="card-title">
              <span class="card-title-icon">⚙️</span>
              <span>Technical Specifications</span>
            </div>
            <div class="spec-table">
              <span class="spec-key">Architecture</span>
              <span class="spec-val">
                <span class="spec-pill">C# WinForms</span>
                <span class="spec-pill">.NET Framework 4.8</span>
                <span class="spec-pill">Native Windows Desktop</span>
              </span>

              <span class="spec-key">PDF Parser Engine</span>
              <span class="spec-val"><code>PdfPig</code> (UglyToad.PdfPig) sequential stream parser (zero COM / Adobe dependencies)</span>

              <span class="spec-key">Export Capabilities</span>
              <span class="spec-val">ClosedXML / OpenXML formatted <code>.xlsx</code> (multi-sheet summary) + RFC-4180 <code>.csv</code></span>

              <span class="spec-key">Deployment & Footprint</span>
              <span class="spec-val">Ultra-compact (< 15 MB), Inno Setup installer (per-user / no admin rights required) + Portable ZIP</span>

              <span class="spec-key">Hardware Targets</span>
              <span class="spec-val">Optimized for low-spec administrative PCs (Windows 10/11 and Windows 7 SP1 compatible)</span>

              <span class="spec-key">Throughput</span>
              <span class="spec-val">50+ Multi-page PDF ad receipts extracted and reconciled in under 3.2 seconds</span>
            </div>
          </div>
        </div>

        <!-- Right: High-Fidelity C# WinForms UI Mockup -->
        <div class="visual-col">
          <div class="window-header">
            <div class="window-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            <span class="window-title">Meta Receipts -> Excel v1.0.11 [.NET 4.8 WinForms]</span>
            <span class="window-status-chip">PARSER READY</span>
          </div>
          <div class="window-body">
            <div class="meta-mockup">
              <div class="meta-top-ribbon">
                <span style="font-weight: 700; font-size: 13px;">Meta Receipts Lite - Financial Reconciler</span>
                <span style="font-size: 11px; opacity: 0.85;">Sussex Marketing & Accounts Division</span>
              </div>
              <div class="meta-actions-bar">
                <button class="meta-btn">📁 Add Receipts (PDF)</button>
                <button class="meta-btn primary">📊 Export to Excel (.xlsx)</button>
                <button class="meta-btn">📄 Export CSV</button>
                <button class="meta-btn">🗑️ Clear</button>
              </div>
              <div class="meta-dropzone">
                📂 <strong>Drag & Drop Meta Ad Receipt PDFs Here</strong> (or click Browse to batch select)
              </div>
              <div class="meta-table-wrap">
                <table class="meta-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Account ID</th>
                      <th>Campaign / Branch</th>
                      <th>Currency</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>2026-10-28</td>
                      <td>act_294182904</td>
                      <td>Sussex Admissions 2026/27 (Horana)</td>
                      <td>LKR</td>
                      <td style="font-weight:600;">14,500.00</td>
                      <td style="color:#16A34A; font-weight:600;">Verified</td>
                    </tr>
                    <tr>
                      <td>2026-10-27</td>
                      <td>act_294182904</td>
                      <td>Cambridge Primary Enrollments (Galle)</td>
                      <td>LKR</td>
                      <td style="font-weight:600;">22,000.00</td>
                      <td style="color:#16A34A; font-weight:600;">Verified</td>
                    </tr>
                    <tr>
                      <td>2026-10-25</td>
                      <td>act_103984920</td>
                      <td>STEM & Robotics Exhibition (Kandy)</td>
                      <td>USD</td>
                      <td style="font-weight:600;">65.00</td>
                      <td style="color:#16A34A; font-weight:600;">Verified</td>
                    </tr>
                    <tr>
                      <td>2026-10-22</td>
                      <td>act_294182904</td>
                      <td>Preschool Intake Campaign (Negombo)</td>
                      <td>LKR</td>
                      <td style="font-weight:600;">18,750.00</td>
                      <td style="color:#16A34A; font-weight:600;">Verified</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="meta-status-footer">
                <span>Receipts: 42 Parsed | Duplicates Filtered: 3</span>
                <span>Total Reconciled: LKR 648,200.00 + $180.00 USD</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Slide Footer -->
      <div class="slide-footer">
        <div class="footer-author">
          <span>Lead Engineer:</span>
          <span class="author-highlight">Mahima Paseda</span>
        </div>
        <div class="footer-context">Sussex College Financial Tools Suite | Repository: Meta2Excel</div>
        <div class="footer-hint">Slide 2 of 3 (Press → or Space)</div>
      </div>
    </div>


    <!-- ========================================== -->
    <!-- SLIDE 3 : SUSEX_COLLEGE (PORTAL & CMS) -->
    <!-- ========================================== -->
    <div class="slide" id="slide-3">
      <div class="slide-header">
        <div class="slide-badge-title">
          <span class="system-category-badge badge-sussex">System 03 : Web Portal & Content Architecture</span>
          <h1 class="slide-main-title">Sussex College Portal & CMS</h1>
        </div>
        <p class="slide-tagline">Next.js 16 Web Portal, Multi-Campus Admissions Hub & Headless Content Management System</p>
      </div>

      <div class="slide-grid">
        <!-- Left: Purpose & Specs -->
        <div class="specs-col">
          <div class="card-block">
            <div class="card-title">
              <span class="card-title-icon">🎯</span>
              <span>What It Is Used For</span>
            </div>
            <ul class="features-list">
              <li>
                <span class="bullet-arrow amber">▶</span>
                <span><strong>Institutional Flagship Digital Hub:</strong> Modern web portal representing Sussex College's 20+ nationwide branch network and Cambridge accreditation.</span>
              </li>
              <li>
                <span class="bullet-arrow amber">▶</span>
                <span><strong>Online Admissions & Lead Capture:</strong> Fast multi-step online student registration forms and instant contact routing across regional campuses.</span>
              </li>
              <li>
                <span class="bullet-arrow amber">▶</span>
                <span><strong>Lightweight Headless CMS:</strong> Enables administrative staff to publish school news, notices, achievements, and exam timetables without redeploying code.</span>
              </li>
              <li>
                <span class="bullet-arrow amber">▶</span>
                <span><strong>Search & AI Discoverability:</strong> Full SEO/GEO optimization, structured Schema.org markup, and AI agent readiness (<code>llms.txt</code> / <code>llms-full.txt</code>).</span>
              </li>
              <li>
                <span class="bullet-arrow amber">▶</span>
                <span><strong>Sub-Second Global Performance:</strong> Fully pre-rendered static architecture delivering instant page loads on any mobile or desktop connection.</span>
              </li>
            </ul>
          </div>

          <div class="card-block">
            <div class="card-title">
              <span class="card-title-icon">⚙️</span>
              <span>Technical Specifications</span>
            </div>
            <div class="spec-table">
              <span class="spec-key">Frontend Core</span>
              <span class="spec-val">
                <span class="spec-pill">Next.js 16</span>
                <span class="spec-pill">React 19</span>
                <span class="spec-pill">TypeScript</span>
                <span class="spec-pill">Tailwind CSS v4</span>
              </span>

              <span class="spec-key">Architecture</span>
              <span class="spec-val">Next.js App Router with Static Site Generation (<code>output: "export"</code>)</span>

              <span class="spec-key">Deployment Target</span>
              <span class="spec-val">cPanel Apache Web Server (<code>public_html</code>) + PHP 8 backend API microservices</span>

              <span class="spec-key">CMS Data Engine</span>
              <span class="spec-val">SQLite embedded database with file-overlay publishing (<code>public/cms-content/</code>)</span>

              <span class="spec-key">Performance / PWA</span>
              <span class="spec-val">100/100 Lighthouse Performance score, Service Worker offline caching (<code>sw.js</code>)</span>

              <span class="spec-key">Branch Directory</span>
              <span class="spec-val">Dynamic branch profiles (Ambalangoda, Ampara, Anuradhapura, Badulla, Bandarawela, Galle, etc.)</span>
            </div>
          </div>
        </div>

        <!-- Right: Modern Web Portal Mockup -->
        <div class="visual-col">
          <div class="window-header">
            <div class="window-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            <span class="window-title">https://www.sussexcollege.lk [Next.js 16 SSG]</span>
            <span class="window-status-chip">LIGHTHOUSE 100</span>
          </div>
          <div class="window-body">
            <div class="sussex-mockup">
              <div class="sussex-nav-bar">
                <div class="sussex-crest-logo">
                  <span>🏛️</span>
                  <span>SUSSEX COLLEGE</span>
                </div>
                <div class="sussex-nav-links">
                  <span>Home</span>
                  <span>About</span>
                  <span>Curriculum</span>
                  <span>Branches (20+)</span>
                  <span style="color:#FFD700; font-weight:600;">Admissions</span>
                </div>
              </div>

              <div class="sussex-hero-preview">
                <span class="sussex-hero-badge">CAMBRIDGE ACCREDITED EDUCATION</span>
                <h2 class="sussex-hero-heading">Nurturing Leaders for a Dynamic Tomorrow</h2>
                <p class="sussex-hero-text">Sri Lanka's premier English-medium school network offering national and Cambridge curricula with state-of-the-art digital infrastructure.</p>

                <div class="sussex-metric-grid">
                  <div class="sussex-metric-card">
                    <div class="sussex-metric-num">20+</div>
                    <div class="sussex-metric-lbl">Branches Islandwide</div>
                  </div>
                  <div class="sussex-metric-card">
                    <div class="sussex-metric-num">100%</div>
                    <div class="sussex-metric-lbl">English Medium</div>
                  </div>
                  <div class="sussex-metric-card">
                    <div class="sussex-metric-num">100/100</div>
                    <div class="sussex-metric-lbl">Lighthouse Speed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Slide Footer -->
      <div class="slide-footer">
        <div class="footer-author">
          <span>Lead Engineer:</span>
          <span class="author-highlight">Mahima Paseda</span>
        </div>
        <div class="footer-context">Sussex College Official Web Platform | Repository: Susex_College</div>
        <div class="footer-hint">Slide 3 of 3 (Press ← to return)</div>
      </div>
    </div>

  </div><!-- /.slide-deck -->

  <!-- Bottom Floating Nav Bar -->
  <div class="nav-floating-bar">
    <button class="nav-btn" onclick="prevSlide()" title="Previous slide (Left Arrow)">←</button>
    <div class="nav-counter"><span id="currentSlide">1</span> / <span id="totalSlides">3</span></div>
    <button class="nav-btn" onclick="nextSlide()" title="Next slide (Right Arrow / Space)">→</button>
    <button class="nav-action-btn" onclick="toggleFullscreen()" title="Fullscreen (F)">⛶ FULLSCREEN</button>
  </div>

  <script>
    let current = 1;
    const slides = document.querySelectorAll('.slide');
    const total = slides.length;
    document.getElementById('totalSlides').textContent = total;

    function showSlide(index) {
      if (index < 1) index = 1;
      if (index > total) index = total;
      current = index;

      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index - 1);
      });

      document.getElementById('currentSlide').textContent = current;
      document.getElementById('progressBar').style.width = ((current / total) * 100) + '%';
    }

    function nextSlide() {
      if (current < total) {
        showSlide(current + 1);
      } else {
        showSlide(1); // loop
      }
    }

    function prevSlide() {
      if (current > 1) {
        showSlide(current - 1);
      } else {
        showSlide(total); // loop back
      }
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Home') {
        e.preventDefault();
        showSlide(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        showSlide(total);
      }
    });

    // Touch swipe support for tablets/mobile
    let touchStartX = 0;
    let touchEndX = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, false);
    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) nextSlide();
      if (touchEndX - touchStartX > 50) prevSlide();
    }, false);

    showSlide(1);
  </script>
</body>
</html>
`;

const outputDir = path.join(ROOT_DIR, 'docs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = path.join(outputDir, 'presentation.html');
fs.writeFileSync(outputPath, htmlContent, 'utf8');

// Also write to artifact directory so it can be previewed or opened directly
const artifactDir = 'C:\\\\Users\\\\User\\\\.gemini\\\\antigravity\\\\brain\\\\25064265-a185-4304-88f1-03903e12cc16';
const artifactPath = path.join(artifactDir, 'presentation.html');
fs.writeFileSync(artifactPath, htmlContent, 'utf8');

console.log('Successfully generated presentation at:', outputPath);
console.log('Artifact copy saved at:', artifactPath);

