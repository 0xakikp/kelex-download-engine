import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AudioLines, Upload, HardDriveDownload, PlaySquare, Wand2,
  Check, FileAudio, FileVideo, ChevronDown, ChevronUp
} from 'lucide-react';

const formats = [
  { id: 'mp3', label: 'MP3', quality: 'Lossy', popular: true },
  { id: 'flac', label: 'FLAC', quality: 'Lossless', lossless: true },
  { id: 'aac', label: 'AAC', quality: 'Lossy' },
  { id: 'wav', label: 'WAV', quality: 'Uncompressed', lossless: true },
  { id: 'm4a', label: 'M4A', quality: 'Lossy' },
];

const stages = ['Extracting audio', 'Encoding', 'Writing metadata', 'Finalizing'];

const presets = [
  { label: 'Best Quality', format: 'FLAC', color: '#32D74B', desc: 'Lossless' },
  { label: 'High Quality', format: 'MP3 320', color: '#0A84FF', desc: 'MP3 320kbps' },
  { label: 'Good Quality', format: 'MP3 192', color: '#8A8A93', desc: 'MP3 192kbps' },
  { label: 'Small Size', format: 'MP3 128', color: '#FF9500', desc: 'MP3 128kbps' },
  { label: 'Voice/Podcast', format: 'MP3 96', color: '#5A5A63', desc: 'MP3 96kbps' },
];

const formatGuide = [
  { format: 'MP3', quality: 4, compression: 5, bestFor: 'Streaming, compatibility', size: 'Small' },
  { format: 'FLAC', quality: 5, compression: 2, bestFor: 'Archiving, hi-fi', size: 'Large' },
  { format: 'AAC', quality: 4, compression: 4, bestFor: 'Apple devices', size: 'Small' },
  { format: 'WAV', quality: 5, compression: 1, bestFor: 'Editing, mastering', size: 'Very Large' },
  { format: 'M4A', quality: 4, compression: 4, bestFor: 'iTunes, Apple', size: 'Small' },
];

interface ConversionJob {
  id: string;
  filename: string;
  sourceFormat: string;
  targetFormat: string;
  bitrate: number;
  progress: number;
  stage: number;
  status: 'converting' | 'completed' | 'error';
}

export default function Converter() {
  const [selectedSource, setSelectedSource] = useState<'download' | 'upload' | 'youtube' | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('mp3');
  const [bitrate, setBitrate] = useState(192);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [conversions, setConversions] = useState<ConversionJob[]>([]);
  const [, setHistory] = useState<ConversionJob[]>([]);
  const [embedMetadata, setEmbedMetadata] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSourceFile(files[0].name);
      setSelectedSource('upload');
    }
  }, []);

  const startConversion = () => {
    const fmt = formats.find(f => f.id === selectedFormat);
    const newJob: ConversionJob = {
      id: `conv_${Date.now()}`,
      filename: sourceFile || 'video_file.mp4',
      sourceFormat: 'MP4',
      targetFormat: fmt?.label || 'MP3',
      bitrate,
      progress: 0,
      stage: 0,
      status: 'converting',
    };
    setConversions(prev => [...prev, newJob]);

    // Simulate conversion
    let progress = 0;
    let stage = 0;
        const interval = setInterval(() => {
      progress += Math.random() * 8;
      if (progress >= (stage + 1) * 25) stage = Math.min(stage + 1, 3);
      if (progress >= 100) {
        progress = 100;
        stage = 3;
        clearInterval(interval);
        setConversions(prev => prev.map(c => c.id === newJob.id ? { ...c, progress: 100, stage: 3, status: 'completed' as const } : c));
        setHistory(prev => [{ ...newJob, progress: 100, stage: 3, status: 'completed' as const }, ...prev]);
        setTimeout(() => setConversions(prev => prev.filter(c => c.id !== newJob.id)), 2000);
      } else {
        setConversions(prev => prev.map(c => c.id === newJob.id ? { ...c, progress, stage } : c));
      }
    }, 300);
  };

  const selectSource = (source: 'download' | 'upload' | 'youtube') => {
    setSelectedSource(source);
    if (source === 'download') setSourceFile('Cyberpunk_Edgerunners_S01E01_1080p.mp4');
    if (source === 'youtube') setSourceFile('YouTube: Lofi Hip Hop Radio');
  };

  
  return (
    <div className="min-h-screen" onDragOver={e => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop}>
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center" onClick={() => setIsDragOver(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="border-2 border-dashed border-accent-orange rounded-2xl p-16 text-center" style={{ animation: 'pulse 1.5s infinite' }}>
              <Upload size={96} className="text-accent-orange mx-auto mb-4" />
              <h2 className="text-2xl font-display font-semibold text-text-primary mb-2">Drop video files here</h2>
              <p className="text-text-secondary">Supports MP4, MKV, AVI, WEBM, MOV</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="relative py-10 px-6 text-center" style={{ background: 'linear-gradient(180deg, #0F0805 0%, var(--bg-primary) 100%)' }}>
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.025] bg-accent-orange" style={{ filter: 'blur(100px)', top: '10%', left: '50%', transform: 'translateX(-50%)' }} />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}>
          <AudioLines size={56} className="text-accent-orange mx-auto mb-4" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
          className="font-display font-bold text-[clamp(2rem,5vw,4rem)] text-text-primary mb-2">Media Converter</motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
          className="text-text-secondary text-lg max-w-[520px] mx-auto">Extract studio-quality audio from any video. MP3, FLAC, AAC, WAV, M4A.</motion.p>

        {/* Source Selection */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.4 }}
          className="max-w-[640px] mx-auto mt-8 grid grid-cols-3 gap-3">
          <SourceCard icon={HardDriveDownload} title="From Downloads" desc="Select a downloaded video" color="var(--accent-blue)" selected={selectedSource === 'download'} onClick={() => selectSource('download')} />
          <SourceCard icon={Upload} title="Upload File" desc="Drag & drop or browse" color="var(--accent-cyan)" selected={selectedSource === 'upload'} onClick={() => { fileInputRef.current?.click(); setSelectedSource('upload'); }} />
          <SourceCard icon={PlaySquare} title="From YouTube" desc="Paste a YouTube URL" color="var(--accent-red)" selected={selectedSource === 'youtube'} onClick={() => selectSource('youtube')} />
        </motion.div>
        <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setSourceFile(e.target.files[0].name); }} />
      </section>

      {/* Conversion Settings */}
      {selectedSource && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="max-w-[720px] mx-auto px-6 pb-10">
          <div className="bg-bg-secondary border border-border-subtle rounded-xl p-8">
            {/* Source info */}
            <div className="flex items-center gap-3 pb-5 mb-5 border-b border-border-subtle">
              <div className="w-10 h-10 rounded-lg bg-accent-orange/15 flex items-center justify-center">
                <FileVideo size={20} className="text-accent-orange" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{sourceFile}</p>
                <p className="text-xs text-text-tertiary">Source file selected</p>
              </div>
              <button onClick={() => { setSelectedSource(null); setSourceFile(null); }} className="text-xs text-text-tertiary hover:text-text-primary">Change</button>
            </div>

            {/* Format Selection */}
            <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mb-3">OUTPUT FORMAT</p>
            <div className="flex gap-2.5 overflow-x-auto pb-2">
              {formats.map(fmt => (
                <button key={fmt.id} onClick={() => setSelectedFormat(fmt.id)}
                  className={`min-w-[80px] bg-bg-primary border rounded-md px-2 py-4 flex flex-col items-center gap-1 transition-all ${selectedFormat === fmt.id ? 'border-accent-orange bg-accent-orange/10 text-accent-orange' : 'border-border-subtle hover:border-accent-orange/30'}`}>
                  <span className="font-mono text-sm font-medium">{fmt.label}</span>
                  <span className="text-[10px] text-text-tertiary">{fmt.quality}</span>
                  {fmt.lossless && <span className="text-[9px] text-accent-cyan font-mono mt-0.5">Lossless</span>}
                </button>
              ))}
            </div>

            {/* Bitrate Slider */}
            {['mp3', 'aac', 'm4a'].includes(selectedFormat) && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em]">BITRATE</p>
                  <span className="font-mono text-sm text-accent-orange">{bitrate}kbps</span>
                </div>
                <input type="range" min={64} max={320} step={32} value={bitrate} onChange={e => setBitrate(Number(e.target.value))}
                  className="w-full accent-accent-orange" />
                <div className="flex justify-between text-[10px] text-text-tertiary mt-1 px-1">
                  <span>Small</span><span>Good</span><span>High</span><span>Excellent</span>
                </div>
              </div>
            )}

            {/* Metadata Toggle */}
            <div className="mt-5 flex items-center gap-3">
              <button onClick={() => setEmbedMetadata(!embedMetadata)}
                className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${embedMetadata ? 'bg-accent-orange' : 'border border-border-default'}`}>
                {embedMetadata && <Check size={14} className="text-text-primary" />}
              </button>
              <span className="text-sm text-text-secondary">Embed metadata (title, artist, thumbnail)</span>
            </div>

            {/* Advanced Options */}
            <div className="mt-4">
              <button onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors">
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Advanced Options
              </button>
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-3 flex flex-col gap-2">
                      {['Trim audio', 'Normalize volume', 'Fade in/out'].map(opt => (
                        <label key={opt} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                          <input type="checkbox" className="rounded border-border-default" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Convert Button */}
            <button onClick={startConversion}
            className="w-full mt-8 bg-accent-orange hover:opacity-90 text-white h-[52px] rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.01]">
              <Wand2 size={18} /> CONVERT
            </button>
          </div>
        </motion.section>
      )}

      {/* Active Conversions */}
      <AnimatePresence>
        {conversions.length > 0 && (
          <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="px-6 py-6 border-t border-border-subtle overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <p className="font-mono text-[10px] text-accent-orange tracking-[0.05em]">CONVERTING</p>
              <div className="w-4 h-4 border-2 border-accent-orange border-t-transparent rounded-full animate-spin" />
            </div>
            {conversions.map(job => (
              <motion.div key={job.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                className="bg-bg-secondary border border-border-subtle rounded-lg p-4 mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <FileAudio size={20} className="text-accent-orange" />
                  <div className="flex-1">
                    <p className="text-sm text-text-primary">{job.filename}</p>
                    <p className="text-[10px] text-text-tertiary font-mono">MP4 &rarr; {job.targetFormat} &middot; {job.bitrate}kbps</p>
                  </div>
                  <span className="font-mono text-sm text-accent-orange">{Math.round(job.progress)}%</span>
                </div>
                {/* Stage pipeline */}
                <div className="flex gap-2 mb-2">
                  {stages.map((s, i) => (
                    <div key={s} className="flex-1 flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        i < job.stage ? 'bg-accent-blue' : i === job.stage ? 'bg-accent-orange' : 'bg-border-subtle'
                      }`}>
                        {i < job.stage ? <Check size={10} className="text-text-primary" /> : <div className={`w-1.5 h-1.5 rounded-full ${i === job.stage ? 'bg-text-primary animate-pulse' : 'bg-text-tertiary'}`} />}
                      </div>
                      <span className={`text-[10px] ${i <= job.stage ? 'text-text-primary' : 'text-text-tertiary'}`}>{s}</span>
                    </div>
                  ))}
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full bg-border-subtle overflow-hidden">
                  <motion.div className="h-full rounded-full bg-accent-orange" style={{ width: `${job.progress}%` }} />
                </div>
              </motion.div>
            ))}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Waveform */}
      <section className="px-6 py-6">
        <div className="bg-bg-secondary border border-border-subtle rounded-lg overflow-hidden">
          <img src="/converter-waveform.png" alt="Waveform" className="w-full h-40 object-cover opacity-60" />
        </div>
      </section>

      {/* Format Guide */}
      <section className="max-w-[1200px] mx-auto px-6 py-10 border-t border-border-subtle">
        <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mb-4">FORMAT GUIDE</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-text-tertiary font-mono border-b border-border-subtle">
                <th className="pb-2 pr-4">FORMAT</th>
                <th className="pb-2 pr-4">QUALITY</th>
                <th className="pb-2 pr-4">COMPRESSION</th>
                <th className="pb-2 pr-4">BEST FOR</th>
                <th className="pb-2">FILE SIZE</th>
              </tr>
            </thead>
            <tbody>
              {formatGuide.map(row => (
                <tr key={row.format} className="border-b border-border-subtle hover:bg-bg-hover transition-colors">
                  <td className="py-3 pr-4 font-mono text-accent-orange">{row.format}</td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`w-4 h-1.5 rounded-full ${i < row.quality ? 'bg-accent-orange' : 'bg-border-subtle'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`w-4 h-1.5 rounded-full ${i < row.compression ? 'bg-accent-blue' : 'bg-border-subtle'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-text-secondary">{row.bestFor}</td>
                  <td className="py-3 text-text-tertiary font-mono text-xs">{row.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Presets */}
        <div className="flex gap-2 mt-6 flex-wrap">
          {presets.map(p => (
            <button key={p.label} className="px-4 py-2 rounded-full border border-border-subtle text-xs font-medium transition-colors hover:bg-bg-hover"
              style={{ color: p.color, borderColor: `${p.color}30` }}>
              {p.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SourceCard({ icon: Icon, title, desc, color, selected, onClick }: any) {
  return (
    <button onClick={onClick}
      className={`bg-bg-secondary border rounded-lg p-6 flex flex-col items-center gap-3 transition-all hover:-translate-y-0.5 ${
        selected ? 'border-accent-orange shadow-[0_0_30px_-10px_rgba(255,107,53,0.3)]' : 'border-border-subtle hover:border-accent-orange/20'
      }`}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon size={24} style={{ color }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="text-[10px] text-text-secondary mt-0.5">{desc}</p>
      </div>
    </button>
  );
}
