export interface Download {
  id: string;
  filename: string;
  url: string;
  type: 'http' | 'youtube' | 'torrent' | 'magnet' | 'convert';
  status: 'downloading' | 'paused' | 'queued' | 'completed' | 'error' | 'converting' | 'seeding';
  progress: number;
  size: number;
  downloaded: number;
  speed: number;
  speedHistory: number[];
  connections: number;
  eta: string;
  createdAt: string;
  priority: 'highest' | 'high' | 'normal' | 'low' | 'lowest';
  category: string;
  error?: string;
  quality?: string;
  format?: string;
  outputPath?: string;
  cookiesFromBrowser?: string;
  seeds?: number;
  leechers?: number;
  peers?: number;
}

export interface Stats {
  total: number;
  active: number;
  paused: number;
  queued: number;
  completed: number;
  failed: number;
  totalSpeed: number;
}

export interface YouTubeFormat {
  formatId: string;
  ext: string;
  resolution: string;
  fps?: number;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
}

export interface YouTubeInfo {
  id: string;
  title: string;
  uploader: string;
  duration?: number;
  thumbnail?: string;
  formats: YouTubeFormat[];
}

export interface YouTubeSearchResult {
  id: string;
  title: string;
  uploader: string;
  duration?: number;
  thumbnail?: string;
  viewCount?: number;
  url: string;
}
