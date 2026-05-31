import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Puzzle, ScanEye, Cookie, MousePointerClick,
  ChevronDown, ChevronUp,
  Chrome, Globe, Monitor, X
} from 'lucide-react';

const browsers = [
  { name: 'Chrome', icon: Chrome, version: '2.1.0', size: '1.2MB', color: '#4285F4' },
  { name: 'Firefox', icon: Globe, version: '2.1.0', size: '1.4MB', color: '#FF7139' },
  { name: 'Edge', icon: Monitor, version: '2.1.0', size: '1.1MB', color: '#0078D7' },
];

const features = [
  { icon: ScanEye, title: 'Auto-Detect Media', desc: 'The extension automatically scans every webpage for downloadable videos, audio files, and media. A floating download button appears on any video player.', color: '#0A84FF' },
  { icon: Cookie, title: 'Authenticated Downloads', desc: 'Sites that require login? No problem. The extension forwards your browser cookies to Kelex, enabling downloads from protected content.', color: '#FF9500' },
  { icon: MousePointerClick, title: 'Floating Controls', desc: 'A sleek, non-intrusive download button appears on every video player. Customizable position, auto-hide when not needed.', color: '#32D74B' },
];

const steps = [
  { num: '01', title: 'Install the Extension', desc: 'Click the install button for your browser above. The extension will be added to your browser in seconds.' },
  { num: '02', title: 'Connect to Kelex', desc: 'Open the extension popup and enter your Kelex server address. The extension will connect automatically.' },
  { num: '03', title: 'Browse Any Website', desc: 'Go to any website with videos or downloadable content. The extension works in the background.' },
  { num: '04', title: 'Click to Download', desc: 'See a download button on a video? Click it. Want to grab a file? Right-click and select Download with Kelex.' },
];

const faqs = [
  { q: 'Which browsers are supported?', a: 'Kelex extension supports Google Chrome, Mozilla Firefox, Microsoft Edge, and most Chromium-based browsers (Brave, Opera, Vivaldi). Safari support is experimental.' },
  { q: 'Does it work on all websites?', a: 'The extension detects media on most websites with video or audio content. Some sites with heavy DRM protection may limit detection.' },
  { q: 'How does the cookie integration work?', a: "When you enable 'Send cookies with download' in settings, the extension captures your browser's cookies for the current site and includes them in the download request." },
  { q: 'Is my data safe?', a: 'Yes. Cookies are only sent to your Kelex instance (not to any third party). The extension does not track your browsing history or collect any personal data.' },
  { q: 'Can I customize the floating button?', a: 'Absolutely. Go to Settings → Browser Extension to change the button position, enable/disable auto-detection, and configure which sites show the button.' },
  { q: 'The extension isn\'t detecting videos. What should I do?', a: 'Try refreshing the page. Some sites load videos dynamically after page load. Check that auto-detection is enabled in Settings.' },
  { q: 'How do I update the extension?', a: 'Chrome and Edge extensions update automatically through the browser store. For Firefox, updates are applied when you restart the browser.' },
];

const screenshots = [
  { src: '/extension-screenshot-1.png', caption: 'Floating download button on video players' },
  { src: '/extension-screenshot-2.png', caption: 'Extension popup with detected media list' },
  { src: '/extension-screenshot-1.png', caption: 'Cookie management and configuration' },
];

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }} className={className}>
      {children}
    </motion.div>
  );
}

export default function Extension() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[50vh] flex flex-col items-center justify-center px-6 text-center"
        style={{ background: 'linear-gradient(135deg, #050505 0%, #0A0A0A 50%, #0F0F0A 100%)' }}>
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.03] bg-accent-amber animate-drift" style={{ filter: 'blur(100px)', top: '20%', left: '50%', transform: 'translateX(-50%)' }} />
        <div className="relative">
          <div className="absolute inset-0 rounded-full border border-dashed border-accent-amber/20 animate-[spin_20s_linear_infinite]" style={{ width: 80, height: 80, top: -12, left: -12 }} />
          <Puzzle size={56} className="text-accent-amber mb-5" />
        </div>
        <FadeIn>
          <span className="font-mono text-[10px] px-3 py-1 rounded-full bg-accent-amber/15 text-accent-amber tracking-[0.05em] mb-5 inline-block">BROWSER TOOL</span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="font-display font-bold text-[clamp(2rem,5vw,4rem)] text-white mb-3">One-Click <span className="text-accent-amber">Downloads</span></h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="text-text-secondary text-lg max-w-[560px] mx-auto mb-10">The Kelex extension adds download superpowers to your browser. Grab videos, media, and files from any site.</p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="flex gap-4 flex-wrap justify-center">
            {browsers.map((b, i) => (
              <motion.button key={b.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                className="flex items-center gap-3 bg-bg-hover border border-border-default hover:border-accent-amber/40 h-[52px] px-6 rounded-full transition-all hover:-translate-y-0.5">
                <b.icon size={20} style={{ color: b.color }} />
                <span className="text-sm text-white">Add to {b.name}</span>
              </motion.button>
            ))}
          </div>
        </FadeIn>
        <FadeIn delay={0.5}>
          <p className="text-text-tertiary text-xs mt-4">v2.1.0 &middot; Free &middot; No account required</p>
        </FadeIn>
      </section>

      {/* Features */}
      <section className="max-w-[1200px] mx-auto px-6 py-20">
        <FadeIn>
          <p className="font-mono text-xs text-accent-amber tracking-[0.1em] mb-8">WHAT IT DOES</p>
        </FadeIn>
        <div className="grid grid-cols-3 gap-6 max-md:grid-cols-1">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.1}>
              <div className="bg-bg-secondary border border-border-subtle rounded-lg p-8 hover:-translate-y-1 transition-all duration-300 hover:border-amber-900/30">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: `${f.color}15` }}>
                  <f.icon size={22} style={{ color: f.color }} />
                </div>
                <h3 className="font-display font-semibold text-lg mb-3">{f.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-[900px] mx-auto px-6 pb-20">
        <FadeIn className="text-center mb-10">
          <p className="font-mono text-xs text-accent-amber tracking-[0.1em] mb-3">SETUP GUIDE</p>
          <h2 className="font-display font-semibold text-[clamp(1.5rem,3vw,2.5rem)]">Get started in 30 seconds</h2>
        </FadeIn>
        <div className="relative">
          {/* Vertical dashed line */}
          <div className="absolute left-[39px] top-0 bottom-0 w-0.5 border-l-2 border-dashed border-border-default" />
          {steps.map((step, i) => (
            <FadeIn key={step.num} delay={i * 0.15}>
              <div className="flex gap-8 py-6 relative">
                <div className="w-20 shrink-0 text-right">
                  <span className="font-display font-bold text-[2.5rem] text-accent-amber leading-none">{step.num}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-text-secondary text-sm">{step.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Browser Downloads */}
      <section className="max-w-[800px] mx-auto px-6 py-20 border-t border-border-subtle">
        <FadeIn className="text-center mb-8">
          <p className="font-mono text-xs text-text-tertiary tracking-[0.1em] mb-3">INSTALL</p>
          <h2 className="font-display font-semibold text-2xl">Choose your browser</h2>
        </FadeIn>
        <div className="flex flex-col gap-4">
          {browsers.map((b, i) => (
            <FadeIn key={b.name} delay={i * 0.1}>
              <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 flex items-center gap-4 hover:border-blue-500/20 transition-colors">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${b.color}15` }}>
                  <b.icon size={24} style={{ color: b.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary">{b.name}</h3>
                  <p className="text-xs text-text-tertiary font-mono">Version {b.version} &middot; {b.size}</p>
                </div>
                <button className="bg-accent-blue hover:bg-blue-600 text-white text-sm font-medium px-5 h-9 rounded-md transition-colors">
                  Install
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
        <p className="text-center text-xs text-text-tertiary mt-6">
          Supports Chromium-based browsers, Firefox, and Safari (experimental)
        </p>
      </section>

      {/* Screenshots */}
      <section className="max-w-[1000px] mx-auto px-6 py-20 border-t border-border-subtle">
        <FadeIn className="text-center mb-8">
          <p className="font-mono text-xs text-text-tertiary tracking-[0.1em] mb-3">IN ACTION</p>
          <h2 className="font-display font-semibold text-2xl">See it in action</h2>
        </FadeIn>
        <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
          {screenshots.map((s, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="bg-bg-secondary border border-border-subtle rounded-lg overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all"
                onClick={() => setLightboxImg(s.src)}>
                <div className="aspect-[16/10] overflow-hidden">
                  <img src={s.src} alt={s.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <p className="text-xs text-text-secondary p-3">{s.caption}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[800px] mx-auto px-6 py-20 border-t border-border-subtle">
        <FadeIn className="text-center mb-8">
          <p className="font-mono text-xs text-text-tertiary tracking-[0.1em] mb-3">SUPPORT</p>
          <h2 className="font-display font-semibold text-2xl">Frequently asked questions</h2>
        </FadeIn>
        <div className="flex flex-col gap-2">
          {faqs.map((faq, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <div className="bg-bg-secondary border border-border-subtle rounded-md overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-bg-hover transition-colors">
                  <span className="text-sm text-text-primary">{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={16} className="text-text-tertiary shrink-0" /> : <ChevronDown size={16} className="text-text-tertiary shrink-0" />}
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm text-text-secondary leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setLightboxImg(null)}>
            <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              src={lightboxImg} alt="" className="max-w-[90vw] max-h-[80vh] rounded-lg object-contain" />
            <button className="absolute top-4 right-4 p-2 rounded-full bg-bg-secondary/80 text-text-primary" onClick={() => setLightboxImg(null)}>
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
