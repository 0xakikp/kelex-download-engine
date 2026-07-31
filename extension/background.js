const KELEX_API = 'http://127.0.0.1:3001';

// ── Video site patterns (same list as backend for consistency) ──
const VIDEO_SITE_PATTERNS = [
  /youtube\.com\/watch/i,
  /youtu\.be\//i,
  /vimeo\.com/i,
  /dailymotion\.com/i,
  /pornhub\.com/i,
  /xvideos\.com/i,
  /xhamster\.com/i,
  /eporner\.com/i,
  /redtube\.com/i,
  /spankbang\.com/i,
  /xnxx\.com/i,
  /tiktok\.com/i,
  /twitter\.com\/.*\/status/i,
  /x\.com\/.*\/status/i,
  /instagram\.com\/(p|reel)\//i,
  /reddit\.com\/.*\/comments/i,
  /twitch\.tv/i,
];

const DIRECT_FILE_EXT = /\.(mp4|mkv|avi|mov|mp3|flac|wav|zip|rar|tar|gz|pdf|exe|dmg|iso|7z|apk|deb)(\?|$)/i;

function isVideoSiteUrl(url) {
  return VIDEO_SITE_PATTERNS.some(p => p.test(url)) && !DIRECT_FILE_EXT.test(url);
}

function isMagnetOrTorrent(url) {
  return /^magnet:/i.test(url) || /\.torrent(\?|$)/i.test(url);
}

// ── Setup Context Menus on Install ──
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'kelex-download-link',
    title: '⬇️ Download with Kelex',
    contexts: ['link', 'image', 'video', 'audio', 'selection'],
  });

  chrome.contextMenus.create({
    id: 'kelex-download-page',
    title: '⚡ Download Current Page / Video with Kelex',
    contexts: ['page'],
  });

  checkBackendStatus();
});

// Periodically check if Kelex backend is running
setInterval(checkBackendStatus, 10000);
checkBackendStatus();

async function checkBackendStatus() {
  try {
    const res = await fetch(`${KELEX_API}/health`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#0A84FF' });
    } else {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#666666' });
    }
  } catch {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF3B30' });
  }
}

// ── Handle Context Menu Clicks ──
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let targetUrl = info.linkUrl || info.srcUrl || info.selectionText || info.pageUrl || tab?.url;
  if (!targetUrl) return;

  targetUrl = targetUrl.trim();
  if (targetUrl.startsWith('javascript:')) return;

  await sendDownloadToKelex(targetUrl, tab);
});

// ── Extract cookies from the browser for the target domain ──
async function extractCookiesForUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    // Get cookies for the exact domain and parent domain
    const parts = hostname.split('.');
    const domains = [hostname];
    if (parts.length > 2) {
      domains.push(parts.slice(-2).join('.')); // e.g. "eporner.com" from "www.eporner.com"
    }

    let allCookies = [];
    for (const domain of domains) {
      const cookies = await chrome.cookies.getAll({ domain });
      if (cookies && cookies.length > 0) {
        allCookies.push(...cookies);
      }
    }

    // De-duplicate by name
    const seen = new Set();
    const unique = [];
    for (const c of allCookies) {
      if (!seen.has(c.name)) {
        seen.add(c.name);
        unique.push(c);
      }
    }

    if (unique.length === 0) return null;

    // Return as "name=value; name2=value2" string for Cookie header
    return unique.map(c => `${c.name}=${c.value}`).join('; ');
  } catch (err) {
    console.warn('Failed to extract cookies:', err);
    return null;
  }
}

// ── Send download to Kelex backend ──
async function sendDownloadToKelex(url, tab) {
  try {
    // Always extract cookies for video sites (they almost always need auth cookies)
    let cookiesStr = null;
    const isVideo = isVideoSiteUrl(url);
    const isMagnet = isMagnetOrTorrent(url);

    // For video sites, always forward cookies (most need them for age-gated or premium content)
    if (isVideo || (tab && tab.url)) {
      cookiesStr = await extractCookiesForUrl(url);
    }

    // Determine the right endpoint and payload
    if (isMagnet) {
      // Magnet link or .torrent URL
      const res = await fetch(`${KELEX_API}/api/v1/torrents/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet: url }),
      });

      if (res.ok) {
        const data = await res.json();
        showNotification('✓ Torrent Added to Kelex', `ID: ${data.id || 'Queued'}\n${data.filename || url}`);
      } else {
        const text = await res.text();
        showNotification('✕ Kelex Error', `Failed: ${text.slice(0, 60)}`);
      }
      return;
    }

    // For video sites OR YouTube — route to /api/v1/downloads with type: 'youtube'
    // The backend's smart URL detection will handle it via yt-dlp
    const body = {
      url,
      type: isVideo ? 'youtube' : undefined,
      cookiesFromBrowser: cookiesStr || undefined,
    };

    const res = await fetch(`${KELEX_API}/api/v1/downloads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const typeLabel = isVideo ? '🎬 Video' : '📥 File';
      showNotification(`✓ ${typeLabel} Added to Kelex`, `ID: ${data.id || 'Queued'}\n${data.filename || url}`);
    } else {
      const text = await res.text();
      showNotification('✕ Kelex Error', `Failed: ${text.slice(0, 60)}`);
    }
  } catch (err) {
    showNotification('✕ Cannot Reach Kelex', 'Make sure Kelex backend is running on http://127.0.0.1:3001');
  }
}

function showNotification(title, message) {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message,
    });
  }
}

// ── Listen for messages from popup.js ──
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendDownload') {
    sendDownloadToKelex(request.url, request.tab).then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep channel open for async response
  }
});
