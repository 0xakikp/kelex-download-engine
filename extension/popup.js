const KELEX_API = 'http://127.0.0.1:3001';

let currentTab = null;

document.addEventListener('DOMContentLoaded', async () => {
  initSettings();
  detectCurrentTab();
  checkBackendHealth();
  fetchStats();

  setInterval(() => {
    checkBackendHealth();
    fetchStats();
  }, 2000);

  // Bind Buttons
  document.getElementById('btn-download-tab').addEventListener('click', handleDownloadTab);
  document.getElementById('btn-add-url').addEventListener('click', handleAddUrl);
  document.getElementById('url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAddUrl();
  });
});

// Detect Active Tab
async function detectCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  currentTab = tab;
  const titleEl = document.getElementById('tab-title');
  const urlEl = document.getElementById('tab-url');
  const typeEl = document.getElementById('tab-type');

  titleEl.textContent = tab.title || 'Untitled Page';
  urlEl.textContent = tab.url;

  if (/youtube\.com|youtu\.be/i.test(tab.url)) {
    typeEl.textContent = 'YOUTUBE';
    typeEl.className = 'badge youtube';
  } else if (isVideoSiteUrl(tab.url)) {
    typeEl.textContent = 'VIDEO';
    typeEl.className = 'badge youtube';
  } else {
    typeEl.textContent = 'MEDIA';
    typeEl.className = 'badge';
  }
}

// Check Kelex Backend Status
async function checkBackendHealth() {
  const pill = document.getElementById('status-pill');
  const text = document.getElementById('status-text');

  try {
    const res = await fetch(`${KELEX_API}/health`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      pill.className = 'status-pill online';
      text.textContent = '● Connected';
    } else {
      pill.className = 'status-pill offline';
      text.textContent = 'Offline';
    }
  } catch {
    pill.className = 'status-pill offline';
    text.textContent = 'Offline';
  }
}

// Fetch Stats from Backend
async function fetchStats() {
  try {
    const res = await fetch(`${KELEX_API}/api/v1/downloads/stats`);
    if (!res.ok) return;

    const stats = await res.json();
    document.getElementById('stat-active').textContent = stats.active || 0;
    document.getElementById('stat-completed').textContent = stats.completed || 0;
    document.getElementById('stat-failed').textContent = stats.failed || 0;
    document.getElementById('stat-speed').textContent = formatSpeed(stats.totalSpeed || 0);
  } catch {
    // Ignore offline errors
  }
}

function formatSpeed(mbps) {
  if (mbps < 1) return `${(mbps * 1024).toFixed(0)} KB/s`;
  return `${mbps.toFixed(1)} MB/s`;
}

// Handle Download Current Tab
async function handleDownloadTab() {
  if (!currentTab || !currentTab.url) {
    showToast('No active URL found', 'error');
    return;
  }

  await sendDownload(currentTab.url, currentTab);
}

// Handle Add Custom URL
async function handleAddUrl() {
  const input = document.getElementById('url-input');
  const url = input.value.trim();
  if (!url) {
    showToast('Please enter a valid URL', 'error');
    return;
  }

  await sendDownload(url, null);
  input.value = '';
}

// Video site patterns (matches background.js)
const VIDEO_SITE_PATTERNS = [
  /youtube\.com\/watch/i, /youtu\.be\//i, /vimeo\.com/i, /dailymotion\.com/i,
  /pornhub\.com/i, /xvideos\.com/i, /xhamster\.com/i, /eporner\.com/i,
  /redtube\.com/i, /spankbang\.com/i, /xnxx\.com/i, /tiktok\.com/i,
  /twitter\.com\/.*\/status/i, /x\.com\/.*\/status/i,
  /instagram\.com\/(p|reel)\//i, /reddit\.com\/.*\/comments/i, /twitch\.tv/i,
];

function isVideoSiteUrl(url) {
  return VIDEO_SITE_PATTERNS.some(p => p.test(url));
}

// Send Download to Backend
async function sendDownload(url, tab) {
  const btn = document.getElementById('btn-download-tab');
  btn.disabled = true;

  try {
    const isVideo = isVideoSiteUrl(url);
    let cookiesFromBrowser = undefined;

    // For video sites, always extract cookies (needed for age-gated / premium content)
    // For other sites, only extract if the user toggled the setting ON
    const forwardCookies = document.getElementById('toggle-cookies').checked;
    if (isVideo || forwardCookies) {
      try {
        const targetUrl = tab?.url || url;
        const hostname = new URL(targetUrl).hostname;
        const parts = hostname.split('.');
        const domains = [hostname];
        if (parts.length > 2) domains.push(parts.slice(-2).join('.'));

        let allCookies = [];
        for (const domain of domains) {
          const cookies = await chrome.cookies.getAll({ domain });
          if (cookies && cookies.length > 0) allCookies.push(...cookies);
        }

        const seen = new Set();
        const unique = allCookies.filter(c => {
          if (seen.has(c.name)) return false;
          seen.add(c.name);
          return true;
        });

        if (unique.length > 0) {
          cookiesFromBrowser = unique.map(c => `${c.name}=${c.value}`).join('; ');
        }
      } catch (err) {
        console.warn('Failed to extract domain cookies:', err);
      }
    }

    // Always use /api/v1/downloads — backend handles smart routing
    const body = {
      url,
      type: isVideo ? 'youtube' : undefined,
      cookiesFromBrowser,
    };

    const res = await fetch(`${KELEX_API}/api/v1/downloads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const typeLabel = isVideo ? '🎬 Video' : '📥 File';
      showToast(`✓ ${typeLabel} Queued (${data.id?.slice(0, 8) || 'OK'})`, 'success');
      fetchStats();
    } else {
      const text = await res.text();
      showToast(`✕ Error: ${text.slice(0, 40)}`, 'error');
    }
  } catch (err) {
    showToast('✕ Cannot reach Kelex (Backend Offline)', 'error');
  } finally {
    btn.disabled = false;
  }
}

// Toast Helper
function showToast(msg, type) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  setTimeout(() => {
    toast.className = 'toast hidden';
  }, 3500);
}

// Settings storage
function initSettings() {
  const toggle = document.getElementById('toggle-cookies');
  chrome.storage.local.get(['forwardCookies'], (res) => {
    if (res.forwardCookies !== undefined) {
      toggle.checked = res.forwardCookies;
    }
  });

  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ forwardCookies: toggle.checked });
  });
}
