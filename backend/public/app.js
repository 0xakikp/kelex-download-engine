class DownloadManagerUI {
  constructor() {
    this.downloads = new Map();
    this.stats = { active: 0, completed: 0, totalSpeed: 0 };
    this.ws = null;
    this.container = document.getElementById('downloads-container');
    
    this.init();
  }

  async init() {
    await this.fetchInitialState();
    this.setupWebSocket();
    this.setupEventListeners();
    this.updateStatsUI();
  }

  async fetchInitialState() {
    try {
      const res = await fetch('/api/v1/downloads');
      const data = await res.json();
      
      const statsRes = await fetch('/api/v1/downloads/stats');
      this.stats = await statsRes.json();
      
      const sysRes = await fetch('/api/v1/system/info');
      const sys = await sysRes.json();
      if (sys.disk) {
        document.getElementById('stat-storage').innerText = (sys.disk.free / (1024*1024*1024)).toFixed(1) + ' GB';
      }

      if (data.downloads) {
        data.downloads.forEach(d => {
          this.downloads.set(d.id, d);
          this.renderDownloadCard(d);
        });
      }
      this.checkEmptyState();
    } catch (err) {
      console.error('Failed to load initial state', err);
    }
  }

  setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}/ws/progress`);
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          const d = data.download;
          this.downloads.set(d.id, d);
          this.updateDownloadCard(d);
          
          if (data.stats) {
            this.stats = data.stats;
            this.updateStatsUI();
          }
        }
      } catch (err) {
        console.error('Error parsing WS message', err);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WS disconnected. Reconnecting in 3s...');
      setTimeout(() => this.setupWebSocket(), 3000);
    };
  }

  setupEventListeners() {
    const btn = document.getElementById('btn-add-url');
    const input = document.getElementById('url-input');
    
    const submitUrl = async () => {
      const url = input.value.trim();
      if (!url) return;
      
      btn.disabled = true;
      btn.innerText = 'Adding...';
      try {
        await fetch('/api/v1/downloads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        input.value = '';
      } catch (err) {
        alert('Failed to add download');
      } finally {
        btn.disabled = false;
        btn.innerText = 'Start Download';
      }
    };

    btn.addEventListener('click', submitUrl);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submitUrl();
    });
  }

  formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatSpeed(bytesPerSec) {
    return this.formatSize(bytesPerSec) + '/s';
  }

  updateStatsUI() {
    document.getElementById('stat-active').innerText = this.stats.active;
    document.getElementById('stat-completed').innerText = this.stats.completed;
    document.getElementById('stat-speed').innerText = this.formatSpeed(this.stats.totalSpeed);
  }

  checkEmptyState() {
    if (this.downloads.size === 0) {
      this.container.innerHTML = `
        <div class="empty-state animate-slide-up">
          <div class="empty-icon">⚡</div>
          <h3>No Active Downloads</h3>
          <p style="margin-top: 10px; font-size: 0.9rem;">Paste a URL above to get started.</p>
        </div>
      `;
    }
  }

  async action(id, type) {
    try {
      let endpoint = `/api/v1/downloads/${id}/${type}`;
      let method = 'POST';
      if (type === 'delete') {
        endpoint = `/api/v1/downloads/${id}`;
        method = 'DELETE';
      }
      
      await fetch(endpoint, { method });
      
      if (type === 'delete') {
        const el = document.getElementById(`dl-${id}`);
        if (el) el.remove();
        this.downloads.delete(id);
        this.checkEmptyState();
      }
    } catch (err) {
      console.error(`Action ${type} failed for ${id}`, err);
    }
  }

  renderDownloadCard(d) {
    if (document.getElementById(`dl-${d.id}`)) {
      this.updateDownloadCard(d);
      return;
    }

    const empty = this.container.querySelector('.empty-state');
    if (empty) empty.remove();

    const card = document.createElement('div');
    card.className = `download-card animate-slide-up ${d.status}`;
    card.id = `dl-${d.id}`;
    
    card.innerHTML = this.getCardHTML(d);
    
    // Add event listeners for buttons
    card.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-icon');
      if (!btn) return;
      const actionType = btn.dataset.action;
      this.action(d.id, actionType);
    });

    this.container.prepend(card);
  }

  updateDownloadCard(d) {
    const card = document.getElementById(`dl-${d.id}`);
    if (!card) {
      this.renderDownloadCard(d);
      return;
    }
    
    // Update classes safely
    card.className = `download-card ${d.status}`;
    
    // Efficiently update elements instead of full innerHTML replace to keep animations smooth
    const fill = card.querySelector('.progress-fill');
    if (fill) fill.style.width = `${d.progress || 0}%`;
    
    const sizeTxt = card.querySelector('.txt-size');
    if (sizeTxt) sizeTxt.innerText = `${this.formatSize(d.downloaded)} / ${this.formatSize(d.size)}`;
    
    const speedTxt = card.querySelector('.txt-speed');
    if (speedTxt) speedTxt.innerText = this.formatSpeed(d.speed);
    
    const etaTxt = card.querySelector('.txt-eta');
    if (etaTxt) etaTxt.innerText = d.eta || '--';
    
    const statusTxt = card.querySelector('.txt-status');
    if (statusTxt) statusTxt.innerText = d.status.toUpperCase();
    
    // If status changed (e.g. error), it might be better to re-render to show/hide error box
    if (card.dataset.status !== d.status) {
      card.innerHTML = this.getCardHTML(d);
      card.dataset.status = d.status;
    }
  }

  getCardHTML(d) {
    let actions = '';
    if (d.status === 'paused' || d.status === 'error') {
      actions += `<button class="btn-icon play" data-action="resume" title="Resume">▶</button>`;
    } else if (d.status === 'downloading' || d.status === 'queued') {
      actions += `<button class="btn-icon pause" data-action="pause" title="Pause">⏸</button>`;
    }
    actions += `<button class="btn-icon retry" data-action="retry" title="Retry">↻</button>`;
    actions += `<button class="btn-icon delete" data-action="delete" title="Delete">✕</button>`;

    let errorHtml = d.error ? `<div class="error-message">${d.error}</div>` : '';

    return `
      <div class="download-header">
        <div class="download-title">
          ${d.filename || d.url}
          <span class="badge type-${d.type || 'http'}">${(d.type || 'http')}</span>
        </div>
        <div class="download-actions">${actions}</div>
      </div>
      
      <div class="progress-container">
        <div class="progress-track">
          <div class="progress-fill" style="width: ${d.progress || 0}%"></div>
        </div>
      </div>
      
      <div class="download-meta">
        <div class="txt-status" style="font-weight: 600; color: var(--primary);">${d.status.toUpperCase()}</div>
        <div class="meta-stats">
          <span class="txt-size">${this.formatSize(d.downloaded)} / ${this.formatSize(d.size)}</span>
          <span class="txt-speed">${this.formatSpeed(d.speed)}</span>
          <span class="txt-eta">${d.eta || '--'}</span>
        </div>
      </div>
      ${errorHtml}
    `;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.ui = new DownloadManagerUI();
});
