import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ChevronDown, ChevronRight, Code } from 'lucide-react';

const methodColors: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'rgba(50,215,75,0.15)', text: 'var(--accent-cyan)' },
  POST: { bg: 'rgba(10,132,255,0.15)', text: 'var(--accent-blue)' },
  DELETE: { bg: 'rgba(255,59,48,0.15)', text: 'var(--accent-red)' },
  PATCH: { bg: 'rgba(255,149,0,0.15)', text: 'var(--accent-amber)' },
};

const endpoints = [
  {
    category: 'Downloads',
    items: [
      { method: 'GET', path: '/api/v1/downloads', desc: 'List all downloads with stats.', params: [] },
      { method: 'GET', path: '/api/v1/downloads/stats', desc: 'Get download statistics.', params: [] },
      { method: 'GET', path: '/api/v1/downloads/active', desc: 'Get active downloads.', params: [] },
      { method: 'GET', path: '/api/v1/downloads/:id', desc: 'Get details of a specific download.', params: [{ name: 'id', type: 'string', required: true, desc: 'Download ID' }] },
      { method: 'POST', path: '/api/v1/downloads', desc: 'Add a new download by URL.', params: [{ name: 'url', type: 'string', required: true, desc: 'Download URL' }, { name: 'type', type: 'string', required: false, desc: 'http | youtube | magnet' }, { name: 'filename', type: 'string', required: false, desc: 'Custom filename' }, { name: 'quality', type: 'string', required: false, desc: 'e.g. 720, 1080, best' }, { name: 'format', type: 'string', required: false, desc: 'mp4, mp3, webm' }] },
      { method: 'POST', path: '/api/v1/downloads/:id/pause', desc: 'Pause an active download.', params: [{ name: 'id', type: 'string', required: true, desc: 'Download ID' }] },
      { method: 'POST', path: '/api/v1/downloads/:id/resume', desc: 'Resume a paused download.', params: [{ name: 'id', type: 'string', required: true, desc: 'Download ID' }] },
      { method: 'POST', path: '/api/v1/downloads/:id/cancel', desc: 'Cancel a download.', params: [{ name: 'id', type: 'string', required: true, desc: 'Download ID' }] },
      { method: 'POST', path: '/api/v1/downloads/:id/retry', desc: 'Retry a failed download.', params: [{ name: 'id', type: 'string', required: true, desc: 'Download ID' }] },
      { method: 'DELETE', path: '/api/v1/downloads/:id', desc: 'Remove a download and its file.', params: [{ name: 'id', type: 'string', required: true, desc: 'Download ID' }] },
    ],
  },
  {
    category: 'YouTube',
    items: [
      { method: 'GET', path: '/api/v1/youtube/info?url=...', desc: 'Get video info and available formats.', params: [{ name: 'url', type: 'string', required: true, desc: 'YouTube URL' }] },
      { method: 'GET', path: '/api/v1/youtube/search?q=...', desc: 'Search YouTube videos by query.', params: [{ name: 'q', type: 'string', required: true, desc: 'Search query' }] },
      { method: 'POST', path: '/api/v1/youtube/download', desc: 'Download a YouTube video.', params: [{ name: 'url', type: 'string', required: true, desc: 'YouTube URL' }, { name: 'quality', type: 'string', required: false, desc: 'e.g. 720, 1080, best' }, { name: 'format', type: 'string', required: false, desc: 'mp4, webm' }] },
    ],
  },
  {
    category: 'Torrents',
    items: [
      { method: 'POST', path: '/api/v1/torrents/add', desc: 'Add a torrent via magnet link.', params: [{ name: 'magnet', type: 'string', required: true, desc: 'Magnet URI' }, { name: 'filename', type: 'string', required: false, desc: 'Custom filename' }] },
      { method: 'GET', path: '/api/v1/torrents/search?q=...', desc: 'Search torrents across indexes.', params: [{ name: 'q', type: 'string', required: true, desc: 'Search query' }] },
    ],
  },
  {
    category: 'Converter',
    items: [
      { method: 'POST', path: '/api/v1/convert', desc: 'Start a video-to-audio conversion job.', params: [{ name: 'inputPath', type: 'string', required: true, desc: 'Source file path' }, { name: 'outputFormat', type: 'string', required: true, desc: 'mp3, flac, aac, wav, m4a' }, { name: 'quality', type: 'string', required: false, desc: 'high, medium, low' }] },
    ],
  },
  {
    category: 'System',
    items: [
      { method: 'GET', path: '/health', desc: 'Health check.', params: [] },
      { method: 'GET', path: '/api/v1/system/health', desc: 'Check if aria2c, yt-dlp, ffmpeg are available.', params: [] },
      { method: 'GET', path: '/api/v1/system/info', desc: 'Get system info (memory, disk, CPU).', params: [] },
    ],
  },
  {
    category: 'WebSocket',
    items: [
      { method: 'WS', path: '/ws/progress', desc: 'Real-time download progress updates.', params: [] },
    ],
  },
];

const codeExamples: Record<string, Record<string, string>> = {
  curl: {
    'Download a File': `curl -X POST http://localhost:3001/api/v1/downloads \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/file.zip",
    "filename": "my-file.zip"
  }'`,
    'Download YouTube Video': `curl -X POST http://localhost:3001/api/v1/youtube/download \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "quality": "720", "format": "mp4"}'`,
    'Search YouTube': `curl -X GET "http://localhost:3001/api/v1/youtube/search?q=lofi+hip+hop"`,
    'Add Magnet Link': `curl -X POST http://localhost:3001/api/v1/torrents/add \\
  -H "Content-Type: application/json" \\
  -d '{"magnet": "magnet:?xt=urn:btih:..."}'`,
    'Convert to MP3': `curl -X POST http://localhost:3001/api/v1/convert \\
  -H "Content-Type: application/json" \\
  -d '{"inputPath": "/opt/kelex-downloads/video.mp4", "outputFormat": "mp3", "quality": "high"}'`,
  },
  javascript: {
    'Download a File': `fetch('http://localhost:3001/api/v1/downloads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/file.zip',
    filename: 'my-file.zip'
  })
}).then(r => r.json());`,
    'Download YouTube Video': `fetch('http://localhost:3001/api/v1/youtube/download', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    quality: '720',
    format: 'mp4'
  })
}).then(r => r.json());`,
  },
  python: {
    'Download a File': `import requests

resp = requests.post('http://localhost:3001/api/v1/downloads', json={
    'url': 'https://example.com/file.zip',
    'filename': 'my-file.zip'
})
print(resp.json())`,
    'Download YouTube Video': `import requests

resp = requests.post('http://localhost:3001/api/v1/youtube/download', json={
    'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'quality': '720',
    'format': 'mp4'
})
print(resp.json())`,
  },
};

export default function ApiDocs() {
  const [openCategory, setOpenCategory] = useState<string | null>('Downloads');
  const [openEndpoint, setOpenEndpoint] = useState<string | null>(null);
  const [lang, setLang] = useState<'curl' | 'javascript' | 'python'>('curl');
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <section className="relative py-10 px-6 text-center">
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.02] bg-accent-blue" style={{ filter: 'blur(100px)', top: '10%', left: '50%', transform: 'translateX(-50%)' }} />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
          <Code size={56} className="text-accent-blue mx-auto mb-4" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
          className="font-display font-bold text-[clamp(2rem,5vw,4rem)] text-text-primary mb-2">API Reference</motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
          className="text-text-secondary text-lg max-w-[520px] mx-auto">Programmatic access to Kelex. Build integrations, automations, and custom workflows.</motion.p>
      </section>

      <div className="max-w-[1200px] mx-auto px-6 pb-20 grid grid-cols-[1fr_380px] gap-8 max-lg:grid-cols-1">
        {/* Endpoints */}
        <div>
          {endpoints.map((cat) => (
            <div key={cat.category} className="mb-6">
              <button onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
                className="flex items-center gap-2 text-text-primary font-semibold mb-3">
                {openCategory === cat.category ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                {cat.category}
              </button>
              <AnimatePresence>
                {openCategory === cat.category && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    {cat.items.map((ep) => {
                      const colors = methodColors[ep.method] || methodColors.GET;
                      const isOpen = openEndpoint === `${cat.category}-${ep.path}`;
                      return (
                        <div key={ep.path} className="border border-border-subtle rounded-lg mb-2 overflow-hidden">
                          <button onClick={() => setOpenEndpoint(isOpen ? null : `${cat.category}-${ep.path}`)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-hover transition-colors">
                            <span className="text-xs font-mono font-semibold px-2 py-1 rounded" style={{ backgroundColor: colors.bg, color: colors.text }}>{ep.method}</span>
                            <span className="text-sm font-mono text-text-primary">{ep.path}</span>
                            <span className="text-xs text-text-secondary ml-auto">{ep.desc}</span>
                          </button>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                <div className="px-4 pb-4 pt-2 border-t border-border-subtle">
                                  {ep.params.length > 0 && (
                                    <div className="mb-3">
                                      <p className="text-xs font-semibold text-text-secondary mb-2">Parameters</p>
                                      {ep.params.map((p) => (
                                        <div key={p.name} className="flex items-center gap-2 text-sm mb-1">
                                          <span className="font-mono text-accent-blue">{p.name}</span>
                                          <span className="text-xs text-text-tertiary">{p.type}{p.required && ' · required'}</span>
                                          <span className="text-text-secondary">{p.desc}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Code Examples */}
        <div className="shrink-0">
          <div className="sticky top-24">
            <div className="bg-bg-secondary border border-border-subtle rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
                {(['curl', 'javascript', 'python'] as const).map((l) => (
                  <button key={l} onClick={() => setLang(l)}
                    className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${lang === l ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {Object.entries(codeExamples[lang]).map(([title, code]) => (
                  <div key={title} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-text-secondary">{title}</p>
                      <button onClick={() => copy(code)} className="text-text-tertiary hover:text-text-primary transition-colors">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <pre className="bg-bg-tertiary rounded-md p-3 text-xs font-mono text-text-secondary overflow-x-auto">{code}</pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

