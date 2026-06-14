import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, FileText, FileAudio, FileVideo, Image, Archive, Trash2, HardDrive, Download } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001/api/v1' : '/api/v1');

const typeIcons: Record<string, any> = {
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
  image: Image,
  archive: Archive,
  program: HardDrive,
  disk: HardDrive,
  torrent: Download,
  unknown: FolderOpen,
};

const typeColors: Record<string, string> = {
  video: '#FF6B35',
  audio: '#AF52DE',
  document: '#0A84FF',
  image: '#32D74B',
  archive: '#FF9500',
  program: '#8A8A93',
  disk: '#8A8A93',
  torrent: '#FF3B30',
  unknown: '#8A8A93',
};

function formatBytes(b: number) {
  if (b === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log10(b) / 3);
  return `${(b / Math.pow(1000, i)).toFixed(1)} ${units[i]}`;
}

export default function Files() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch(`${API_BASE}/files/`)
      .then(r => r.json())
      .then(data => {
        setFiles(data.files || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? files : files.filter(f => f.type === filter);

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  const deleteFile = async (name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/files/${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok) setFiles(prev => prev.filter(f => f.name !== name));
    } catch { /* ignore */ }
  };

  const downloadFile = (name: string) => {
    window.open(`${API_BASE}/files/download/${encodeURIComponent(name)}`, '_blank');
  };

  return (
    <div className="min-h-screen">
      <section className="relative py-10 px-6 text-center">
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.02] bg-accent-cyan" style={{ filter: 'blur(100px)', top: '10%', left: '50%', transform: 'translateX(-50%)' }} />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
          <FolderOpen size={56} className="text-accent-cyan mx-auto mb-4" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
          className="font-display font-bold text-[clamp(2rem,5vw,4rem)] text-text-primary mb-2">File Browser</motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
          className="text-text-secondary text-lg max-w-[520px] mx-auto">
          {files.length} files · {formatBytes(totalSize)} total
        </motion.p>
      </section>

      {/* Filter tabs */}
      <div className="flex justify-center gap-2 px-6 mb-6 flex-wrap">
        {['all', 'video', 'audio', 'document', 'image', 'archive'].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 h-8 rounded-full text-xs font-medium transition-colors capitalize ${
              filter === t ? 'bg-accent-cyan text-white' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* File list */}
      <section className="max-w-[900px] mx-auto px-6 pb-10">
        {loading ? (
          <div className="text-center text-text-secondary py-20">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-text-secondary py-20">No files found</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((file, i) => {
              const Icon = typeIcons[file.type] || FolderOpen;
              const color = typeColors[file.type] || '#8A8A93';
              return (
                <motion.div key={file.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 bg-bg-secondary border border-border-subtle rounded-lg px-4 py-3 hover:bg-bg-hover transition-colors group">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{file.name}</p>
                    <p className="text-[10px] text-text-tertiary font-mono">{formatBytes(file.size)} · {file.type} · {new Date(file.modified).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => downloadFile(file.name)}
                    className="p-2 rounded-md text-text-tertiary hover:text-accent-blue hover:bg-bg-hover transition-colors opacity-0 group-hover:opacity-100">
                    <Download size={16} />
                  </button>
                  <button onClick={() => deleteFile(file.name)}
                    className="p-2 rounded-md text-text-tertiary hover:text-accent-red hover:bg-bg-hover transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
