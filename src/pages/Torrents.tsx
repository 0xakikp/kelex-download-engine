import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network, Search, Magnet, Download,
  ArrowUp, ArrowDown, Clock, Shield,
  X, ChevronDown, ChevronUp
} from 'lucide-react';
import { useDownloads } from '@/context/DownloadContext';

/* ─── Mock Data ─── */
const mockTorrents = [
  { id: 't1', name: 'Ubuntu 24.04 LTS Desktop AMD64', category: 'Software', size: '5.8 GB', seeders: 1247, leechers: 342, age: '3 days ago', source: '1337x', health: 85 },
  { id: 't2', name: 'Blender 4.2 - Open Source 3D Creation', category: 'Software', size: '380 MB', seeders: 892, leechers: 156, age: '1 week ago', source: 'RARBG', health: 92 },
  { id: 't3', name: 'Sintel (2010) 2160p BluRay REMUX', category: 'Movies', size: '12.5 GB', seeders: 2341, leechers: 567, age: '2 days ago', source: 'YTS', health: 96 },
  { id: 't4', name: 'The.Fellowship.of.the.Ring.2001.Extended.1080p', category: 'Movies', size: '24.1 GB', seeders: 456, leechers: 123, age: '2 weeks ago', source: 'ETTV', health: 78 },
  { id: 't5', name: 'Kali Linux 2024.2 Full Tools Collection', category: 'Software', size: '18.3 GB', seeders: 678, leechers: 234, age: '5 days ago', source: '1337x', health: 88 },
  { id: 't6', name: 'Lo-Fi Chill Beats Collection (FLAC)', category: 'Music', size: '2.4 GB', seeders: 345, leechers: 89, age: '1 month ago', source: 'RuTracker', health: 72 },
];

const categoryColors: Record<string, { bg: string; text: string }> = {
  Software: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  Movies: { bg: 'rgba(220,38,38,0.15)', text: '#DC2626' },
  Music: { bg: 'rgba(217,70,239,0.15)', text: '#D946EF' },
  Games: { bg: 'rgba(16,185,129,0.15)', text: '#10B981' },
  Books: { bg: 'rgba(249,115,22,0.15)', text: '#F97316' },
};

/* ─── Peer Network Canvas ─── */
function PeerNetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peersRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; type: string; r: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();

    const types = ['seeder', 'leecher', 'peer'];
    const colors: Record<string, string> = { seeder: '#10B981', leecher: '#F59E0B', peer: '#3B82F6' };
    if (peersRef.current.length === 0) {
      peersRef.current = Array.from({ length: 40 }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        type: types[Math.floor(Math.random() * 3)],
        r: 4 + Math.random() * 8,
      }));
    }

    let animId: number;
    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Center node (you)
      const cx = w / 2, cy = h / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'var(--accent-blue)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('YOU', cx, cy + 3);

      peersRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // Connection line
        const dist = Math.hypot(p.x - cx, p.y - cy);
        if (dist < 180) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `${colors[p.type]}${Math.floor((1 - dist / 180) * 40).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = colors[p.type];
        ctx.fill();
      });

      // Legend
      const legendY = h - 20;
      [{ label: 'Seeder', color: '#10B981' }, { label: 'Leecher', color: '#F59E0B' }, { label: 'Peer', color: '#3B82F6' }].forEach((l, i) => {
        ctx.beginPath();
        ctx.arc(w - 200 + i * 70, legendY, 4, 0, Math.PI * 2);
        ctx.fillStyle = l.color;
        ctx.fill();
        ctx.fillStyle = '#8A8A93';
        ctx.font = '9px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(l.label, w - 192 + i * 70, legendY + 3);
      });

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full rounded-lg" style={{ width: '100%', height: '100%' }} />;
}

/* ─── Torrent Card ─── */
function TorrentCard({ torrent, index }: { torrent: typeof mockTorrents[0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cc = categoryColors[torrent.category] || { bg: 'rgba(138,138,147,0.15)', text: '#8A8A93' };
  const healthColor = torrent.health > 80 ? '#10B981' : torrent.health > 50 ? '#F59E0B' : '#EF4444';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.35 }}
      className="bg-bg-secondary border border-border-subtle rounded-lg p-4 hover:border-[#2A2A2A] hover:-translate-y-0.5 transition-all">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: cc.bg }}>
          <Network size={20} style={{ color: cc.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-text-primary truncate">{torrent.name}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: cc.bg, color: cc.text }}>{torrent.category}</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-text-tertiary font-mono">{torrent.size}</span>
            <span className="text-accent-cyan flex items-center gap-1"><ArrowUp size={12} /> {torrent.seeders.toLocaleString()}</span>
            <span className="text-accent-amber flex items-center gap-1"><ArrowDown size={12} /> {torrent.leechers.toLocaleString()}</span>
            <span className="text-text-tertiary flex items-center gap-1"><Clock size={12} /> {torrent.age}</span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-border-subtle overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${torrent.health}%` }} transition={{ duration: 0.6 }}
              className="h-full rounded-full" style={{ backgroundColor: healthColor }} />
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button className="bg-accent-violet hover:opacity-90 text-white text-xs font-medium px-4 py-2 rounded-md flex items-center gap-1.5 transition-colors">
            <Download size={14} /> DOWNLOAD
          </button>
          <button className="p-2 rounded-md hover:bg-bg-hover text-text-secondary transition-colors self-center">
            <Magnet size={16} />
          </button>
        </div>
      </div>

      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] text-text-tertiary mt-3 hover:text-text-secondary transition-colors">
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Details
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 pt-3 border-t border-border-subtle grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-text-tertiary font-mono">SOURCE</p>
                <p className="text-xs text-text-primary mt-0.5">{torrent.source}</p>
              </div>
              <div>
                <p className="text-[10px] text-text-tertiary font-mono">HEALTH</p>
                <p className="text-xs mt-0.5" style={{ color: healthColor }}>{torrent.health}%</p>
              </div>
              <div>
                <p className="text-[10px] text-text-tertiary font-mono">RATIO</p>
                <p className="text-xs text-accent-cyan font-mono mt-0.5">S/L: {(torrent.seeders / torrent.leechers).toFixed(1)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Main Page ─── */
export default function Torrents() {
  const { torEnabled } = useDownloads();
  const [searchQuery, setSearchQuery] = useState('');
  const [magnetLink, setMagnetLink] = useState('');
  const [searched, setSearched] = useState(false);
  const [activeTorrents, setActiveTorrents] = useState<typeof mockTorrents>([]);

  const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001/api/v1' : '/api/v1');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearched(true);
    // Backend search not implemented yet - show mock results
  };

  const addMagnet = async () => {
    if (!magnetLink.startsWith('magnet:')) return;
    try {
      const res = await fetch(`${API_BASE}/torrents/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet: magnetLink }),
      });
      if (!res.ok) throw new Error('Failed to add magnet');
      const data = await res.json();
      setActiveTorrents(prev => [...prev, { ...mockTorrents[0], id: data.id || `active_${Date.now()}` }]);
      setMagnetLink('');
    } catch {
      // Fallback: add to local state only
      setActiveTorrents(prev => [...prev, { ...mockTorrents[0], id: `active_${Date.now()}` }]);
      setMagnetLink('');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Tor Banner */}
      <AnimatePresence>
        {torEnabled && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-accent-violet/15 border-b border-accent-violet/30 px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-accent-violet" />
              <span className="text-sm text-accent-violet">TOR Privacy Active — All torrent traffic routed through onion network</span>
            </div>
            <X size={14} className="text-accent-violet cursor-pointer" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="relative py-10 px-6 text-center" style={{ background: 'linear-gradient(180deg, #0F0818 0%, var(--bg-primary) 100%)' }}>
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.025] bg-accent-violet" style={{ filter: 'blur(100px)', top: '10%', left: '50%', transform: 'translateX(-50%)' }} />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}>
          <Network size={56} className="text-accent-violet mx-auto mb-4" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
          className="font-display font-bold text-[clamp(2rem,5vw,4rem)] text-text-primary mb-2">Torrent Engine</motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
          className="text-text-secondary text-lg max-w-[520px] mx-auto">Search millions of torrents. Download via magnet links. Track every peer.</motion.p>

        {/* Dual Input */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.4 }}
          className="max-w-[720px] mx-auto mt-8 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-bg-tertiary border border-border-default rounded-full px-5 h-[52px] focus-within:border-accent-violet transition-all">
            <Search size={16} className="text-text-tertiary" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search torrents by name..."
              className="bg-transparent flex-1 text-text-primary placeholder:text-text-tertiary outline-none text-sm" />
            <button onClick={handleSearch} className="bg-accent-violet hover:opacity-90 text-white font-medium px-5 h-10 rounded-full text-sm transition-colors">SEARCH</button>
          </div>
          <span className="text-[10px] text-text-tertiary font-mono">OR</span>
          <div className="flex-1 flex items-center gap-2 bg-bg-tertiary border border-border-default rounded-full px-5 h-[52px] focus-within:border-accent-violet transition-all">
            <Magnet size={16} className="text-text-tertiary" />
            <input type="text" value={magnetLink} onChange={e => setMagnetLink(e.target.value)}
              placeholder="Paste magnet link..."
              className="bg-transparent flex-1 text-text-primary placeholder:text-text-tertiary outline-none text-sm" />
            <button onClick={addMagnet} className="bg-accent-violet hover:opacity-90 text-white font-medium px-5 h-10 rounded-full text-sm transition-colors">ADD</button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex justify-center gap-6 mt-6">
          <span className="text-xs font-mono text-accent-violet">DHT Peers: 2.4M</span>
          <span className="text-xs font-mono text-text-secondary">Indexing: 47 sites</span>
          <span className="text-xs font-mono text-accent-cyan">Active: {activeTorrents.length || 8} torrents</span>
        </motion.div>
      </section>

      {/* Search Results */}
      {searched && (
        <section className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em]">SEARCH RESULTS</p>
            <p className="text-xs text-text-tertiary">{mockTorrents.length} results</p>
          </div>
          <div className="flex flex-col gap-3">
            {mockTorrents.map((t, i) => <TorrentCard key={t.id} torrent={t} index={i} />)}
          </div>
        </section>
      )}

      {/* Active Torrents */}
      {activeTorrents.length > 0 && (
        <section className="px-6 py-6 border-t border-border-subtle">
          <div className="flex items-center gap-2 mb-4">
            <p className="font-mono text-[10px] text-accent-violet tracking-[0.05em]">ACTIVE TORRENTS</p>
            <span className="bg-accent-violet/15 text-accent-violet text-xs font-mono px-2 py-0.5 rounded-full">{activeTorrents.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            {activeTorrents.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-bg-secondary border border-border-subtle rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-text-primary truncate pr-4">{t.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue font-mono animate-pulse-glow">DOWNLOADING</span>
                </div>
                <div className="h-2 rounded-full bg-border-subtle overflow-hidden mb-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} transition={{ duration: 2, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-violet shimmer-bg" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-text-tertiary">
                  <span>45.2%</span>
                  <span>{t.size}</span>
                  <span className="text-accent-cyan">~12m remaining</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border-subtle">
                  <span className="text-xs text-accent-cyan flex items-center gap-1"><ArrowDown size={12} /> 5.2 MB/s</span>
                  <span className="text-xs text-accent-violet flex items-center gap-1"><ArrowUp size={12} /> 1.8 MB/s</span>
                  <span className="text-xs text-text-secondary">S: {t.seeders}</span>
                  <span className="text-xs text-text-secondary">L: {t.leechers}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Peer Network Visualization */}
      <section className="px-6 py-6">
        <div className="bg-bg-secondary border border-border-subtle rounded-lg overflow-hidden" style={{ height: 400 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em]">PEER NETWORK</p>
              <span className="text-[10px] text-text-tertiary font-mono">12 connected</span>
            </div>
          </div>
          <div className="relative" style={{ height: 350 }}>
            <PeerNetworkCanvas />
            {/* Stats overlay */}
            <div className="absolute top-3 left-3 bg-bg-primary/80 backdrop-blur rounded-md p-3 border border-border-subtle">
              <p className="text-xs font-mono text-accent-violet">Swarm Health: 94%</p>
              <p className="text-[10px] font-mono text-accent-cyan mt-1">S: 1,247</p>
              <p className="text-[10px] font-mono text-accent-amber">L: 342</p>
              <p className="text-[10px] font-mono text-accent-blue">DHT: 8.4M</p>
            </div>
          </div>
        </div>
      </section>

      {/* Magnet Drop Zone */}
      <section className="px-6 py-6">
        <div className="border-2 border-dashed border-border-subtle rounded-xl p-10 text-center hover:border-accent-violet/50 hover:bg-accent-violet/5 transition-all cursor-pointer">
          <Magnet size={48} className="text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary text-sm font-medium">Drop a magnet link or .torrent file here</p>
          <p className="text-text-tertiary text-xs mt-1">Or paste a magnet URI from your clipboard</p>
        </div>
      </section>
    </div>
  );
}
