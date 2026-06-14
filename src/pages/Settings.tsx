import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Download, Gauge, Shield, PlaySquare, Keyboard,
  FolderOpen, AlertTriangle, RotateCcw,
  ChevronRight, HardDrive, Film, Music, FileText, Archive,
  Code, Image, Sparkles
} from 'lucide-react';
import { useDownloads } from '@/context/DownloadContext';

const categories = [
  { id: 'general', label: 'General', icon: Palette },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'bandwidth', label: 'Bandwidth', icon: Gauge },
  { id: 'network', label: 'Network & Privacy', icon: Shield },
  { id: 'youtube', label: 'YouTube', icon: PlaySquare },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
];

const accentColors = [
  { name: 'Red', value: '#FF3B30' },
  { name: 'Amber', value: '#FF9500' },
  { name: 'Orange', value: '#FF6B35' },
  { name: 'Blue', value: '#0A84FF' },
  { name: 'Green', value: '#32D74B' },
  { name: 'Violet', value: '#AF52DE' },
];

const defaultShortcuts = [
  { action: 'New download', key: 'Ctrl+N' },
  { action: 'Paste URL', key: 'Ctrl+V' },
  { action: 'Pause / Resume', key: 'Space' },
  { action: 'Cancel selected', key: 'Delete' },
  { action: 'Select all', key: 'Ctrl+A' },
  { action: 'Focus search', key: 'Ctrl+F' },
  { action: 'Open settings', key: 'Ctrl+,' },
  { action: 'Toggle theme', key: 'Ctrl+Shift+T' },
  { action: 'Toggle Tor', key: 'Ctrl+Shift+R' },
  { action: 'Focus URL bar', key: 'Ctrl+L' },
  { action: 'Downloads page', key: 'Ctrl+1' },
  { action: 'YouTube page', key: 'Ctrl+2' },
  { action: 'Torrents page', key: 'Ctrl+3' },
  { action: 'Converter page', key: 'Ctrl+4' },
  { action: 'Extension page', key: 'Ctrl+5' },
  { action: 'Settings page', key: 'Ctrl+6' },
];

/* ===== COMPONENTS ===== */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${checked ? 'bg-accent-blue' : 'bg-white/[0.08]'}`}>
      <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.03] last:border-0">
      <div className="min-w-0 pr-4">
        <p className="text-[13px] text-white/85">{label}</p>
        {desc && <p className="text-[11px] text-white/30 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="font-mono text-[10px] text-white/25 tracking-[0.12em] uppercase mb-4 relative">
      <span className="relative z-10">{label}</span>
      <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-accent-blue/20 via-transparent to-transparent" />
    </p>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs outline-none text-white/70 focus:border-accent-blue/30 cursor-pointer">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} min={min} max={max} step={step}
        className="w-14 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs font-mono text-center outline-none focus:border-accent-blue/30 text-white/70" />
      {suffix && <span className="text-[10px] text-white/30">{suffix}</span>}
    </div>
  );
}

/* ===== MAIN ===== */

export default function Settings() {
  const { accentColor, setAccentColor, torEnabled, toggleTor: toggleTorFromContext, theme, setTheme } = useDownloads();
  const [activeCategory, setActiveCategory] = useState('general');

  // General
  const [fontSize, setFontSize] = useState<'Small' | 'Medium' | 'Large'>('Medium');
  const [animations, setAnimations] = useState(true);
  const [downloadFolder, setDownloadFolder] = useState('/home/user/Downloads/Kelex');
  const [afterDownload, setAfterDownload] = useState<'Nothing' | 'Show in folder' | 'Play file'>('Show in folder');
  const [language, setLanguage] = useState('English');

  // Downloads
  const [autoStart, setAutoStart] = useState(true);
  const [autoRetry, setAutoRetry] = useState(true);
  const [maxRetries, setMaxRetries] = useState(5);
  const [clipboardMonitor, setClipboardMonitor] = useState(true);
  const [keepHistory, setKeepHistory] = useState(true);
  const [historyDays, setHistoryDays] = useState(30);
  const [showCompleteDialog, setShowCompleteDialog] = useState(true);
  const [startNextOnFinish, setStartNextOnFinish] = useState(true);
  const [categoriesEnabled, setCategoriesEnabled] = useState(true);
  const [autoRemoveDeleted, setAutoRemoveDeleted] = useState(false);
  const [duplicatesCheck, setDuplicatesCheck] = useState(true);
  const [fileTypes, setFileTypes] = useState({
    video: true, audio: true, archive: true, document: true,
    image: true, program: true,
  });

  // Bandwidth
  const [speedLimitEnabled, setSpeedLimitEnabled] = useState(false);
  const [downloadSpeed, setDownloadSpeed] = useState(10);
  const [maxConcurrent, setMaxConcurrent] = useState(5);
  const [maxConnections, setMaxConnections] = useState(8);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleGrid, setScheduleGrid] = useState<boolean[][]>(() =>
    Array.from({ length: 7 }, () => Array.from({ length: 6 }, () => false))
  );

  // Network
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyType, setProxyType] = useState('HTTP');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState('');
  const [proxyAuth, setProxyAuth] = useState(false);
  const [proxyUser, setProxyUser] = useState('');
  const [proxyPass, setProxyPass] = useState('');
  const [userAgent, setUserAgent] = useState('Kelex/2.0');

  // YouTube
  const [ytDefaultQuality, setYtDefaultQuality] = useState('Best Available');
  const [ytDefaultFormat, setYtDefaultFormat] = useState('MP4');
  const [ytAudioFormat, setYtAudioFormat] = useState('MP3');
  const [ytAudioBitrate, setYtAudioBitrate] = useState(320);
  const [ytSubtitles, setYtSubtitles] = useState(false);
  const [ytPlaylist, setYtPlaylist] = useState(true);
  const [ytThumbnail, setYtThumbnail] = useState(true);
  const [ytMetadata, setYtMetadata] = useState(true);

  // Shortcuts
  const [shortcuts, setShortcuts] = useState(defaultShortcuts.map(s => ({ ...s })));
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [tempKey, setTempKey] = useState('');

  // Reset modal
  const [showReset, setShowReset] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kelex-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
        if (parsed.animations !== undefined) setAnimations(parsed.animations);
        if (parsed.downloadFolder) setDownloadFolder(parsed.downloadFolder);
        if (parsed.afterDownload) setAfterDownload(parsed.afterDownload);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.autoStart !== undefined) setAutoStart(parsed.autoStart);
        if (parsed.autoRetry !== undefined) setAutoRetry(parsed.autoRetry);
        if (parsed.maxRetries) setMaxRetries(parsed.maxRetries);
        if (parsed.clipboardMonitor !== undefined) setClipboardMonitor(parsed.clipboardMonitor);
        if (parsed.keepHistory !== undefined) setKeepHistory(parsed.keepHistory);
        if (parsed.historyDays) setHistoryDays(parsed.historyDays);
        if (parsed.showCompleteDialog !== undefined) setShowCompleteDialog(parsed.showCompleteDialog);
        if (parsed.startNextOnFinish !== undefined) setStartNextOnFinish(parsed.startNextOnFinish);
        if (parsed.categoriesEnabled !== undefined) setCategoriesEnabled(parsed.categoriesEnabled);
        if (parsed.autoRemoveDeleted !== undefined) setAutoRemoveDeleted(parsed.autoRemoveDeleted);
        if (parsed.duplicatesCheck !== undefined) setDuplicatesCheck(parsed.duplicatesCheck);
        if (parsed.fileTypes) setFileTypes(parsed.fileTypes);
        if (parsed.speedLimitEnabled !== undefined) setSpeedLimitEnabled(parsed.speedLimitEnabled);
        if (parsed.downloadSpeed) setDownloadSpeed(parsed.downloadSpeed);
        if (parsed.maxConcurrent) setMaxConcurrent(parsed.maxConcurrent);
        if (parsed.maxConnections) setMaxConnections(parsed.maxConnections);
        if (parsed.proxyEnabled !== undefined) setProxyEnabled(parsed.proxyEnabled);
        if (parsed.proxyType) setProxyType(parsed.proxyType);
        if (parsed.proxyHost) setProxyHost(parsed.proxyHost);
        if (parsed.proxyPort) setProxyPort(parsed.proxyPort);
        if (parsed.proxyAuth !== undefined) setProxyAuth(parsed.proxyAuth);
        if (parsed.proxyUser) setProxyUser(parsed.proxyUser);
        if (parsed.userAgent) setUserAgent(parsed.userAgent);
        if (parsed.ytDefaultQuality) setYtDefaultQuality(parsed.ytDefaultQuality);
        if (parsed.ytDefaultFormat) setYtDefaultFormat(parsed.ytDefaultFormat);
        if (parsed.ytAudioFormat) setYtAudioFormat(parsed.ytAudioFormat);
        if (parsed.ytAudioBitrate) setYtAudioBitrate(parsed.ytAudioBitrate);
        if (parsed.ytSubtitles !== undefined) setYtSubtitles(parsed.ytSubtitles);
        if (parsed.ytPlaylist !== undefined) setYtPlaylist(parsed.ytPlaylist);
        if (parsed.ytThumbnail !== undefined) setYtThumbnail(parsed.ytThumbnail);
        if (parsed.ytMetadata !== undefined) setYtMetadata(parsed.ytMetadata);
        if (parsed.shortcuts) setShortcuts(parsed.shortcuts);
      }
    } catch { /* ignore parse errors */ }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
      fontSize, animations, downloadFolder, afterDownload, language,
      autoStart, autoRetry, maxRetries, clipboardMonitor, keepHistory, historyDays,
      showCompleteDialog, startNextOnFinish, categoriesEnabled, autoRemoveDeleted, duplicatesCheck, fileTypes,
      speedLimitEnabled, downloadSpeed, maxConcurrent, maxConnections,
      proxyEnabled, proxyType, proxyHost, proxyPort, proxyAuth, proxyUser, userAgent,
      ytDefaultQuality, ytDefaultFormat, ytAudioFormat, ytAudioBitrate, ytSubtitles, ytPlaylist, ytThumbnail, ytMetadata,
      shortcuts,
    };
    localStorage.setItem('kelex-settings', JSON.stringify(settings));
  }, [
    fontSize, animations, downloadFolder, afterDownload, language,
    autoStart, autoRetry, maxRetries, clipboardMonitor, keepHistory, historyDays,
    showCompleteDialog, startNextOnFinish, categoriesEnabled, autoRemoveDeleted, duplicatesCheck, fileTypes,
    speedLimitEnabled, downloadSpeed, maxConcurrent, maxConnections,
    proxyEnabled, proxyType, proxyHost, proxyPort, proxyAuth, proxyUser, userAgent,
    ytDefaultQuality, ytDefaultFormat, ytAudioFormat, ytAudioBitrate, ytSubtitles, ytPlaylist, ytThumbnail, ytMetadata,
    shortcuts,
  ]);

  const handleScheduleToggle = (d: number, b: number) => setScheduleGrid(p => { const n = p.map(r => [...r]); n[d][b] = !n[d][b]; return n; });

  const handleKeyCapture = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    const keys: string[] = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');
    if (e.metaKey) keys.push('Meta');
    if (e.key && !['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    }
    if (keys.length > 0) setTempKey(keys.join('+'));
  }, []);

  useEffect(() => {
    if (editingIdx !== null) {
      window.addEventListener('keydown', handleKeyCapture);
      return () => window.removeEventListener('keydown', handleKeyCapture);
    }
  }, [editingIdx, handleKeyCapture]);

  const saveShortcut = () => { if (editingIdx !== null && tempKey) setShortcuts(p => p.map((s, i) => i === editingIdx ? { ...s, key: tempKey } : s)); setEditingIdx(null); };
  const cancelShortcut = () => { setEditingIdx(null); setTempKey(''); };
  const resetShortcuts = () => { setShortcuts(defaultShortcuts.map(s => ({ ...s }))); };

  const resetAll = () => {
    setAutoStart(true); setAutoRetry(true); setMaxRetries(5); setClipboardMonitor(true);
    setKeepHistory(true); setHistoryDays(30); setShowCompleteDialog(true); setStartNextOnFinish(true);
    setCategoriesEnabled(true); setAutoRemoveDeleted(false); setDuplicatesCheck(true);
    setSpeedLimitEnabled(false); setDownloadSpeed(10); setMaxConcurrent(5); setMaxConnections(8);
    setScheduleEnabled(false); setProxyEnabled(false); setProxyAuth(false);
    setYtDefaultQuality('Best Available'); setYtDefaultFormat('MP4'); setYtAudioFormat('MP3');
    setYtAudioBitrate(320); setYtSubtitles(false); setYtPlaylist(true); setYtThumbnail(true);
    setYtMetadata(true); setFontSize('Medium'); setAnimations(true);
    setAfterDownload('Show in folder'); setDownloadFolder('/home/user/Downloads/Kelex');
    setUserAgent('Kelex/2.0'); setLanguage('English'); setTheme('dark'); setAccentColor('#0A84FF');
    setShortcuts(defaultShortcuts.map(s => ({ ...s }))); setShowReset(false);
  };

  const exportSettings = () => {
    const data = { theme, accentColor, fontSize, animations, downloadFolder, afterDownload, language, autoStart, autoRetry, maxRetries, clipboardMonitor, keepHistory, historyDays, showCompleteDialog, startNextOnFinish, categoriesEnabled, autoRemoveDeleted, duplicatesCheck, fileTypes, speedLimitEnabled, downloadSpeed, maxConcurrent, maxConnections, scheduleEnabled, proxyEnabled, proxyType, proxyHost, proxyPort, proxyAuth, userAgent, ytDefaultQuality, ytDefaultFormat, ytAudioFormat, ytAudioBitrate, ytSubtitles, ytPlaylist, ytThumbnail, ytMetadata, shortcuts, torEnabled };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'kelex-settings.json'; a.click(); URL.revokeObjectURL(url);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importSettings = (e: React.ChangeEvent<HTMLInputElement> | any) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { try { const d = JSON.parse(ev.target?.result as string); if (d.accentColor) setAccentColor(d.accentColor); if (d.theme) setTheme(d.theme); if (d.fontSize) setFontSize(d.fontSize); } catch { alert('Invalid settings file'); } };
    reader.readAsText(file); e.target.value = '';
  };

  /* ===== RENDER ===== */

  const renderContent = () => {
    switch (activeCategory) {
      case 'general':
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-1"><Palette size={18} className="text-accent-blue" /><h2 className="font-display font-semibold text-lg text-white/90">General</h2></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(10,132,255,0.06)]">
                <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="relative p-5">
                  <SectionHeader label="Theme" />
                  <div className="flex gap-3">
                    {[
                      { name: 'Pitch Black', bg: '#050505', card: '#0A0A0A', val: 'dark' },
                      { name: 'Dark', bg: '#0f0f13', card: '#1a1a22', val: 'dark' },
                      { name: 'Light', bg: '#F5F5F7', card: '#FFFFFF', val: 'light' },
                    ].map(t => (
                      <button key={t.name} onClick={() => setTheme(t.val as 'dark' | 'light')}
                        className={`flex-1 rounded-lg border p-3 text-left transition-all ${theme === t.val && (t.name !== 'Light' || theme === 'light') ? 'border-accent-blue/50 ring-1 ring-accent-blue/20' : 'border-white/[0.04] hover:border-white/[0.08]'}`}>
                        <div className="h-14 rounded-md mb-2 border border-white/[0.04]" style={{ background: `linear-gradient(135deg, ${t.bg} 50%, ${t.card} 50%)` }} />
                        <p className="text-xs text-white/70">{t.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
                <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="relative p-5">
                  <SectionHeader label="Accent Color" />
                  <div className="flex gap-2.5">
                    {accentColors.map(c => (
                      <button key={c.value} onClick={() => setAccentColor(c.value)}
                        className={`w-8 h-8 rounded-full transition-all duration-200 hover:scale-110 ${accentColor === c.value ? 'ring-2 ring-white/70 scale-110' : 'opacity-50 hover:opacity-100'}`}
                        style={{ backgroundColor: c.value }} title={c.name} />
                    ))}
                  </div>
                  <div className="mt-4 space-y-3">
                    <SettingRow label="Font size"><Select value={fontSize} onChange={(v: string) => setFontSize(v as typeof fontSize)} options={['Small', 'Medium', 'Large']} /></SettingRow>
                    <SettingRow label="Animations" desc="UI transitions"><Toggle checked={animations} onChange={setAnimations} /></SettingRow>
                  </div>
                </div>
              </div>
            </div>
            <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="relative p-5">
                <SectionHeader label="Download Folder" />
                <div className="flex gap-2">
                  <input type="text" value={downloadFolder} onChange={e => setDownloadFolder(e.target.value)} className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs font-mono text-white/60 outline-none focus:border-accent-blue/30" />
                  <button className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/80 transition-colors"><FolderOpen size={15} /></button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
                <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="relative p-5">
                  <SectionHeader label="After Download" />
                  <SettingRow label="Action on complete">
                    <Select value={afterDownload} onChange={(v: string) => setAfterDownload(v as typeof afterDownload)} options={['Nothing', 'Show in folder', 'Play file']} />
                  </SettingRow>
                </div>
              </div>
              <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
                <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="relative p-5">
                  <SectionHeader label="Language" />
                  <Select value={language} onChange={setLanguage} options={['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Russian']} />
                </div>
              </div>
            </div>
          </div>
        );

      case 'downloads':
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-1"><Download size={18} className="text-accent-blue" /><h2 className="font-display font-semibold text-lg text-white/90">Downloads</h2></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
                <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="relative p-5">
                  <SectionHeader label="Behavior" />
                  <div className="space-y-1.5">
                    <SettingRow label="Auto-start downloads" desc="Begin immediately when added"><Toggle checked={autoStart} onChange={setAutoStart} /></SettingRow>
                    <SettingRow label="Auto-retry failed" desc="Retry on connection failure"><Toggle checked={autoRetry} onChange={setAutoRetry} /></SettingRow>
                    <SettingRow label="Max retry attempts"><NumberInput value={maxRetries} onChange={setMaxRetries} min={1} max={20} /></SettingRow>
                    <SettingRow label="Start next when one finishes"><Toggle checked={startNextOnFinish} onChange={setStartNextOnFinish} /></SettingRow>
                    <SettingRow label="Show completion dialog"><Toggle checked={showCompleteDialog} onChange={setShowCompleteDialog} /></SettingRow>
                  </div>
                </div>
              </div>
              <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
                <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="relative p-5">
                  <SectionHeader label="Monitoring" />
                  <div className="space-y-1.5">
                    <SettingRow label="Clipboard monitoring" desc="Auto-detect copied URLs"><Toggle checked={clipboardMonitor} onChange={setClipboardMonitor} /></SettingRow>
                    <SettingRow label="Duplicate check" desc="Warn if URL already queued"><Toggle checked={duplicatesCheck} onChange={setDuplicatesCheck} /></SettingRow>
                    <SettingRow label="Keep history"><Toggle checked={keepHistory} onChange={setKeepHistory} /></SettingRow>
                    <SettingRow label="History retention (days)"><NumberInput value={historyDays} onChange={setHistoryDays} min={1} max={365} /></SettingRow>
                    <SettingRow label="Auto-remove deleted files"><Toggle checked={autoRemoveDeleted} onChange={setAutoRemoveDeleted} /></SettingRow>
                  </div>
                </div>
              </div>
            </div>
            <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="relative p-5">
                <SectionHeader label="File Types to Capture" />
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'video', label: 'Videos', icon: Film, ext: 'mp4, mkv, avi, mov, webm' },
                    { key: 'audio', label: 'Audio', icon: Music, ext: 'mp3, flac, wav, aac, m4a, ogg' },
                    { key: 'archive', label: 'Archives', icon: Archive, ext: 'zip, rar, 7z, tar, gz' },
                    { key: 'document', label: 'Documents', icon: FileText, ext: 'pdf, doc, docx, txt, epub' },
                    { key: 'image', label: 'Images', icon: Image, ext: 'jpg, png, gif, svg, webp' },
                    { key: 'program', label: 'Programs', icon: Code, ext: 'exe, dmg, apk, deb, pkg' },
                  ].map(t => (
                    <label key={t.key} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${fileTypes[t.key as keyof typeof fileTypes] ? 'border-accent-blue/20 bg-accent-blue/[0.03]' : 'border-white/[0.03] bg-white/[0.01]'}`}>
                      <input type="checkbox" checked={fileTypes[t.key as keyof typeof fileTypes]} onChange={e => setFileTypes(p => ({ ...p, [t.key]: e.target.checked }))} className="shrink-0" />
                      <t.icon size={15} className="text-white/30 shrink-0" />
                      <div>
                        <p className="text-xs text-white/70">{t.label}</p>
                        <p className="text-[9px] text-white/20 font-mono">{t.ext}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="relative p-5">
                <SectionHeader label="Download Categories" />
                <SettingRow label="Organize downloads by category" desc="Auto-sort into folders"><Toggle checked={categoriesEnabled} onChange={setCategoriesEnabled} /></SettingRow>
                {categoriesEnabled && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {['Videos', 'Audio', 'Documents', 'Archives', 'Programs', 'Images'].map(cat => (
                      <div key={cat} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                        <HardDrive size={12} className="text-white/20" />
                        <span className="text-[11px] text-white/50">{cat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'bandwidth':
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-1"><Gauge size={18} className="text-accent-blue" /><h2 className="font-display font-semibold text-lg text-white/90">Bandwidth</h2></div>
            <div className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(10,132,255,0.06)]">
              <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="relative p-5">
                <SectionHeader label="Speed Limiter" />
                <SettingRow label="Enable speed limit" desc="Cap global download speed"><Toggle checked={speedLimitEnabled} onChange={setSpeedLimitEnabled} /></SettingRow>
                {speedLimitEnabled && (
                  <div className="mt-4 pl-3 border-l border-accent-blue/15 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-xs text-white/40">Download limit</span><span className="font-mono text-xs text-white/60">{downloadSpeed} MB/s</span></div>
                      <input type="range" min={1} max={100} value={downloadSpeed} onChange={e => setDownloadSpeed(Number(e.target.value))} className="w-full accent-accent-blue h-1 bg-white/[0.06] rounded-full appearance-none cursor-pointer" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
                <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="relative p-5">
                  <SectionHeader label="Connections" />
                  <div className="space-y-3">
                    <SettingRow label="Max concurrent downloads"><NumberInput value={maxConcurrent} onChange={setMaxConcurrent} min={1} max={20} /></SettingRow>
                    <SettingRow label="Max connections per file"><NumberInput value={maxConnections} onChange={setMaxConnections} min={1} max={32} /></SettingRow>
                  </div>
                </div>
              </div>
              <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
                <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="relative p-5">
                  <SectionHeader label="Download Schedule" />
                  <SettingRow label="Enable scheduling" desc="Limit speed by time"><Toggle checked={scheduleEnabled} onChange={setScheduleEnabled} /></SettingRow>
                  {scheduleEnabled && (
                    <div className="mt-3">
                      <div className="grid grid-cols-7 gap-1">
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, dIdx) => (
                          <div key={day} className="text-center">
                            <p className="text-[9px] text-white/20 mb-1 font-mono">{day}</p>
                            {['00-04','04-08','08-12','12-16','16-20','20-24'].map((block, bIdx) => (
                              <button key={block} onClick={() => handleScheduleToggle(dIdx, bIdx)} title={`${day} ${block}`}
                                className={`w-full h-5 rounded-sm mb-0.5 text-[7px] font-mono transition-colors ${scheduleGrid[dIdx][bIdx] ? 'bg-accent-blue/30 hover:bg-accent-blue/50' : 'bg-white/[0.02] hover:bg-white/[0.05]'}`}>{block}</button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'network':
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-1"><Shield size={18} className="text-accent-blue" /><h2 className="font-display font-semibold text-lg text-white/90">Network & Privacy</h2></div>
            <div className={`group relative rounded-xl overflow-hidden transition-all duration-300 ${torEnabled ? '!border-violet-500/15' : ''} hover:shadow-[0_0_30px_rgba(10,132,255,0.06)]`}>
              <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="relative p-5">
                <SectionHeader label="Tor Network" />
                <SettingRow label="Route downloads through Tor" desc="Anonymous download routing"><Toggle checked={torEnabled} onChange={toggleTorFromContext} /></SettingRow>
                {torEnabled && (
                  <div className="mt-3 pl-3 border-l border-violet-500/15 space-y-3">
                    <div className="flex items-center gap-2"><Shield size={13} className="text-violet-400" /><span className="text-xs font-medium text-violet-400">Tor Connected</span><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /></div>
                    <div className="bg-amber-500/[0.04] border border-amber-500/15 rounded-lg p-3 flex items-start gap-2"><AlertTriangle size={13} className="text-amber-400/70 shrink-0 mt-0.5" /><p className="text-xs text-amber-400/60">Tor may reduce download speeds. Use for privacy-sensitive downloads only.</p></div>
                  </div>
                )}
              </div>
            </div>
            <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="relative p-5">
                <SectionHeader label="Proxy" />
                <SettingRow label="Use proxy server" desc="Route connections through proxy"><Toggle checked={proxyEnabled} onChange={setProxyEnabled} /></SettingRow>
                {proxyEnabled && (
                  <div className="mt-3 space-y-3 pl-3 border-l border-white/[0.04]">
                    <div className="flex gap-2">
                      <Select value={proxyType} onChange={setProxyType} options={['HTTP', 'HTTPS', 'SOCKS5', 'SOCKS4']} />
                      <input type="text" placeholder="Host" value={proxyHost} onChange={e => setProxyHost(e.target.value)} className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs outline-none text-white/60 focus:border-accent-blue/30" />
                      <input type="text" placeholder="Port" value={proxyPort} onChange={e => setProxyPort(e.target.value)} className="w-16 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs outline-none text-white/60 focus:border-accent-blue/30 font-mono" />
                    </div>
                    <SettingRow label="Authentication"><Toggle checked={proxyAuth} onChange={setProxyAuth} /></SettingRow>
                    {proxyAuth && <div className="flex gap-2"><input type="text" placeholder="Username" value={proxyUser} onChange={e => setProxyUser(e.target.value)} className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs outline-none text-white/60 focus:border-accent-blue/30" /><input type="password" placeholder="Password" value={proxyPass} onChange={e => setProxyPass(e.target.value)} className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs outline-none text-white/60 focus:border-accent-blue/30" /></div>}
                  </div>
                )}
              </div>
            </div>
            <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="relative p-5">
                <SectionHeader label="User Agent" />
                <div className="flex gap-2">
                  <input type="text" value={userAgent} onChange={e => setUserAgent(e.target.value)} className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-xs outline-none text-white/60 focus:border-accent-blue/30 font-mono" />
                  <button className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/80 transition-colors text-xs">Reset</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'youtube':
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-1"><PlaySquare size={18} className="text-accent-red" /><h2 className="font-display font-semibold text-lg text-white/90">YouTube</h2></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
                <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="relative p-5">
                  <SectionHeader label="Video Defaults" />
                  <div className="space-y-3">
                    <SettingRow label="Default quality"><Select value={ytDefaultQuality} onChange={setYtDefaultQuality} options={['Best Available', '4K', '1080p', '720p', '480p', '360p']} /></SettingRow>
                    <SettingRow label="Default format"><Select value={ytDefaultFormat} onChange={setYtDefaultFormat} options={['MP4', 'WEBM', 'MKV']} /></SettingRow>
                  </div>
                </div>
              </div>
              <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
                <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                <div className="relative p-5">
                  <SectionHeader label="Audio Defaults" />
                  <div className="space-y-3">
                    <SettingRow label="Audio format"><Select value={ytAudioFormat} onChange={setYtAudioFormat} options={['MP3', 'FLAC', 'AAC', 'WAV', 'M4A']} /></SettingRow>
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between"><span className="text-xs text-white/40">Bitrate</span><span className="font-mono text-xs text-white/60">{ytAudioBitrate} kbps</span></div>
                      <input type="range" min={64} max={320} step={32} value={ytAudioBitrate} onChange={e => setYtAudioBitrate(Number(e.target.value))} className="w-full accent-accent-blue h-1 bg-white/[0.06] rounded-full appearance-none cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="relative p-5">
                <SectionHeader label="Download Options" />
                <div className="grid grid-cols-3 gap-3">
                  <SettingRow label="Download subtitles" desc="Include .srt file"><Toggle checked={ytSubtitles} onChange={setYtSubtitles} /></SettingRow>
                  <SettingRow label="Download playlists" desc="All videos in playlist"><Toggle checked={ytPlaylist} onChange={setYtPlaylist} /></SettingRow>
                  <SettingRow label="Embed thumbnail" desc="As cover art"><Toggle checked={ytThumbnail} onChange={setYtThumbnail} /></SettingRow>
                  <SettingRow label="Embed metadata" desc="Title, artist, album"><Toggle checked={ytMetadata} onChange={setYtMetadata} /></SettingRow>
                </div>
              </div>
            </div>
          </div>
        );

      case 'shortcuts':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3"><Keyboard size={18} className="text-accent-blue" /><h2 className="font-display font-semibold text-lg text-white/90">Keyboard Shortcuts</h2></div>
              <button onClick={resetShortcuts} className="text-xs bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/80 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"><RotateCcw size={11} /> Reset</button>
            </div>
            <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="relative p-5">
                <div className="space-y-0.5">
                  {shortcuts.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.02] last:border-0">
                      <span className="text-[13px] text-white/70">{s.action}</span>
                      <div className="flex items-center gap-2">
                        {editingIdx === i ? (
                          <div className="flex items-center gap-2">
                            <input type="text" value={tempKey} readOnly placeholder="Press keys..." className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg px-3 py-1 font-mono text-xs text-white/80 w-32 text-center animate-pulse outline-none" />
                            <button onClick={saveShortcut} className="text-[10px] bg-accent-blue text-white px-2.5 py-1 rounded-md">Save</button>
                            <button onClick={cancelShortcut} className="text-[10px] text-white/30 hover:text-white/60 px-1">Cancel</button>
                          </div>
                        ) : (
                          <><kbd className="bg-white/[0.04] border border-white/[0.06] rounded-md px-2.5 py-1 font-mono text-[11px] text-white/35">{s.key}</kbd><button onClick={() => { setEditingIdx(i); setTempKey(s.key); }} className="text-[10px] text-white/25 hover:text-accent-blue transition-colors px-1">Edit</button></>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-104px)] relative">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent-blue/[0.012] rounded-full blur-[120px] pointer-events-none" />

      {/* Left sidebar */}
      <aside className="w-[200px] shrink-0 py-6 px-3 relative">
        <div className="space-y-0.5">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 h-9 rounded-lg px-3 text-xs transition-all duration-200 group ${
                  isActive ? 'bg-white/[0.06] text-white shadow-[0_0_12px_rgba(10,132,255,0.05)]' : 'text-white/35 hover:text-white/70 hover:bg-white/[0.03]'
                }`}>
                <Icon size={15} className={`transition-colors ${isActive ? 'text-accent-blue' : 'text-white/25 group-hover:text-white/50'}`} />
                <span className="truncate">{cat.label}</span>
                {isActive && <ChevronRight size={12} className="ml-auto text-accent-blue/50" />}
              </button>
            );
          })}
        </div>

        <div className="absolute bottom-6 left-3 right-3">
          <div className="relative rounded-lg overflow-hidden p-3">
            <div className="absolute inset-0 bg-white/[0.02] rounded-lg border border-white/[0.03]" />
            <div className="relative flex items-center justify-between">
              <span className="text-[10px] text-white/20 font-mono">v2.0.0</span>
              <button onClick={exportSettings} className="text-[10px] text-white/25 hover:text-white/60 transition-colors flex items-center gap-1">
                <Sparkles size={10} /> Export
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Divider */}
      <div className="w-px shrink-0 bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 relative">
        <AnimatePresence mode="wait">
          <motion.div key={activeCategory} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {renderContent()}
          </motion.div>
        </AnimatePresence>
        <input ref={fileInputRef} type="file" accept=".json" onChange={importSettings} className="hidden" />
      </main>

      {/* Divider */}
      <div className="w-px shrink-0 bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />

      {/* Right sidebar */}
      <aside className="w-[200px] shrink-0 py-6 px-3 space-y-3 relative">
        <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
          <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div className="relative p-5">
            <SectionHeader label="Status" />
            <div className="space-y-2.5">
              {[
                { label: 'Active', value: '3', color: '#0A84FF' },
                { label: 'Completed', value: '12', color: '#32D74B' },
                { label: 'Queued', value: '2', color: '#FF9500' },
                { label: 'Failed', value: '1', color: '#FF3B30' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[11px] text-white/40">{s.label}</span>
                  <span className="font-mono text-[11px] font-medium" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
          <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div className="relative p-5">
            <SectionHeader label="Connection" />
            <div className="space-y-2">
              {[
                { label: 'Tor', value: torEnabled ? 'On' : 'Off', active: torEnabled, color: '#AF52DE' },
                { label: 'Proxy', value: proxyEnabled ? 'On' : 'Off', active: proxyEnabled, color: '#FF9500' },
                { label: 'Speed Limit', value: speedLimitEnabled ? 'On' : 'Off', active: speedLimitEnabled, color: '#0A84FF' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[11px] text-white/40">{s.label}</span>
                  <span className="font-mono text-[11px]" style={{ color: s.active ? s.color : '#5A5A63' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
          <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div className="relative p-5">
            <SectionHeader label="Preferences" />
            <div className="space-y-2">
              {[
                { label: 'Auto-start', value: autoStart ? 'On' : 'Off' },
                { label: 'Clipboard', value: clipboardMonitor ? 'On' : 'Off' },
                { label: 'History', value: keepHistory ? `${historyDays}d` : 'Off' },
                { label: 'Theme', value: theme === 'light' ? 'Light' : 'Dark' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[11px] text-white/40">{s.label}</span>
                  <span className="font-mono text-[11px] text-white/50">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="group relative rounded-xl overflow-hidden transition-all duration-300">
          <div className="absolute inset-0 bg-[#0a0a0a]/55 backdrop-blur-md rounded-xl border border-white/[0.04] group-hover:border-white/[0.07] transition-colors" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div className="relative p-5">
            <SectionHeader label="Accent" />
            <div className="flex gap-2">
              {accentColors.map(c => (
                <button key={c.value} onClick={() => setAccentColor(c.value)}
                  className={`w-6 h-6 rounded-full transition-all duration-200 ${accentColor === c.value ? 'scale-110' : 'opacity-40 hover:opacity-80 hover:scale-105'}`}
                  style={{ backgroundColor: c.value, boxShadow: accentColor === c.value ? `0 0 12px ${c.value}40, inset 0 0 0 1.5px rgba(255,255,255,0.15)` : 'none' }}
                  title={c.name} />
              ))}
            </div>
          </div>
        </div>

        <div className="relative rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-red-500/[0.03] rounded-lg border border-red-500/[0.06]" />
          <div className="relative p-3">
            <button onClick={() => setShowReset(true)} className="w-full text-xs text-red-400/50 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5">
              <RotateCcw size={11} /> Reset All Settings
            </button>
          </div>
        </div>
      </aside>

      {/* Reset modal */}
      <AnimatePresence>
        {showReset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowReset(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative rounded-xl overflow-hidden max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
              <div className="absolute inset-0 bg-[#111]/90 backdrop-blur-xl rounded-xl border border-white/[0.06]" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
              <div className="relative p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center"><AlertTriangle size={20} className="text-red-400" /></div>
                  <div><h3 className="font-display font-semibold text-lg text-white/90">Reset all settings?</h3><p className="text-[10px] text-white/30">This cannot be undone.</p></div>
                </div>
                <p className="text-sm text-white/40 mb-6">All settings will be restored to defaults. Your downloads and history will not be affected.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowReset(false)} className="flex-1 text-xs bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/80 px-4 py-2 rounded-lg transition-colors">Cancel</button>
                  <button onClick={resetAll} className="flex-1 text-xs bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 px-4 py-2 rounded-lg transition-colors font-medium">Reset All</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
