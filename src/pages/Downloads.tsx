import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download as DownloadIcon, Pause, Play, Square, Search, LayoutGrid, List,
  CheckCircle, AlertCircle, Clock, Zap, ChevronDown, ChevronUp,
  Trash2, RotateCw, Filter, PlaySquare, AudioLines, FolderOpen
} from 'lucide-react';
import { useDownloads } from '@/context/DownloadContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

type ViewMode = 'compact' | 'detailed' | 'grid';
type FilterTab = 'all' | 'downloading' | 'paused' | 'queued' | 'completed' | 'failed';

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  downloading: { color: '#0A84FF', bg: 'rgba(10,132,255,0.1)', label: 'DOWNLOADING' },
  paused: { color: '#FF9500', bg: 'rgba(255,149,0,0.1)', label: 'PAUSED' },
  queued: { color: '#8A8A93', bg: 'rgba(138,138,147,0.1)', label: 'QUEUED' },
  completed: { color: '#32D74B', bg: 'rgba(50,215,75,0.1)', label: 'DONE' },
  error: { color: '#FF3B30', bg: 'rgba(255,59,48,0.1)', label: 'FAILED' },
  converting: { color: '#FF6B35', bg: 'rgba(255,107,53,0.1)', label: 'CONVERTING' },
  seeding: { color: '#AF52DE', bg: 'rgba(175,82,222,0.1)', label: 'SEEDING' },
};

function formatBytes(b: number) {
  if (b === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log10(b) / 3);
  return `${(b / Math.pow(1000, i)).toFixed(1)} ${units[i]}`;
}

export default function Downloads() {
  const { downloads, totalSpeed, pauseDownload, resumeDownload, cancelDownload, retryDownload, removeDownload, batchPause, batchResume, batchRemove } = useDownloads();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showGraph, setShowGraph] = useState(true);

  const filtered = useMemo(() => {
    let list = [...downloads];
    if (filter !== 'all') {
      const map: Record<string, string[]> = {
        downloading: ['downloading'], paused: ['paused'], queued: ['queued'],
        completed: ['completed', 'seeding'], failed: ['error'],
      };
      const statuses = map[filter] || [filter];
      list = list.filter(d => statuses.includes(d.status));
    }
    if (search) list = list.filter(d => d.filename.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [downloads, filter, search]);

  const counts = {
    downloading: downloads.filter(d => d.status === 'downloading').length,
    paused: downloads.filter(d => d.status === 'paused').length,
    queued: downloads.filter(d => d.status === 'queued').length,
    completed: downloads.filter(d => d.status === 'completed' || d.status === 'seeding').length,
    failed: downloads.filter(d => d.status === 'error').length,
  };

  const allSpeedData = downloads
    .filter(d => d.speedHistory.length > 0)
    .flatMap(d => d.speedHistory.map((s, i) => ({ time: i, [`d_${d.id}`]: s })))
    .reduce((acc: any[], curr) => {
      const existing = acc.find(a => a.time === curr.time);
      if (existing) Object.assign(existing, curr);
      else acc.push(curr);
      return acc;
    }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map(d => d.id));
  };

  return (
    <div className="min-h-screen">
      {/* Stats - Uniform size cards */}
      <div className="grid grid-cols-6 gap-3 px-6 py-4 bg-bg-secondary border-b border-border-subtle">
        {[
          { icon: DownloadIcon, label: 'Active', value: counts.downloading, color: '#0A84FF', pulse: counts.downloading > 0 },
          { icon: Pause, label: 'Paused', value: counts.paused, color: '#FF9500' },
          { icon: Clock, label: 'Queued', value: counts.queued, color: '#8A8A93' },
          { icon: CheckCircle, label: 'Done', value: counts.completed, color: '#32D74B' },
          ...(counts.failed > 0 ? [{ icon: AlertCircle, label: 'Failed', value: counts.failed, color: '#FF3B30' }] : []),
          { icon: Zap, label: 'Speed', value: totalSpeed < 1 ? `${(totalSpeed * 1024).toFixed(0)} KB/s` : `${totalSpeed.toFixed(1)} MB/s`, color: '#FF9500' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-bg-primary border border-border-subtle rounded-md h-[72px] flex items-center gap-3 px-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center relative shrink-0" style={{ backgroundColor: `${s.color}15` }}>
              <s.icon size={16} style={{ color: s.color }} />
              {s.pulse && <span className="absolute w-9 h-9 rounded-full animate-ping opacity-30" style={{ backgroundColor: s.color }} />}
            </div>
            <div className="min-w-0">
              <p className="font-mono font-semibold text-sm whitespace-nowrap truncate" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-text-secondary">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle gap-4">
        <div className="flex items-center gap-2">
          <button className="bg-accent-blue hover:bg-blue-600 text-white text-xs font-medium h-9 px-4 rounded-md flex items-center gap-2 transition-colors">
            <DownloadIcon size={14} /> New
          </button>
          <div className="w-px h-6 bg-border-subtle mx-1" />
          <button onClick={() => batchResume(filtered.map(d => d.id))} className="p-2 rounded-md hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors" title="Resume All"><Play size={16} /></button>
          <button onClick={() => batchPause(filtered.map(d => d.id))} className="p-2 rounded-md hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors" title="Pause All"><Pause size={16} /></button>
          <button className="p-2 rounded-md hover:bg-bg-hover text-text-secondary hover:text-accent-red transition-colors" title="Stop All"><Square size={16} /></button>
          <div className="w-px h-6 bg-border-subtle mx-1" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={selectAll} />
            <span className="text-xs text-text-secondary">All</span>
          </label>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              <button onClick={() => { batchPause(selectedIds); setSelectedIds([]); }} className="text-xs px-2 py-1 rounded bg-bg-hover text-text-secondary hover:text-text-primary">Pause</button>
              <button onClick={() => { batchResume(selectedIds); setSelectedIds([]); }} className="text-xs px-2 py-1 rounded bg-bg-hover text-text-secondary hover:text-text-primary">Resume</button>
              <button onClick={() => { batchRemove(selectedIds); setSelectedIds([]); }} className="text-xs px-2 py-1 rounded bg-bg-hover text-accent-red hover:text-red-400">Delete</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-bg-primary border border-border-subtle rounded-md overflow-hidden">
            {(['all', 'downloading', 'paused', 'queued', 'completed', 'failed'] as FilterTab[]).map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`px-3 h-8 text-xs font-medium transition-colors capitalize ${filter === tab ? 'bg-bg-tertiary text-text-primary border-b-2 border-accent-blue' : 'text-text-secondary hover:text-text-primary'}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="flex bg-bg-primary border border-border-subtle rounded-md overflow-hidden ml-2">
            <button onClick={() => setViewMode('compact')} className={`p-2 ${viewMode === 'compact' ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary'}`}><List size={14} /></button>
            <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary'}`}><LayoutGrid size={14} /></button>
          </div>
          <div className="relative ml-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-bg-tertiary border border-border-default rounded-md h-8 pl-8 pr-3 text-xs outline-none focus:border-accent-blue w-40" />
          </div>
          <button onClick={() => setShowGraph(!showGraph)} className="p-2 rounded-md hover:bg-bg-hover text-text-secondary transition-colors ml-1">
            {showGraph ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Speed Graph */}
      <AnimatePresence>
        {showGraph && (
          <motion.div initial={{ height: 0 }} animate={{ height: 280 }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em]">REAL-TIME MONITOR</p>
                <div className="flex gap-4 text-xs font-mono">
                  <span className="text-accent-amber">Peak: 45.2 MB/s</span>
                  <span className="text-accent-blue">Avg: {totalSpeed.toFixed(1)} MB/s</span>
                  <span className="text-accent-cyan">Total: 12.4 GB</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={allSpeedData.length > 0 ? allSpeedData : Array(60).fill(0).map((_, i) => ({ time: i, total: Math.random() * 20 }))}>
                  <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0A84FF" stopOpacity={0.15} /><stop offset="100%" stopColor="#0A84FF" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis tick={{ fontSize: 10, fill: '#5A5A63' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '6px', fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                  <Area type="monotone" dataKey="total" stroke="#0A84FF" strokeWidth={1.5} fill="url(#sg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download List - Full width */}
      <div className="px-6 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <DownloadIcon size={64} className="text-text-tertiary mx-auto animate-float" />
            <p className="text-text-secondary mt-4 text-lg">No downloads yet</p>
            <p className="text-text-tertiary text-sm mt-1">Paste a URL to start downloading</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {filtered.map(d => <GridCard key={d.id} d={d} selected={selectedIds.includes(d.id)} toggleSelect={toggleSelect} onPause={pauseDownload} onResume={resumeDownload} onCancel={cancelDownload} onRetry={retryDownload} onRemove={removeDownload} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map(d => (
              viewMode === 'compact'
                ? <CompactRow key={d.id} d={d} selected={selectedIds.includes(d.id)} toggleSelect={toggleSelect} onPause={pauseDownload} onResume={resumeDownload} onCancel={cancelDownload} onRetry={retryDownload} onRemove={removeDownload} />
                : <DetailedRow key={d.id} d={d} selected={selectedIds.includes(d.id)} toggleSelect={toggleSelect} onPause={pauseDownload} onResume={resumeDownload} onCancel={cancelDownload} onRetry={retryDownload} onRemove={removeDownload} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== COMPACT ROW - Single line with thin inline progress ===== */
function CompactRow({ d, selected, toggleSelect, onPause, onResume, onRetry, onRemove }: any) {
  const sc = statusConfig[d.status] || statusConfig.queued;
  const speedDisplay = d.speed < 1 ? `${(d.speed * 1024).toFixed(0)} KB/s` : `${d.speed.toFixed(1)} MB/s`;
  const showInFolder = () => {
    if (window.electronAPI?.showInFolder) {
      window.electronAPI.showInFolder(`/opt/kelex-downloads/${d.filename}`);
    }
  };
  return (
    <div className="bg-bg-secondary hover:bg-bg-tertiary rounded-lg px-4 py-2.5 transition-all border border-transparent hover:border-border-subtle">
      {/* Top row: Icon + Filename + Status */}
      <div className="flex items-center gap-2.5">
        <input type="checkbox" checked={selected} onChange={() => toggleSelect(d.id)} />
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: sc.bg }}>
          <FileIcon type={d.type} color={sc.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary truncate font-medium">{d.filename}</p>
        </div>
        {/* Thin inline progress bar - right side */}
        <div className="w-24 shrink-0">
          <div className="h-[2px] rounded-full bg-border-subtle overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${d.progress}%`, backgroundColor: sc.color }} />
          </div>
        </div>
        <span className="font-mono text-[10px] text-text-tertiary shrink-0 w-8 text-right">{d.progress}%</span>
        {d.speed > 0 ? (
          <span className="font-mono text-[11px] text-accent-cyan shrink-0 w-16 text-right">{speedDisplay}</span>
        ) : (
          <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          {d.status === 'completed' && window.electronAPI && (
            <button onClick={showInFolder} className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent-blue" title="Show in folder"><FolderOpen size={13} /></button>
          )}
          {d.status === 'downloading' && <button onClick={() => onPause(d.id)} className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary" title="Pause"><Pause size={13} /></button>}
          {d.status === 'paused' && <button onClick={() => onResume(d.id)} className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent-cyan" title="Resume"><Play size={13} /></button>}
          {d.status === 'error' && <button onClick={() => onRetry(d.id)} className="p-1 rounded hover:bg-bg-hover text-accent-amber" title="Retry"><RotateCw size={13} /></button>}
          <button onClick={() => onRemove(d.id)} className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent-red" title="Remove"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

/* ===== DETAILED ROW ===== */
function DetailedRow({ d, selected, toggleSelect, onPause, onResume, onRetry, onRemove }: any) {
  const sc = statusConfig[d.status] || statusConfig.queued;
  const speedDisplay = d.speed < 1 ? `${(d.speed * 1024).toFixed(0)} KB/s` : `${d.speed.toFixed(1)} MB/s`;
  const showInFolder = () => {
    if (window.electronAPI?.showInFolder) {
      window.electronAPI.showInFolder(`/opt/kelex-downloads/${d.filename}`);
    }
  };
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg px-4 py-3 hover:border-border-default hover:bg-bg-tertiary transition-all">
      <div className="flex items-center gap-2.5">
        <input type="checkbox" checked={selected} onChange={() => toggleSelect(d.id)} />
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: sc.bg }}>
          <FileIcon type={d.type} color={sc.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{d.filename}</p>
          <p className="text-[10px] text-text-tertiary font-mono">{d.url}</p>
        </div>
        <div className="w-24 shrink-0">
          <div className="h-[2px] rounded-full bg-border-subtle overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${d.progress}%`, backgroundColor: sc.color }} />
          </div>
        </div>
        <span className="font-mono text-[10px] text-text-tertiary shrink-0 w-8 text-right">{d.progress}%</span>
        {d.speed > 0 ? (
          <span className="font-mono text-[11px] text-accent-cyan shrink-0 w-16 text-right">{speedDisplay}</span>
        ) : (
          <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          {d.status === 'completed' && window.electronAPI && (
            <button onClick={showInFolder} className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent-blue" title="Show in folder"><FolderOpen size={13} /></button>
          )}
          {d.status === 'downloading' && <button onClick={() => onPause(d.id)} className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary" title="Pause"><Pause size={13} /></button>}
          {d.status === 'paused' && <button onClick={() => onResume(d.id)} className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent-cyan" title="Resume"><Play size={13} /></button>}
          {d.status === 'error' && <button onClick={() => onRetry(d.id)} className="p-1 rounded hover:bg-bg-hover text-accent-amber" title="Retry"><RotateCw size={13} /></button>}
          <button onClick={() => onRemove(d.id)} className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent-red" title="Remove"><Trash2 size={13} /></button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 pl-[38px]">
        <div className="flex-1 h-1 rounded-full bg-border-subtle overflow-hidden flex gap-px">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-sm transition-colors"
              style={{ backgroundColor: i < Math.ceil(d.progress / 5) ? sc.color : 'var(--border-subtle)' }} />
          ))}
        </div>
        <span className="text-[10px] text-text-tertiary font-mono shrink-0">{d.connections}c</span>
        <span className="text-[10px] text-text-tertiary font-mono shrink-0">{d.eta}</span>
      </div>
    </div>
  );
}

/* ===== GRID CARD ===== */
function GridCard({ d, selected, toggleSelect, onPause, onResume, onRetry, onRemove }: any) {
  const sc = statusConfig[d.status] || statusConfig.queued;
  const speedDisplay = d.speed < 1 ? `${(d.speed * 1024).toFixed(0)} KB/s` : `${d.speed.toFixed(1)} MB/s`;
  const showInFolder = () => {
    if (window.electronAPI?.showInFolder) {
      window.electronAPI.showInFolder(`/opt/kelex-downloads/${d.filename}`);
    }
  };
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-bg-secondary border border-border-subtle rounded-lg p-5 hover:-translate-y-0.5 transition-all hover:glow-blue hover:border-accent-blue/20">
      <div className="flex items-center gap-3 mb-4">
        <input type="checkbox" checked={selected} onChange={() => toggleSelect(d.id)} />
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: sc.bg }}>
          <FileIcon type={d.type} color={sc.color} />
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
      </div>
      <p className="text-sm font-medium text-text-primary truncate mb-1" title={d.filename}>{d.filename}</p>
      <p className="text-[10px] text-text-tertiary font-mono mb-3">{formatBytes(d.size)}</p>
      <div className="h-2 rounded-full bg-border-subtle overflow-hidden mb-2">
        <div className="h-full rounded-full transition-all duration-300 relative" style={{ width: `${d.progress}%`, backgroundColor: sc.color }}>
          {d.status === 'downloading' && <div className="absolute inset-0 shimmer-bg rounded-full" />}
        </div>
      </div>
      <div className="flex justify-between items-center text-xs mb-3">
        <span className="font-mono text-text-tertiary">{d.progress}%</span>
        {d.speed > 0 && <span className="font-mono text-accent-cyan">{speedDisplay}</span>}
        {d.speed === 0 && <span className="font-mono text-[10px] text-text-tertiary">{d.eta}</span>}
      </div>
      <div className="flex gap-1 justify-end pt-2 border-t border-border-subtle">
        {d.status === 'completed' && window.electronAPI && (
          <button onClick={showInFolder} className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-accent-blue" title="Show in folder"><FolderOpen size={14} /></button>
        )}
        {d.status === 'downloading' && <button onClick={() => onPause(d.id)} className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary" title="Pause"><Pause size={14} /></button>}
        {d.status === 'paused' && <button onClick={() => onResume(d.id)} className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-accent-cyan" title="Resume"><Play size={14} /></button>}
        {d.status === 'error' && <button onClick={() => onRetry(d.id)} className="p-1.5 rounded hover:bg-bg-hover text-accent-amber" title="Retry"><RotateCw size={14} /></button>}
        <button onClick={() => onRemove(d.id)} className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-accent-red" title="Remove"><Trash2 size={14} /></button>
      </div>
    </motion.div>
  );
}

function FileIcon({ type, color }: { type: string; color: string }) {
  const icons: Record<string, any> = { http: DownloadIcon, youtube: PlaySquare, torrent: Filter, magnet: Filter, convert: AudioLines };
  const Icon = icons[type] || DownloadIcon;
  return <Icon size={16} style={{ color }} />;
}
