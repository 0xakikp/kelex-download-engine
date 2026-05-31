export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'error' | 'converting' | 'seeding';
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
  createdAt: string;
  completedAt?: string;
  priority: 'highest' | 'high' | 'normal' | 'low' | 'lowest';
  category: string;
  error?: string;
  quality?: string;
  format?: string;
  outputPath?: string;
}

export interface DownloadCreateInput {
  url: string;
  filename?: string;
  type?: DownloadType;
  priority?: Download['priority'];
  category?: string;
  quality?: string;
  format?: string;
}

export interface DownloadUpdateInput {
  status?: DownloadStatus;
  progress?: number;
  downloaded?: number;
  speed?: number;
  error?: string;
  outputPath?: string;
}
