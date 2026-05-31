import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws/progress';

export type DownloadStatus = 'downloading' | 'paused' | 'queued' | 'completed' | 'error' | 'converting' | 'seeding';
export type DownloadType = 'http' | 'youtube' | 'torrent' | 'magnet' | 'convert';

export interface Download {
  id: string;
  filename: string;
  url: string;
  type: DownloadType;
  status: DownloadStatus;
  progress: number;
  size: number;
  downloaded: number;
  speed: number;
  speedHistory: number[];
  connections: number;
  eta: string;
  createdAt: Date;
  priority: 'highest' | 'high' | 'normal' | 'low' | 'lowest';
  category: string;
  error?: string;
  quality?: string;
  format?: string;
}

interface DownloadContextType {
  downloads: Download[];
  addDownload: (download: Partial<Download>) => void;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  retryDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  batchPause: (ids: string[]) => void;
  batchResume: (ids: string[]) => void;
  batchRemove: (ids: string[]) => void;
  setPriority: (id: string, priority: Download['priority']) => void;
  torEnabled: boolean;
  toggleTor: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  totalSpeed: number;
  activeCount: number;
  stats: { total: number; active: number; paused: number; queued: number; completed: number; failed: number; totalSpeed: number };
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, paused: 0, queued: 0, completed: 0, failed: 0, totalSpeed: 0 });
  const [torEnabled, setTorEnabled] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [accentColor, setAccentColor] = useState('#0A84FF');
  const wsRef = useRef<WebSocket | null>(null);

  // Theme effect
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.classList.add('light');
    else root.classList.remove('light');
  }, [theme]);

  // Accent color effect
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-blue', accentColor);
    root.style.setProperty('--status-downloading', accentColor);
  }, [accentColor]);

  // Fetch initial downloads + stats
  useEffect(() => {
    fetch(`${API_BASE}/downloads`)
      .then(r => r.json())
      .then(data => {
        if (data.downloads) {
          setDownloads(data.downloads.map((d: any) => ({
            ...d,
            createdAt: new Date(d.createdAt),
            speedHistory: d.speedHistory || Array(60).fill(0),
          })));
        }
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {
        // Fallback: keep empty if backend not ready
      });
  }, []);

  // WebSocket for real-time progress
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => console.log('[WS] Connected');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'download.progress') {
          const d = msg.data;
          setDownloads(prev => {
            const idx = prev.findIndex(x => x.id === d.id);
            if (idx === -1) {
              return [{
                ...d,
                createdAt: new Date(d.createdAt),
                speedHistory: d.speedHistory || Array(60).fill(0),
              }, ...prev];
            }
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              ...d,
              createdAt: new Date(d.createdAt),
              speedHistory: d.speedHistory || next[idx].speedHistory,
            };
            return next;
          });
        }
        if (msg.type === 'stats.update') {
          setStats(msg.data);
        }
      } catch (err) {
        // ignore malformed
      }
    };
    ws.onclose = () => console.log('[WS] Disconnected');
    ws.onerror = (err) => console.error('[WS] Error', err);

    return () => ws.close();
  }, []);

  const addDownload = useCallback(async (partial: Partial<Download>) => {
    try {
      const res = await fetch(`${API_BASE}/downloads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: partial.url,
          filename: partial.filename,
          type: partial.type,
          priority: partial.priority,
          category: partial.category,
          quality: partial.quality,
          format: partial.format,
        }),
      });
      if (!res.ok) throw new Error('Failed to create download');
      const data = await res.json();
      setDownloads(prev => [{
        ...data,
        createdAt: new Date(data.createdAt),
        speedHistory: data.speedHistory || Array(60).fill(0),
      }, ...prev]);
    } catch {
      // Fallback local
      const newDownload: Download = {
        id: generateId(), filename: partial.filename || 'New Download', url: partial.url || '',
        type: partial.type || 'http', status: 'queued', progress: 0,
        size: partial.size || 0, downloaded: 0, speed: 0,
        speedHistory: Array(60).fill(0), connections: 4, eta: 'Queued',
        createdAt: new Date(), priority: partial.priority || 'normal',
        category: partial.category || 'General', quality: partial.quality, format: partial.format,
      };
      setDownloads(prev => [newDownload, ...prev]);
    }
  }, []);

  const pauseDownload = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/downloads/${id}/pause`, { method: 'POST' });
    } catch {
      setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'paused' as DownloadStatus, speed: 0 } : d));
    }
  }, []);

  const resumeDownload = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/downloads/${id}/resume`, { method: 'POST' });
    } catch {
      setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'downloading' as DownloadStatus, speed: 5 + Math.random() * 10 } : d));
    }
  }, []);

  const cancelDownload = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/downloads/${id}/cancel`, { method: 'POST' });
    } catch {
      setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'error' as DownloadStatus, speed: 0, error: 'Cancelled by user' } : d));
    }
  }, []);

  const retryDownload = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/downloads/${id}/retry`, { method: 'POST' });
    } catch {
      setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'queued' as DownloadStatus, progress: 0, downloaded: 0, error: undefined, speed: 0 } : d));
    }
  }, []);

  const removeDownload = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/downloads/${id}`, { method: 'DELETE' });
    } catch {
      setDownloads(prev => prev.filter(d => d.id !== id));
    }
  }, []);

  const batchPause = useCallback((ids: string[]) => {
    ids.forEach(id => pauseDownload(id));
  }, [pauseDownload]);

  const batchResume = useCallback((ids: string[]) => {
    ids.forEach(id => resumeDownload(id));
  }, [resumeDownload]);

  const batchRemove = useCallback((ids: string[]) => {
    ids.forEach(id => removeDownload(id));
  }, [removeDownload]);

  const setPriority = useCallback((id: string, priority: Download['priority']) => {
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, priority } : d));
  }, []);

  const toggleTor = useCallback(() => setTorEnabled(p => !p), []);
  const toggleTheme = useCallback(() => setTheme(p => p === 'dark' ? 'light' : 'dark'), []);

  const totalSpeed = downloads.filter(d => d.status === 'downloading').reduce((s, d) => s + d.speed, 0);
  const activeCount = downloads.filter(d => d.status === 'downloading').length;

  return (
    <DownloadContext.Provider value={{
      downloads, addDownload, pauseDownload, resumeDownload, cancelDownload,
      retryDownload, removeDownload, batchPause, batchResume, batchRemove,
      setPriority, torEnabled, toggleTor, theme, toggleTheme, setTheme, accentColor,
      setAccentColor, totalSpeed, activeCount, stats,
    }}>
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownloads() {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownloads must be inside DownloadProvider');
  return ctx;
}
