import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

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
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const initialDownloads: Download[] = [
  {
    id: generateId(), filename: 'Ubuntu_24.04_LTS.iso', url: 'https://ubuntu.com/download/desktop', type: 'http',
    status: 'downloading', progress: 34, size: 5829100032, downloaded: 1981894011, speed: 12.5,
    speedHistory: Array(60).fill(0).map(() => 8 + Math.random() * 6), connections: 8, eta: '~6m 12s',
    createdAt: new Date(Date.now() - 120000), priority: 'high', category: 'Software',
  },
  {
    id: generateId(), filename: 'Cyberpunk_Edgerunners_S01E01_1080p.mp4', url: 'https://youtube.com/watch?v=abc123', type: 'youtube',
    status: 'downloading', progress: 67, size: 892000000, downloaded: 597640000, speed: 8.2,
    speedHistory: Array(60).fill(0).map(() => 6 + Math.random() * 4), connections: 4, eta: '~2m 45s',
    createdAt: new Date(Date.now() - 180000), priority: 'normal', category: 'Video', quality: '1080p', format: 'MP4',
  },
  {
    id: generateId(), filename: 'Debian_12.5.0_AMD64_DVD.iso', url: 'magnet:?xt=urn:btih:debian123', type: 'torrent',
    status: 'downloading', progress: 12, size: 3960000000, downloaded: 475200000, speed: 3.8,
    speedHistory: Array(60).fill(0).map(() => 2 + Math.random() * 3), connections: 16, eta: '~18m 30s',
    createdAt: new Date(Date.now() - 60000), priority: 'normal', category: 'Software',
  },
  {
    id: generateId(), filename: 'LoFi_Beats_Collection.mp3', url: 'https://youtube.com/watch?v=lofi456', type: 'youtube',
    status: 'converting', progress: 89, size: 128000000, downloaded: 113920000, speed: 0,
    speedHistory: Array(60).fill(0).map(() => 4 + Math.random() * 2), connections: 2, eta: '~30s',
    createdAt: new Date(Date.now() - 300000), priority: 'low', category: 'Audio', quality: '320kbps', format: 'MP3',
  },
  {
    id: generateId(), filename: 'The.Matrix.Resurrections.2021.2160p.HDR.mkv', url: 'magnet:?xt=urn:btih:matrix789', type: 'torrent',
    status: 'paused', progress: 45, size: 24100000000, downloaded: 10845000000, speed: 0,
    speedHistory: Array(60).fill(0).map(() => 5 + Math.random() * 3), connections: 12, eta: '~25m',
    createdAt: new Date(Date.now() - 600000), priority: 'low', category: 'Video',
  },
  {
    id: generateId(), filename: 'React_Documentation_PDF.zip', url: 'https://react.dev/learn', type: 'http',
    status: 'queued', progress: 0, size: 45000000, downloaded: 0, speed: 0,
    speedHistory: Array(60).fill(0), connections: 4, eta: 'Queued',
    createdAt: new Date(Date.now() - 30000), priority: 'normal', category: 'Documents',
  },
  {
    id: generateId(), filename: 'Node.js_v20_LTS_Installer.msi', url: 'https://nodejs.org/dist', type: 'http',
    status: 'completed', progress: 100, size: 31000000, downloaded: 31000000, speed: 0,
    speedHistory: Array(60).fill(0).map(() => 15 + Math.random() * 5), connections: 8, eta: 'Done',
    createdAt: new Date(Date.now() - 900000), priority: 'normal', category: 'Software',
  },
  {
    id: generateId(), filename: ' corrupted_file.exe', url: 'https://example.com/badfile', type: 'http',
    status: 'error', progress: 23, size: 15000000, downloaded: 3450000, speed: 0,
    speedHistory: Array(60).fill(0), connections: 0, eta: 'Failed',
    createdAt: new Date(Date.now() - 240000), priority: 'normal', category: 'Software', error: 'Connection reset by peer',
  },
  {
    id: generateId(), filename: 'Sintel_2010_4K.mp4', url: 'magnet:?xt=urn:btih:sintel012', type: 'torrent',
    status: 'seeding', progress: 100, size: 1250000000, downloaded: 1250000000, speed: 0.8,
    speedHistory: Array(60).fill(0).map(() => 0.5 + Math.random()), connections: 24, eta: 'Seeding',
    createdAt: new Date(Date.now() - 1200000), priority: 'low', category: 'Video',
  },
  {
    id: generateId(), filename: 'Linux_Kernel_Source.tar.gz', url: 'https://kernel.org/pub/linux/kernel', type: 'http',
    status: 'downloading', progress: 78, size: 185000000, downloaded: 144300000, speed: 22.1,
    speedHistory: Array(60).fill(0).map(() => 18 + Math.random() * 8), connections: 16, eta: '~1m 50s',
    createdAt: new Date(Date.now() - 240000), priority: 'highest', category: 'Software',
  },
];

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<Download[]>(initialDownloads);
  const [torEnabled, setTorEnabled] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [accentColor, setAccentColor] = useState('#0A84FF');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-blue', accentColor);
    root.style.setProperty('--status-downloading', accentColor);
  }, [accentColor]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDownloads(prev => prev.map(d => {
        if (d.status !== 'downloading') return d;
        const increment = (d.speed * 1024 * 1024) / 10;
        const newDownloaded = Math.min(d.downloaded + increment, d.size);
        const newProgress = Math.round((newDownloaded / d.size) * 100);
        const newSpeed = Math.max(0.1, d.speed + (Math.random() - 0.48) * 2);
        const newHistory = [...d.speedHistory.slice(1), newSpeed];
        if (newProgress >= 100) {
          return { ...d, progress: 100, downloaded: d.size, speed: 0, status: 'completed' as DownloadStatus, speedHistory: newHistory };
        }
        return { ...d, downloaded: newDownloaded, progress: newProgress, speed: newSpeed, speedHistory: newHistory };
      }));
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const addDownload = useCallback((partial: Partial<Download>) => {
    const newDownload: Download = {
      id: generateId(), filename: 'New Download', url: '', type: 'http', status: 'queued', progress: 0,
      size: 0, downloaded: 0, speed: 0, speedHistory: Array(60).fill(0), connections: 4, eta: 'Queued',
      createdAt: new Date(), priority: 'normal', category: 'General', ...partial,
    };
    setDownloads(prev => [newDownload, ...prev]);
  }, []);

  const pauseDownload = useCallback((id: string) => {
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'paused' as DownloadStatus, speed: 0 } : d));
  }, []);

  const resumeDownload = useCallback((id: string) => {
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'downloading' as DownloadStatus, speed: 5 + Math.random() * 10 } : d));
  }, []);

  const cancelDownload = useCallback((id: string) => {
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'error' as DownloadStatus, speed: 0, error: 'Cancelled by user' } : d));
  }, []);

  const retryDownload = useCallback((id: string) => {
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'queued' as DownloadStatus, progress: 0, downloaded: 0, error: undefined, speed: 0 } : d));
  }, []);

  const removeDownload = useCallback((id: string) => {
    setDownloads(prev => prev.filter(d => d.id !== id));
  }, []);

  const batchPause = useCallback((ids: string[]) => {
    setDownloads(prev => prev.map(d => ids.includes(d.id) ? { ...d, status: 'paused' as DownloadStatus, speed: 0 } : d));
  }, []);

  const batchResume = useCallback((ids: string[]) => {
    setDownloads(prev => prev.map(d => ids.includes(d.id) ? { ...d, status: 'downloading' as DownloadStatus, speed: 5 + Math.random() * 10 } : d));
  }, []);

  const batchRemove = useCallback((ids: string[]) => {
    setDownloads(prev => prev.filter(d => !ids.includes(d.id)));
  }, []);

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
      setAccentColor, totalSpeed, activeCount,
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
