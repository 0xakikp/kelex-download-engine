import { Globe, Download } from 'lucide-react';
import { useDownloads } from '@/context/DownloadContext';
import { useState } from 'react';

export default function TopBar() {
  const { totalSpeed, activeCount, addDownload } = useDownloads();
  const [url, setUrl] = useState('');

  const handleDownload = () => {
    if (!url.trim()) return;
    const trimmed = url.trim();
    let type: 'http' | 'youtube' | 'magnet' = 'http';
    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) type = 'youtube';
    if (trimmed.startsWith('magnet:')) type = 'magnet';
    addDownload({ url: trimmed, type });
    setUrl('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleDownload();
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-bg-secondary border-b border-border-subtle flex items-center px-4 z-50 gap-4">
      {/* Left: mini brand */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-[10px] text-text-tertiary tracking-wider">KELEX</span>
        {activeCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />}
      </div>

      {/* Center: URL input */}
      <div className="flex-1 flex justify-center max-w-2xl mx-auto">
        <div className="flex items-center gap-2 w-full bg-bg-tertiary border border-border-default rounded-full px-4 h-10 focus-within:border-accent-blue focus-within:glow-blue transition-all">
          <Globe size={16} className="text-text-tertiary shrink-0" />
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste URL, YouTube link, Magnet link..."
            className="bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none flex-1 min-w-0"
          />
          <button
            onClick={handleDownload}
            className="shrink-0 bg-accent-blue hover:bg-blue-600 text-white text-xs font-medium px-4 h-7 rounded-full transition-colors flex items-center gap-1"
          >
            <Download size={14} />
            <span>DOWNLOAD</span>
          </button>
        </div>
      </div>

      {/* Right: speed display */}
      <div className="flex items-center gap-2 shrink-0 min-w-[80px] justify-end">
        {totalSpeed > 0 && (
          <span className="font-mono text-xs text-accent-amber">
            {totalSpeed < 1 ? `${(totalSpeed * 1024).toFixed(0)} KB/s` : `${totalSpeed.toFixed(1)} MB/s`}
          </span>
        )}
      </div>
    </header>
  );
}
