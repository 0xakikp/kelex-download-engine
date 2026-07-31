import React, { useState, useEffect } from 'react';
import './App.css';

interface Download {
  id: string;
  filename: string;
  url: string;
  type: 'http' | 'youtube' | 'torrent' | 'magnet' | 'convert';
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error' | 'converting' | 'seeding';
  progress: number;
  size: number;
  downloaded: number;
  speed: number;
  connections: number;
  eta: string;
  createdAt: string;
  category: string;
  error?: string;
  quality?: string;
  format?: string;
}

interface Stats {
  active: number;
  completed: number;
  totalSpeed: number;
}

function App() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [stats, setStats] = useState<Stats>({ active: 0, completed: 0, totalSpeed: 0 });
  const [diskFree, setDiskFree] = useState<string>('-- GB');
  const [wsOnline, setWsOnline] = useState<boolean>(false);
  
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [newUrl, setNewUrl] = useState('');
  const [quality, setQuality] = useState('best');
  const [format, setFormat] = useState('default');
  const [speedLimit, setSpeedLimit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const res = await fetch('/api/v1/downloads');
      const data = await res.json();
      if (data.downloads) setDownloads(data.downloads);
      if (data.stats) setStats(data.stats);

      const sysRes = await fetch('/api/v1/system/info');
      const sys = await sysRes.json();
      if (sys.disk) {
        setDiskFree((sys.disk.free / (1024 * 1024 * 1024)).toFixed(1) + ' GB');
      }
    } catch (err) {
      console.error('Failed to fetch initial state', err);
    }
  };

  useEffect(() => {
    fetchData();
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/progress`;
    let ws: WebSocket;

    const connectWS = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setWsOnline(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'progress') {
            const updated = message.download;
            setDownloads(prev => {
              const index = prev.findIndex(d => d.id === updated.id);
              if (index >= 0) {
                const copy = [...prev];
                copy[index] = updated;
                return copy;
              } else {
                return [updated, ...prev];
              }
            });
            if (message.stats) {
              setStats(message.stats);
            }
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        setWsOnline(false);
        setTimeout(connectWS, 3000);
      };
    };

    connectWS();
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number) => {
    return formatSize(bytesPerSec) + '/s';
  };

  const handleAddDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl.trim(),
          quality: quality !== 'best' ? quality : undefined,
          format: format !== 'default' ? format : undefined,
        }),
      });
      if (res.ok) {
        setNewUrl('');
        fetchData();
      } else {
        alert('Failed to add download');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (id: string, actionType: 'pause' | 'resume' | 'retry' | 'delete') => {
    try {
      let endpoint = `/api/v1/downloads/${id}/${actionType}`;
      let method = 'POST';
      
      if (actionType === 'delete') {
        endpoint = `/api/v1/downloads/${id}`;
        method = 'DELETE';
      }
      
      const res = await fetch(endpoint, { method });
      if (res.ok) {
        if (actionType === 'delete') {
          setDownloads(prev => prev.filter(d => d.id !== id));
        } else {
          fetchData();
        }
      }
    } catch (err) {
      console.error(`Failed to execute ${actionType} action`, err);
    }
  };

  const handleSetSpeedLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/system/speed-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: speedLimit.trim() || 'off' }),
      });
      if (res.ok) {
        alert(`Speed limit set: ${speedLimit || 'off'}`);
        setSpeedLimit('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Text-based progress bar drawing
  const drawProgressBar = (progress: number) => {
    const width = 20;
    const filledLength = Math.round((Math.min(100, Math.max(0, progress)) / 100) * width);
    const emptyLength = width - filledLength;
    return '[' + '█'.repeat(filledLength) + '░'.repeat(emptyLength) + ']';
  };

  // Filtering
  const filteredDownloads = downloads.filter((d) => {
    const matchesSearch = (d.filename || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (d.url || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (activeCategory === 'all') return matchesSearch;
    return matchesSearch && (d.category || '').toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <div className="terminal-container">
      {/* Header bar */}
      <header className="term-header">
        <div className="term-title">KELEX ENGINE v2.0.0</div>
        <div className="term-stats-bar">
          <div>STATUS: <span style={{ color: wsOnline ? 'var(--success)' : 'var(--danger)' }}>{wsOnline ? 'ONLINE' : 'OFFLINE'}</span></div>
          <div>ACTIVE: <span>{stats.active}</span></div>
          <div>COMPLETED: <span>{stats.completed}</span></div>
          <div>SPEED: <span>{formatSpeed(stats.totalSpeed)}</span></div>
          <div>DISK_FREE: <span>{diskFree}</span></div>
        </div>
      </header>

      {/* Speed Limit Input */}
      <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
        <span>kelexd --limit</span>
        <form onSubmit={handleSetSpeedLimit} style={{ display: 'inline-flex', gap: '5px' }}>
          <input 
            type="text" 
            placeholder="[off]" 
            value={speedLimit} 
            onChange={(e) => setSpeedLimit(e.target.value)}
            style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-white)', fontSize: '0.8rem', padding: '0 4px', outline: 'none', width: '60px' }}
          />
          <button type="submit" style={{ background: 'transparent', border: 'none', color: 'var(--text-white)', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem' }}>[SET]</button>
        </form>
      </div>

      {/* Form Command Prompt */}
      <section className="prompt-box">
        <form onSubmit={handleAddDownload}>
          <div className="prompt-line">
            <span className="prompt-symbol">kelex add --url</span>
            <input 
              type="text" 
              className="prompt-input"
              placeholder="http://example.com/file.zip"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              disabled={isSubmitting}
              autoComplete="off"
              spellCheck={false}
            />
            <span className="cursor-blink">_</span>
          </div>
          
          <div className="prompt-options" style={{ marginTop: '0.5rem' }}>
            <div>
              <span>--quality</span>{' '}
              <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                <option value="best">best</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
                <option value="audio">audio-only</option>
              </select>
            </div>
            <div>
              <span>--format</span>{' '}
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="default">none</option>
                <option value="mp4">mp4</option>
                <option value="mkv">mkv</option>
                <option value="webm">webm</option>
                <option value="mp3">mp3</option>
              </select>
            </div>
          </div>
        </form>
      </section>

      {/* Filters row */}
      <div className="controls-row">
        <div className="category-filters">
          {['all', 'videos', 'torrents', 'audio', 'documents'].map(cat => (
            <button 
              key={cat} 
              className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              [{cat.toUpperCase()}]
            </button>
          ))}
        </div>

        <div className="search-container">
          <span>grep</span>
          <input 
            type="text" 
            className="search-field"
            placeholder="pattern"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Queue items */}
      <div className="queue-list">
        {filteredDownloads.length === 0 ? (
          <div className="empty-term-state">
            No items in queue. Add URLs above to begin.
          </div>
        ) : (
          filteredDownloads.map(d => (
            <div key={d.id} className={`queue-item ${d.status}`}>
              
              <div className="item-header">
                <div className="item-title-section">
                  <div className="item-filename">
                    &gt; [{d.type.toUpperCase()}] {d.filename || d.url}
                  </div>
                  <div className="item-meta-row">
                    <div>SIZE: <span>{formatSize(d.size)}</span></div>
                    <div>SPEED: <span>{formatSpeed(d.speed)}</span></div>
                    <div>ETA: <span>{d.eta || '--'}</span></div>
                    <div>STATUS: <span className={`status-text-${d.status}`}>{d.status.toUpperCase()}</span></div>
                  </div>
                </div>

                <div className="item-actions">
                  {d.status === 'downloading' || d.status === 'queued' ? (
                    <button className="action-link" onClick={() => handleAction(d.id, 'pause')}>[PAUSE]</button>
                  ) : (
                    (d.status === 'paused' || d.status === 'error') && (
                      <button className="action-link" onClick={() => handleAction(d.id, 'resume')}>[RESUME]</button>
                    )
                  )}
                  <button className="action-link" onClick={() => handleAction(d.id, 'retry')}>[RESTART]</button>
                  <button className="action-link danger" onClick={() => handleAction(d.id, 'delete')}>[REMOVE]</button>
                </div>
              </div>

              {/* Text-based progress bar */}
              <div className="progress-drawing-row">
                <span className="progress-bar-drawing">{drawProgressBar(d.progress)}</span>
                <span>{d.progress ? d.progress.toFixed(1) : '0.0'}%</span>
                <span>({formatSize(d.downloaded)} done)</span>
              </div>

              {/* Error Output box */}
              {d.status === 'error' && d.error && (
                <div className="error-box">
                  <div>[ERR]: {d.error}</div>
                </div>
              )}

            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
