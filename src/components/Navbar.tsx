import { Link, useLocation } from 'react-router-dom';
import {
  Home, Download, PlaySquare, Network, AudioLines, Puzzle,
  Code, Settings, Moon, Sun, Shield, ShieldCheck, Bell, Plus, FolderOpen
} from 'lucide-react';
import { useDownloads } from '@/context/DownloadContext';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Download, label: 'Downloads', path: '/downloads' },
  { icon: PlaySquare, label: 'YouTube', path: '/youtube' },
  { icon: Network, label: 'Torrents', path: '/torrents' },
  { icon: AudioLines, label: 'Convert', path: '/converter' },
  { icon: Puzzle, label: 'Extension', path: '/extension' },
  { icon: Code, label: 'API', path: '/api-docs' },
  { icon: FolderOpen, label: 'Files', path: '/files' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Navbar() {
  const { activeCount, totalSpeed, torEnabled, toggleTor, theme, toggleTheme } = useDownloads();
  const location = useLocation();

  return (
    <nav className="fixed top-14 left-0 right-0 h-12 bg-bg-secondary border-b border-border-subtle flex items-center px-3 z-40 gap-2 overflow-x-auto scrollbar-hide">
      {/* Left: Logo + divider */}
      <div className="flex items-center gap-2 shrink-0">
        <Link to="/" className="font-display font-bold text-sm tracking-tight">
          KEL<span className="text-accent-blue">E</span><span className="text-accent-blue">X</span>
        </Link>
        <span className="w-px h-4 bg-border-subtle" />
      </div>

      {/* Tab items */}
      <div className="flex items-center gap-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          const isDownloadsTab = item.path === '/downloads';

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap
                ${active
                  ? 'bg-bg-hover text-text-primary glow-blue'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
            >
              {isDownloadsTab && activeCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse shrink-0" />
              )}
              <Icon size={16} className="shrink-0" />
              <span>{item.label}</span>
              {active && (
                <span className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-accent-blue" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: New Download button + utilities */}
      <div className="flex items-center gap-2 shrink-0">
        <button className="flex items-center gap-1 h-7 px-3 rounded-md bg-accent-blue hover:bg-blue-600 text-white text-xs font-medium transition-colors">
          <Plus size={14} />
          <span>New</span>
        </button>

        <span className="w-px h-4 bg-border-subtle mx-1" />

        {totalSpeed > 0 && (
          <span className="font-mono text-xs text-accent-amber whitespace-nowrap">
            {totalSpeed < 1 ? `${(totalSpeed * 1024).toFixed(0)} KB/s` : `${totalSpeed.toFixed(1)} MB/s`}
          </span>
        )}

        <button
          onClick={toggleTor}
          className={`relative p-1.5 rounded-md transition-all ${torEnabled ? 'text-accent-violet glow-violet' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}
          title="Toggle Tor"
        >
          {torEnabled ? <ShieldCheck size={16} /> : <Shield size={16} />}
        </button>

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="relative p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
          <Bell size={16} />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-accent-red" />
        </button>
      </div>
    </nav>
  );
}
