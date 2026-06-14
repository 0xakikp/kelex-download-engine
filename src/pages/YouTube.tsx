import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlaySquare, Search, Download, X, Check, Music, Video,
  Film, Headphones
} from 'lucide-react';
import { useDownloads } from '@/context/DownloadContext';

const defaultMockVideos = [
  { id: '1', title: 'The Beauty of Mathematics - A Visual Journey', channel: 'Veritasium', views: '4.2M', duration: '14:32', thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=640&h=360&fit=crop', date: '2 weeks ago' },
  { id: '2', title: 'Linux Terminal Tutorial - From Beginner to Pro', channel: 'ThePrimeagen', views: '1.8M', duration: '28:45', thumbnail: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=640&h=360&fit=crop', date: '3 days ago' },
  { id: '3', title: 'Lofi Hip Hop Radio - Beats to Relax/Study to', channel: 'Lofi Girl', views: '12M', duration: 'Live', thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=640&h=360&fit=crop', date: 'Streaming' },
  { id: '4', title: 'How to Build a Neural Network from Scratch', channel: '3Blue1Brown', views: '3.1M', duration: '21:18', thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=640&h=360&fit=crop', date: '1 week ago' },
  { id: '5', title: 'Epic Cinematic Drone Footage - Norway 4K', channel: 'Peter McKinnon', views: '890K', duration: '5:42', thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=640&h=360&fit=crop', date: '4 days ago' },
  { id: '6', title: 'The History of the Internet in 12 Minutes', channel: 'Fireship', views: '5.7M', duration: '12:04', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=640&h=360&fit=crop', date: '1 month ago' },
];

const qualities = [
  { label: '4K Ultra HD', res: '2160p', size: '~2.4 GB', codec: 'VP9 / H.265' },
  { label: '1440p HD', res: '1440p', size: '~1.2 GB', codec: 'VP9' },
  { label: '1080p HD', res: '1080p', size: '~780 MB', codec: 'H.264' },
  { label: '720p HD', res: '720p', size: '~420 MB', codec: 'H.264' },
  { label: '480p', res: '480p', size: '~220 MB', codec: 'H.264' },
  { label: '360p', res: '360p', size: '~120 MB', codec: 'H.264' },
  { label: '240p', res: '240p', size: '~65 MB', codec: 'H.264' },
  { label: '144p', res: '144p', size: '~32 MB', codec: 'H.264' },
];

const audioFormats = [
  { label: 'MP3', desc: 'Compressed, universal', lossy: true },
  { label: 'FLAC', desc: 'Lossless, highest quality', lossy: false },
  { label: 'AAC', desc: 'Better than MP3', lossy: true },
  { label: 'WAV', desc: 'Uncompressed PCM', lossy: false },
  { label: 'M4A', desc: 'Apple format', lossy: true },
];

const tags = ['Trending', 'Music', '4K', 'Podcasts', 'Tutorials', 'Gaming', 'Live'];

export default function YouTube() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [tab, setTab] = useState<'video' | 'audio'>('video');
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [videoFormat, setVideoFormat] = useState('MP4');
  const [audioFormat, setAudioFormat] = useState('MP3');
  const [bitrate, setBitrate] = useState(192);
  const [queue, setQueue] = useState<any[]>([]);
  const [mockVideos, setMockVideos] = useState<any[]>(defaultMockVideos);
  
  const { addDownload } = useDownloads();

  const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001/api/v1' : '/api/v1');

  const doSearch = async () => {
    if (!query.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/youtube/info?url=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.id || data.title) {
        // Real result from backend - use it instead of mock
        const realVideo = {
          id: data.id,
          title: data.title || 'Unknown',
          channel: data.uploader || 'Unknown',
          views: data.view_count ? String(data.view_count) : 'N/A',
          duration: data.duration ? `${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}` : 'N/A',
          thumbnail: data.thumbnail || `https://img.youtube.com/vi/${data.id}/mqdefault.jpg`,
          date: 'Just now',
        };
        setMockVideos([realVideo, ...mockVideos.slice(1)]);
      }
      setSearched(true);
    } catch {
      setSearched(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch();
  };

  const addToQueue = (video: any) => {
    const item = { ...video, status: 'queued', progress: 0, format: tab === 'video' ? videoFormat : audioFormat, quality: tab === 'video' ? selectedQuality : `${bitrate}kbps` };
    setQueue(prev => [...prev, item]);
    // Also add to backend if it's a real YouTube result
    if (video.id && video.id.length === 11) {
      const url = `https://www.youtube.com/watch?v=${video.id}`;
      addDownload({ url, type: 'youtube', format: tab === 'video' ? videoFormat.toLowerCase() : audioFormat.toLowerCase(), quality: selectedQuality });
    }
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-10 px-6 text-center" style={{ background: 'linear-gradient(180deg, #0F0505 0%, var(--bg-primary) 100%)' }}>
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.02] bg-accent-red" style={{ filter: 'blur(100px)', top: '10%', left: '50%', transform: 'translateX(-50%)' }} />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}>
          <PlaySquare size={56} className="text-accent-red mx-auto mb-4" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="font-display font-bold text-[clamp(2rem,5vw,4rem)] text-text-primary mb-2">YouTube Downloader</motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
          className="text-text-secondary text-lg max-w-[520px] mx-auto">Search, preview & download any video. Extract audio in studio quality.</motion.p>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.4 }}
          className="max-w-[640px] mx-auto mt-8">
          <div className="flex items-center gap-2 bg-bg-tertiary border border-border-default rounded-full px-5 h-14 focus-within:border-accent-red transition-all">
            <Search size={18} className="text-text-tertiary" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Search YouTube or paste a video URL..."
              className="bg-transparent flex-1 text-text-primary placeholder:text-text-tertiary outline-none text-sm" />
            <button onClick={doSearch} className="bg-accent-red hover:opacity-90 text-white font-medium px-5 h-11 rounded-full text-sm transition-colors">
              SEARCH
            </button>
          </div>
        </motion.div>

        <div className="flex justify-center gap-2 mt-5 flex-wrap">
          {tags.map((tag, i) => (
            <motion.button key={tag} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.05 }}
              className="bg-bg-tertiary text-text-secondary text-xs px-4 h-8 rounded-full hover:bg-bg-hover hover:text-text-primary transition-colors">
              {tag}
            </motion.button>
          ))}
        </div>
      </section>

      {/* Search Results */}
      {searched && (
        <section className="px-6 py-6">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
            {mockVideos.map((video, i) => (
              <motion.div key={video.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}
                className="group cursor-pointer" onClick={() => setSelectedVideo(video)}>
                <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-secondary">
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-300" />
                  <span className="absolute bottom-2 right-2 bg-black/80 text-text-primary text-[10px] font-mono px-1.5 py-0.5 rounded">{video.duration}</span>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="bg-accent-red hover:opacity-90 text-white text-xs font-medium px-4 py-2 rounded-md flex items-center gap-2">
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
                <h3 className="text-sm text-text-primary font-medium mt-2.5 line-clamp-2">{video.title}</h3>
                <p className="text-xs text-text-secondary mt-1">{video.channel} <span className="text-text-tertiary">&middot; {video.views} views &middot; {video.date}</span></p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Video Preview Panel */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setSelectedVideo(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bg-secondary border border-border-subtle rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="grid grid-cols-2 max-md:grid-cols-1">
                {/* Left - Preview */}
                <div className="p-6 border-r border-border-subtle">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-bg-primary mb-4">
                    <img src={selectedVideo.thumbnail} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-accent-red flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                        <PlaySquare size={28} className="text-white ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-display font-semibold text-lg">{selectedVideo.title}</h3>
                  <p className="text-text-secondary text-sm mt-1">{selectedVideo.channel}</p>
                  <p className="text-text-tertiary text-xs mt-1">{selectedVideo.views} views &middot; {selectedVideo.date}</p>
                </div>

                {/* Right - Download Options */}
                <div className="p-6">
                  <div className="flex border-b border-border-subtle mb-4">
                    <button onClick={() => setTab('video')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'video' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary'}`}>Video</button>
                    <button onClick={() => setTab('audio')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'audio' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary'}`}>Audio Only</button>
                  </div>

                  {tab === 'video' ? (
                    <>
                      <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mb-3">QUALITY</p>
                      <div className="flex flex-col gap-1 max-h-[280px] overflow-y-auto pr-1">
                        {qualities.map(q => (
                          <button key={q.res} onClick={() => setSelectedQuality(q.res)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${selectedQuality === q.res ? 'bg-accent-blue/10 border-l-2 border-accent-blue' : 'hover:bg-bg-hover border-l-2 border-transparent'}`}>
                            {selectedQuality === q.res ? <Check size={16} className="text-accent-blue shrink-0" /> : <div className="w-4 shrink-0" />}
                            <div className="flex-1">
                              <p className="text-sm text-text-primary">{q.label}</p>
                              <p className="text-[10px] text-text-tertiary font-mono">{q.codec}</p>
                            </div>
                            <span className="text-xs text-text-secondary font-mono">{q.size}</span>
                          </button>
                        ))}
                      </div>
                      <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mt-4 mb-2">FORMAT</p>
                      <div className="flex gap-2">
                        {['MP4', 'WEBM', 'MKV'].map(f => (
                          <button key={f} onClick={() => setVideoFormat(f)}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${videoFormat === f ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30' : 'bg-bg-primary text-text-secondary border border-border-subtle hover:bg-bg-hover'}`}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mb-3">FORMAT</p>
                      <div className="flex flex-col gap-2 mb-5">
                        {audioFormats.map(af => (
                          <button key={af.label} onClick={() => setAudioFormat(af.label)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${audioFormat === af.label ? 'bg-accent-blue/10 border-l-2 border-accent-blue' : 'hover:bg-bg-hover border-l-2 border-transparent'}`}>
                            {audioFormat === af.label ? <Check size={16} className="text-accent-blue shrink-0" /> : <div className="w-4 shrink-0" />}
                            <div>
                              <p className="text-sm text-text-primary">{af.label} {!af.lossy && <span className="text-accent-cyan text-[10px] font-mono ml-1">Lossless</span>}</p>
                              <p className="text-[10px] text-text-tertiary">{af.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mb-2">BITRATE</p>
                      <div className="flex items-center gap-3">
                        <input type="range" min={64} max={320} step={32} value={bitrate} onChange={e => setBitrate(Number(e.target.value))}
                          className="flex-1 accent-accent-orange" />
                        <span className="font-mono text-sm text-accent-orange w-16 text-right">{bitrate}kbps</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-text-tertiary mt-1 px-1">
                        <span>Small</span><span>Good</span><span>High</span><span>Excellent</span>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 mt-6">
                    <button onClick={() => addToQueue(selectedVideo)}
                      className="flex-1 bg-accent-blue hover:opacity-90 text-white h-12 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                      <Download size={16} /> DOWNLOAD
                    </button>
                    <button onClick={() => addToQueue(selectedVideo)}
                      className="px-4 h-12 rounded-lg border border-border-default text-text-secondary hover:bg-bg-hover transition-colors text-sm">
                      Add to Queue
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue */}
      {queue.length > 0 && (
        <section className="border-t border-border-subtle bg-bg-secondary px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] text-accent-red tracking-[0.05em]">YOUTUBE QUEUE</p>
              <span className="bg-accent-red/15 text-accent-red text-xs font-mono px-2 py-0.5 rounded-full">{queue.length}</span>
            </div>
            <button onClick={() => setQueue([])} className="text-xs text-text-tertiary hover:text-text-primary">Clear All</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {queue.map((item, i) => (
              <div key={`${item.id}-${i}`} className="min-w-[280px] bg-bg-primary border border-border-subtle rounded-lg p-3 flex items-center gap-3">
                <img src={item.thumbnail} alt="" className="w-16 h-10 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue font-mono">{item.format}</span>
                    <span className="text-[10px] text-text-tertiary font-mono">{item.quality}</span>
                  </div>
                  <div className="h-1 rounded-full bg-border-subtle mt-1.5 overflow-hidden">
                    <div className="h-full bg-accent-blue rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
                <button onClick={() => removeFromQueue(item.id)} className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-accent-red transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Format Reference */}
      <section className="max-w-[1200px] mx-auto px-6 py-10 border-t border-border-subtle">
        <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mb-4">SUPPORTED FORMATS</p>
        <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2">
          {[
            { icon: Video, label: 'MP4', desc: 'Most compatible', qualities: ['4K', '1080p', '720p'] },
            { icon: Film, label: 'WEBM', desc: 'Web optimized', qualities: ['4K', '1080p'] },
            { icon: Headphones, label: 'MP3', desc: 'Audio compressed', qualities: ['320kbps', '192kbps'] },
            { icon: Music, label: 'FLAC', desc: 'Lossless audio', qualities: ['Hi-Res', 'CD'] },
          ].map(fmt => (
            <div key={fmt.label} className="bg-bg-secondary border border-border-subtle rounded-lg p-4 hover:bg-bg-hover transition-colors">
              <fmt.icon size={24} className="text-accent-orange mb-2" />
              <p className="font-mono text-sm font-medium">{fmt.label}</p>
              <p className="text-xs text-text-secondary mt-0.5">{fmt.desc}</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {fmt.qualities.map(q => (
                  <span key={q} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-primary text-text-tertiary font-mono">{q}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
