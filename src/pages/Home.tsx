import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Download, Zap, CheckCircle, Shield, PlaySquare, Network,
  AudioLines, Puzzle, Code, Globe, ArrowUpRight, Pause, Play,
  X, FileText
} from 'lucide-react';
import { useDownloads } from '@/context/DownloadContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

/* ─── Animated section wrapper ─── */
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Stat card ─── */
function StatCard({ icon: Icon, label, value, color, delay }: any) {
  return (
    <FadeIn delay={delay}>
      <div className="bg-bg-secondary border border-border-subtle rounded-lg px-5 py-4 flex items-center gap-3 hover:bg-bg-hover transition-all hover:-translate-y-0.5">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center`} style={{ backgroundColor: `${color}18` }}>
          <Icon size={20} style={{ color }} />
        </div>
        <div>
          <p className="font-mono text-lg font-semibold" style={{ color }}>{value}</p>
          <p className="text-text-secondary text-xs">{label}</p>
        </div>
      </div>
    </FadeIn>
  );
}

/* ─── Feature card ─── */
function FeatureCard({ icon: Icon, title, desc, link, color, delay }: any) {
  return (
    <FadeIn delay={delay}>
      <Link
        to={link}
        className="group block bg-bg-secondary border border-border-subtle rounded-lg p-7 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
        style={{ ['--hover-color' as any]: color }}
      >
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight size={18} className="text-text-tertiary group-hover:text-[var(--hover-color)]" />
        </div>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${color}18` }}>
          <Icon size={22} style={{ color }} />
        </div>
        <h3 className="font-display font-semibold text-lg text-text-primary mb-2">{title}</h3>
        <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-opacity-30 rounded-lg transition-all duration-300 pointer-events-none" style={{ borderColor: `${color}4D` }} />
      </Link>
    </FadeIn>
  );
}

/* ─── Download row ─── */
function DownloadRow({ d, onPause, onResume, onCancel }: any) {
  const statusColors: Record<string, string> = {
    downloading: '#0A84FF', paused: '#FF9500', queued: '#8A8A93',
    completed: '#32D74B', error: '#FF3B30', converting: '#FF6B35', seeding: '#AF52DE',
  };
  const color = statusColors[d.status] || '#8A8A93';
  const isActive = d.status === 'downloading';

  const typeIcons: Record<string, any> = { http: Download, youtube: PlaySquare, torrent: Network, magnet: Network, convert: AudioLines };
  const TypeIcon = typeIcons[d.type] || FileText;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-bg-secondary border border-border-subtle rounded-lg p-4 flex items-center gap-4 hover:bg-bg-hover transition-colors"
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
        <TypeIcon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{d.filename}</p>
        <p className="text-xs text-text-tertiary truncate">{d.url}</p>
        <div className="mt-2 h-1 rounded-full bg-border-subtle overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isActive ? 'shimmer-bg' : ''}`}
            style={{
              width: `${d.progress}%`,
              background: isActive ? 'linear-gradient(90deg, #0A84FF, #32D74B)' : color,
              transition: 'width 0.3s ease-out'
            }}
          />
        </div>
      </div>
      <div className="text-right shrink-0 min-w-[80px]">
        <p className="font-mono text-sm" style={{ color }}>{d.progress}%</p>
        {d.speed > 0 && <p className="font-mono text-xs text-accent-cyan">{d.speed.toFixed(1)} MB/s</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isActive ? (
          <button onClick={() => onPause(d.id)} className="p-2 rounded-md hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors">
            <Pause size={16} />
          </button>
        ) : d.status === 'paused' ? (
          <button onClick={() => onResume(d.id)} className="p-2 rounded-md hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors">
            <Play size={16} />
          </button>
        ) : null}
        <button onClick={() => onCancel(d.id)} className="p-2 rounded-md hover:bg-bg-tertiary text-text-secondary hover:text-accent-red transition-colors">
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Home Page ─── */
export default function Home() {
  const { downloads, totalSpeed, activeCount, torEnabled, pauseDownload, resumeDownload, cancelDownload } = useDownloads();
  const [urlInput, setUrlInput] = useState('');
  const speedData = downloads.find(d => d.speed > 0)?.speedHistory.map((s, i) => ({ time: i, speed: s })) || Array(60).fill(0).map((_, i) => ({ time: i, speed: Math.random() * 15 }));

  const activeDownloads = downloads.filter(d => ['downloading', 'paused', 'converting'].includes(d.status)).slice(0, 5);
  const completedToday = downloads.filter(d => d.status === 'completed').length;

  const urlType = urlInput.includes('youtube') || urlInput.includes('youtu.be') ? 'youtube'
    : urlInput.startsWith('magnet:') ? 'magnet'
    : urlInput.startsWith('http') ? 'http' : null;

  const featureRows = [
    { icon: Globe, title: 'HTTP \u00B7 HTTPS \u00B7 FTP \u00B7 Magnet \u00B7 Torrent', desc: 'Download from any URL. Support for all protocols including BitTorrent with DHT, PEX, and magnet link handling.', color: '#0A84FF' },
    { icon: PlaySquare, title: 'YouTube Search & Full Format Support', desc: 'Search YouTube directly. Download in any resolution from 144p to 4K. Extract audio as MP3, FLAC, AAC, or WAV.', color: '#FF3B30' },
    { icon: Network, title: 'Built-in Torrent Search & P2P', desc: 'Search across torrent indexes. Track seeders, leechers, and peers in real-time. DHT and PEX support for maximum connectivity.', color: '#AF52DE' },
    { icon: Shield, title: 'Tor Routing \u00B7 Proxy Support \u00B7 Scheduling', desc: 'Route downloads through Tor for anonymity. Configure SOCKS5/HTTP proxies. Schedule bandwidth limits by time of day.', color: '#32D74B' },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center px-6 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #050505 0%, #0A0A0A 50%, #0F0F1A 100%)' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url(/hero-bg-pattern.png)', backgroundSize: 'cover' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-[0.03] bg-accent-blue animate-drift" style={{ filter: 'blur(120px)', top: '20%', left: '30%' }} />

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="font-display font-bold text-[clamp(3rem,8vw,7rem)] tracking-[-0.04em] text-white relative z-10"
        >
          KEL<span className="text-accent-blue">E</span><span className="text-accent-blue">X</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-text-secondary text-xl mt-3 relative z-10"
        >
          Universal Download Engine
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="text-text-tertiary text-base mt-2 relative z-10"
        >
          Download anything. From anywhere. At maximum speed.
        </motion.p>

        {/* URL Input */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="relative z-10 mt-10 w-full max-w-[720px]"
        >
          <div className="flex items-center gap-2 bg-bg-tertiary border border-border-default rounded-full px-5 h-[60px] focus-within:border-accent-blue focus-within:glow-blue transition-all">
            <Globe size={18} className="text-text-tertiary" />
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="Paste URL, YouTube link, Magnet link, or search torrents..."
              className="bg-transparent flex-1 text-text-primary placeholder:text-text-tertiary outline-none text-sm"
            />
            {urlType && (
              <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full uppercase ${
                urlType === 'youtube' ? 'bg-accent-red/15 text-accent-red' :
                urlType === 'magnet' ? 'bg-accent-violet/15 text-accent-violet' :
                'bg-accent-blue/15 text-accent-blue'
              }`}>
                {urlType}
              </span>
            )}
            <button className="bg-accent-blue hover:bg-blue-600 text-white font-medium px-6 h-12 rounded-full transition-all hover:scale-[1.02] shrink-0 text-sm">
              DOWNLOAD
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="relative z-10 mt-12 grid grid-cols-4 gap-4 max-w-[700px] w-full">
          <StatCard icon={Download} label="Active" value={activeCount} color="#0A84FF" delay={0.5} />
          <StatCard icon={Zap} label="Speed" value={`${totalSpeed.toFixed(1)} MB/s`} color="#FF9500" delay={0.6} />
          <StatCard icon={CheckCircle} label="Completed" value={completedToday} color="#32D74B" delay={0.7} />
          <StatCard icon={Shield} label={`Tor: ${torEnabled ? 'ON' : 'OFF'}`} value={torEnabled ? 'Active' : 'Off'} color={torEnabled ? '#AF52DE' : '#5A5A63'} delay={0.8} />
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <FadeIn>
          <p className="font-mono text-xs text-accent-blue tracking-[0.1em] mb-6">QUICK ACCESS</p>
        </FadeIn>
        <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
          <FeatureCard icon={PlaySquare} title="YouTube" desc="Search, preview & download videos in any format. Convert to MP3/FLAC." link="/youtube" color="#FF3B30" delay={0.08} />
          <FeatureCard icon={Network} title="Torrents" desc="Search torrents, download via magnet links. Track peers, seeders & leechers." link="/torrents" color="#AF52DE" delay={0.16} />
          <FeatureCard icon={AudioLines} title="Convert" desc="Extract audio from video. Convert to MP3, FLAC, AAC, WAV with quality control." link="/converter" color="#FF6B35" delay={0.24} />
          <FeatureCard icon={Download} title="Downloads" desc="Full queue management, priorities, scheduling, speed limits & bandwidth control." link="/downloads" color="#0A84FF" delay={0.32} />
          <FeatureCard icon={Puzzle} title="Extension" desc="One-click downloads from any site. Cookie support for protected content." link="/extension" color="#FF9500" delay={0.40} />
          <FeatureCard icon={Code} title="API" desc="Programmatic access. Integrate Kelex into your workflows & applications." link="/api-docs" color="#32D74B" delay={0.48} />
        </div>
      </section>

      {/* ── Active Downloads Preview ── */}
      <section className="max-w-[1200px] mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-5">
          <FadeIn>
            <div className="flex items-center gap-3">
              <p className="font-mono text-xs text-accent-blue tracking-[0.05em]">ACTIVE DOWNLOADS</p>
              {activeCount > 0 && <span className="bg-accent-blue/15 text-accent-blue text-xs font-mono px-2 py-0.5 rounded-full">{activeCount}</span>}
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <Link to="/downloads" className="text-text-secondary hover:text-text-primary text-sm transition-colors flex items-center gap-1">
              View All <ArrowUpRight size={14} />
            </Link>
          </FadeIn>
        </div>

        {activeDownloads.length > 0 ? (
          <div className="flex flex-col gap-2">
            {activeDownloads.map((d, i) => (
              <FadeIn key={d.id} delay={i * 0.08}>
                <DownloadRow d={d} onPause={pauseDownload} onResume={resumeDownload} onCancel={cancelDownload} />
              </FadeIn>
            ))}
          </div>
        ) : (
          <FadeIn>
            <div className="text-center py-16">
              <Download size={64} className="text-text-tertiary mx-auto animate-float" />
              <p className="text-text-secondary mt-4">No active downloads</p>
              <p className="text-text-tertiary text-sm mt-1">Paste a URL above to get started</p>
            </div>
          </FadeIn>
        )}
      </section>

      {/* ── Speed Graph & Bandwidth ── */}
      <section className="max-w-[1200px] mx-auto px-6 pb-20">
        <div className="grid grid-cols-5 gap-5 max-md:grid-cols-1">
          <FadeIn className="col-span-3">
            <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em]">BANDWIDTH</p>
                <p className="font-mono text-xl text-text-primary">{totalSpeed.toFixed(1)} <span className="text-sm text-text-secondary">MB/s</span></p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={speedData}>
                  <defs>
                    <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0A84FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5A5A63' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#5A5A63' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '6px', fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                    itemStyle={{ color: '#0A84FF' }}
                    labelStyle={{ color: '#5A5A63' }}
                  />
                  <Area type="monotone" dataKey="speed" stroke="#0A84FF" strokeWidth={2} fill="url(#speedGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </FadeIn>

          <FadeIn className="col-span-2" delay={0.1}>
            <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
              <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mb-4">USAGE BY TYPE</p>
              {[
                { label: 'HTTP Downloads', value: 45, color: '#0A84FF' },
                { label: 'YouTube', value: 30, color: '#FF3B30' },
                { label: 'Torrents', value: 15, color: '#AF52DE' },
                { label: 'Conversions', value: 10, color: '#FF6B35' },
              ].map(bar => (
                <div key={bar.label} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary">{bar.label}</span>
                    <span className="font-mono text-text-tertiary">{bar.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-border-subtle overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${bar.value}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: bar.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Feature Showcase ── */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <FadeIn className="text-center mb-16">
          <p className="font-mono text-xs text-accent-amber tracking-[0.1em] mb-3">POWERFUL FEATURES</p>
          <h2 className="font-display font-semibold text-[clamp(1.5rem,3vw,2.5rem)]">Everything you need. Nothing you don&apos;t.</h2>
        </FadeIn>

        {featureRows.map((row, i) => (
          <FadeIn key={i}>
            <div className={`flex items-center gap-12 py-12 border-b border-border-subtle last:border-0 max-md:flex-col ${i % 2 !== 0 ? 'flex-row-reverse' : ''}`}>
              <div className="flex-1">
                <row.icon size={48} style={{ color: row.color }} className="mb-4" />
                <h3 className="font-display font-semibold text-xl mb-3">{row.title}</h3>
                <p className="text-text-secondary leading-relaxed">{row.desc}</p>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="w-full max-w-[360px] h-[200px] rounded-lg border border-border-subtle bg-bg-secondary flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at center, ${row.color}, transparent 70%)` }} />
                  <row.icon size={64} style={{ color: row.color, opacity: 0.3 }} />
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </section>

      {/* ── Footer CTA ── */}
      <section className="relative py-20 text-center" style={{ backgroundColor: '#080808' }}>
        <div className="h-0.5 w-full absolute top-0 left-0" style={{ background: 'linear-gradient(90deg, #0A84FF, #AF52DE, #FF6B35)' }} />
        <FadeIn>
          <h2 className="font-display font-bold text-[clamp(2rem,5vw,4rem)] text-white mb-4">Ready to Download?</h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="text-text-secondary text-lg max-w-[500px] mx-auto mb-8">Paste any URL above and experience the fastest download manager.</p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <button className="bg-accent-blue hover:bg-blue-600 text-white font-medium h-[52px] px-8 rounded-full transition-all hover:scale-[1.02] text-sm">
            START DOWNLOADING
          </button>
        </FadeIn>
        <FadeIn delay={0.4}>
          <p className="text-text-tertiary text-xs mt-4">or press Ctrl+V anywhere to paste</p>
        </FadeIn>
      </section>
    </div>
  );
}
