import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ChevronDown, ChevronRight, Lock, Unlock, Send } from 'lucide-react';

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
      { method: 'GET', path: '/downloads', desc: 'List all downloads with optional filtering by status.', params: [{ name: 'status', type: 'string', required: false, desc: 'Filter by status' }, { name: 'limit', type: 'number', required: false, desc: 'Max results (1-100)' }] },
      { method: 'POST', path: '/downloads', desc: 'Add a new download by URL.', params: [{ name: 'url', type: 'string', required: true, desc: 'Download URL' }, { name: 'filename', type: 'string', required: false, desc: 'Custom filename' }, { name: 'category', type: 'string', required: false, desc: 'Download category' }] },
      { method: 'GET', path: '/downloads/:id', desc: 'Get details of a specific download.', params: [{ name: 'id', type: 'string', required: true, desc: 'Download ID' }] },
      { method: 'DELETE', path: '/downloads/:id', desc: 'Cancel and remove a download.', params: [{ name: 'id', type: 'string', required: true, desc: 'Download ID' }] },
      { method: 'PATCH', path: '/downloads/:id/pause', desc: 'Pause an active download.', params: [{ name: 'id', type: 'string', required: true, desc: 'Download ID' }] },
      { method: 'PATCH', path: '/downloads/:id/resume', desc: 'Resume a paused download.', params: [{ name: 'id', type: 'string', required: true, desc: 'Download ID' }] },
    ],
  },
  {
    category: 'YouTube',
    items: [
      { method: 'POST', path: '/youtube/search', desc: 'Search YouTube videos.', params: [{ name: 'query', type: 'string', required: true, desc: 'Search query' }, { name: 'limit', type: 'number', required: false, desc: 'Max results' }] },
      { method: 'POST', path: '/youtube/download', desc: 'Download a YouTube video.', params: [{ name: 'videoId', type: 'string', required: true, desc: 'YouTube video ID' }, { name: 'quality', type: 'string', required: false, desc: 'e.g. 1080p, 720p' }, { name: 'format', type: 'string', required: false, desc: 'MP4, WEBM, MKV' }] },
      { method: 'GET', path: '/youtube/formats', desc: 'Get available formats for a video.', params: [{ name: 'videoId', type: 'string', required: true, desc: 'YouTube video ID' }] },
      { method: 'POST', path: '/youtube/convert', desc: 'Extract audio from a YouTube video.', params: [{ name: 'videoId', type: 'string', required: true, desc: 'YouTube video ID' }, { name: 'format', type: 'string', required: false, desc: 'MP3, FLAC, AAC' }, { name: 'bitrate', type: 'number', required: false, desc: '64-320 kbps' }] },
    ],
  },
  {
    category: 'Torrents',
    items: [
      { method: 'GET', path: '/torrents', desc: 'List all torrents.', params: [] },
      { method: 'POST', path: '/torrents/magnet', desc: 'Add a torrent via magnet link.', params: [{ name: 'magnet', type: 'string', required: true, desc: 'Magnet URI' }] },
      { method: 'POST', path: '/torrents/search', desc: 'Search torrents across indexes.', params: [{ name: 'query', type: 'string', required: true, desc: 'Search query' }, { name: 'category', type: 'string', required: false, desc: 'Filter category' }] },
      { method: 'GET', path: '/torrents/:id/peers', desc: 'Get peer information for a torrent.', params: [{ name: 'id', type: 'string', required: true, desc: 'Torrent ID' }] },
      { method: 'DELETE', path: '/torrents/:id', desc: 'Remove a torrent.', params: [{ name: 'id', type: 'string', required: true, desc: 'Torrent ID' }] },
    ],
  },
  {
    category: 'Converter',
    items: [
      { method: 'POST', path: '/convert', desc: 'Start a conversion job.', params: [{ name: 'source', type: 'string', required: true, desc: 'Source file path or URL' }, { name: 'outputFormat', type: 'string', required: true, desc: 'MP3, FLAC, AAC, WAV, M4A' }, { name: 'bitrate', type: 'number', required: false, desc: 'Audio bitrate' }] },
      { method: 'GET', path: '/convert/:id/status', desc: 'Get conversion status.', params: [{ name: 'id', type: 'string', required: true, desc: 'Conversion ID' }] },
      { method: 'GET', path: '/convert/formats', desc: 'List supported formats.', params: [] },
    ],
  },
  {
    category: 'System',
    items: [
      { method: 'GET', path: '/status', desc: 'Get system status.', params: [] },
      { method: 'GET', path: '/stats', desc: 'Get download statistics.', params: [] },
      { method: 'GET', path: '/bandwidth', desc: 'Get bandwidth usage.', params: [] },
      { method: 'POST', path: '/bandwidth/limit', desc: 'Set bandwidth limit.', params: [{ name: 'download', type: 'number', required: true, desc: 'Download limit MB/s' }, { name: 'upload', type: 'number', required: true, desc: 'Upload limit MB/s' }] },
    ],
  },
];

const codeExamples: Record<string, Record<string, string>> = {
  curl: {
    'Download a File': `curl -X POST http://localhost:3001/api/v1/downloads \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/file.zip",
    "filename": "my-file.zip"
  }'`,
    'Search YouTube': `curl -X POST http://localhost:3001/api/v1/youtube/search \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "lofi hip hop"}'`,
    'Add Magnet Link': `curl -X POST http://localhost:3001/api/v1/torrents/magnet \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"magnet": "magnet:?xt=urn:btih:..."}'`,
  },
  javascript: {
    'Download a File': `const response = await fetch('http://localhost:3001/api/v1/downloads', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com/file.zip',
    filename: 'my-file.zip'
  })
});
const data = await response.json();`,
    'Search YouTube': `const response = await fetch('http://localhost:3001/api/v1/youtube/search', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: 'lofi hip hop', limit: 10 })
});
const results = await response.json();`,
    'Add Magnet Link': `const response = await fetch('http://localhost:3001/api/v1/torrents/magnet', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ magnet: 'magnet:?xt=urn:btih:...' })
});`,
  },
  python: {
    'Download a File': `import requests

response = requests.post('http://localhost:3001/api/v1/downloads', 
    headers={'Authorization': 'Bearer YOUR_TOKEN'},
    json={
        'url': 'https://example.com/file.zip',
        'filename': 'my-file.zip'
    }
)
data = response.json()`,
    'Search YouTube': `import requests

response = requests.post('http://localhost:3001/api/v1/youtube/search',
    headers={'Authorization': 'Bearer YOUR_TOKEN'},
    json={'query': 'lofi hip hop', 'limit': 10}
)
results = response.json()`,
    'Add Magnet Link': `import requests

response = requests.post('http://localhost:3001/api/v1/torrents/magnet',
    headers={'Authorization': 'Bearer YOUR_TOKEN'},
    json={'magnet': 'magnet:?xt=urn:btih:...'}
)`,
  },
  go: {
    'Download a File': `package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

func main() {
    payload := map[string]string{
        "url": "https://example.com/file.zip",
        "filename": "my-file.zip",
    }
    body, _ := json.Marshal(payload)
    req, _ := http.NewRequest("POST", "http://localhost:3001/api/v1/downloads", bytes.NewBuffer(body))
    req.Header.Set("Authorization", "Bearer YOUR_TOKEN")
    req.Header.Set("Content-Type", "application/json")
    client := &http.Client{}
    resp, _ := client.Do(req)
}`,
    'Search YouTube': `// Go example for YouTube search
payload := map[string]interface{}{
    "query": "lofi hip hop",
    "limit": 10,
}
body, _ := json.Marshal(payload)
req, _ := http.NewRequest("POST", "http://localhost:3001/api/v1/youtube/search", bytes.NewBuffer(body))
req.Header.Set("Authorization", "Bearer YOUR_TOKEN")`,
    'Add Magnet Link': `// Go example for magnet link
payload := map[string]string{"magnet": "magnet:?xt=urn:btih:..."}
body, _ := json.Marshal(payload)
req, _ := http.NewRequest("POST", "http://localhost:3001/api/v1/torrents/magnet", bytes.NewBuffer(body))
req.Header.Set("Authorization", "Bearer YOUR_TOKEN")`,
  },
  php: {
    'Download a File': `<?php
$ch = curl_init('http://localhost:3001/api/v1/downloads');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'url' => 'https://example.com/file.zip',
    'filename' => 'my-file.zip'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_TOKEN',
    'Content-Type: application/json'
]);
$response = curl_exec($ch);
curl_close($ch);`,
    'Search YouTube': `<?php
$ch = curl_init('http://localhost:3001/api/v1/youtube/search');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'query' => 'lofi hip hop',
    'limit' => 10
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_TOKEN',
    'Content-Type: application/json'
]);
$response = curl_exec($ch);`,
    'Add Magnet Link': `<?php
$ch = curl_init('http://localhost:3001/api/v1/torrents/magnet');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'magnet' => 'magnet:?xt=urn:btih:...'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_TOKEN',
    'Content-Type: application/json'
]);
$response = curl_exec($ch);`,
  },
};

function SyntaxHighlight({ code }: { code: string }) {
  return (
    <pre className="text-xs font-mono leading-relaxed overflow-x-auto p-4">
      {code.split('\n').map((line, i) => (
        <div key={i} className="flex">
          <span className="w-8 text-text-tertiary shrink-0 select-none text-right mr-4">{i + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: highlightLine(line) }} />
        </div>
      ))}
    </pre>
  );
}

function highlightLine(line: string) {
  return line
    .replace(/\b(GET|POST|DELETE|PATCH|curl|import|from|const|let|var|function|return|await|async|class|def|json_encode)\b/g, '<span style="color:#AF52DE">$1</span>')
    .replace(/(['"`])(.*?)(\1)/g, '<span style="color:#32D74B">$1$2$3</span>')
    .replace(/\b(http|https|localhost|api|v1|downloads|youtube|torrents|convert)\b/g, '<span style="color:#0A84FF">$1</span>')
    .replace(/\b(\d+)\b/g, '<span style="color:#FF9500">$1</span>')
    .replace(/(\/\/.*$|#.*$|\/\*.*\*\/)/g, '<span style="color:#5A5A63">$1</span>');
}

export default function ApiDocs() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(endpoints[0].items[0]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(endpoints.map(e => e.category));
  const [langTab, setLangTab] = useState<'curl' | 'javascript' | 'python' | 'go' | 'php'>('curl');
  const [copiedCode, setCopiedCode] = useState(false);
  const [consoleMethod, setConsoleMethod] = useState('GET');
  const [consolePath, setConsolePath] = useState('/downloads');
  const [consoleBody, setConsoleBody] = useState('');
  const [consoleResponse, setConsoleResponse] = useState<any>(null);
  const [useAuth, setUseAuth] = useState(true);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const copyCode = () => {
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const sendRequest = () => {
    setConsoleResponse({
      status: 200,
      time: '45ms',
      size: '1.2KB',
      body: JSON.stringify({
        success: true,
        data: [
          { id: 'dl_001', filename: 'Ubuntu_24.04.iso', status: 'downloading', progress: 45, speed: '12.5 MB/s', size: '5.8 GB' },
          { id: 'dl_002', filename: 'Cyberpunk_Edgerunners_E01.mp4', status: 'completed', progress: 100, speed: '0 MB/s', size: '890 MB' },
        ]
      }, null, 2),
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Left nav */}
      <aside className="w-[280px] shrink-0 bg-bg-secondary border-r border-border-subtle py-4 overflow-y-auto">
        <div className="px-4 mb-4">
          <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em]">ENDPOINTS</p>
        </div>
        {endpoints.map(group => (
          <div key={group.category} className="mb-1">
            <button onClick={() => toggleCategory(group.category)}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              {expandedCategories.includes(group.category) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {group.category}
            </button>
            <AnimatePresence>
              {expandedCategories.includes(group.category) && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  {group.items.map(ep => {
                    const mc = methodColors[ep.method] || methodColors.GET;
                    const isActive = selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
                    return (
                      <button key={ep.path} onClick={() => setSelectedEndpoint(ep)}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-colors ${
                          isActive ? 'bg-bg-hover border-l-[3px]' : 'hover:bg-bg-hover border-l-[3px] border-transparent'
                        }`}
                        style={isActive ? { borderLeftColor: mc.text } : {}}>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: mc.bg, color: mc.text }}>{ep.method}</span>
                        <span className="text-[11px] font-mono text-text-secondary truncate">{ep.path}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </aside>

      {/* Right content */}
      <main className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="px-8 pt-8 pb-6 border-b border-border-subtle">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span className="font-mono text-[10px] px-3 py-1 rounded-full bg-accent-blue/15 text-accent-blue tracking-[0.05em] mb-4 inline-block">REST API v1</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="font-display font-bold text-[clamp(2rem,5vw,4rem)] text-white mb-2">Kelex <span className="text-accent-blue">API</span></motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-text-secondary max-w-[600px] mb-6">Programmatic control over every Kelex feature. Integrate downloads into your apps, scripts, and workflows.</motion.p>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="bg-bg-secondary border border-border-subtle rounded-md px-4 py-3 flex items-center gap-3 max-w-md">
            <span className="font-mono text-[10px] text-text-tertiary tracking-[0.05em]">BASE URL</span>
            <span className="font-mono text-sm text-accent-blue flex-1">http://localhost:3001/api/v1</span>
            <button onClick={copyCode} className="text-text-tertiary hover:text-text-primary transition-colors">
              {copiedCode ? <Check size={14} className="text-accent-cyan" /> : <Copy size={14} />}
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6">
            <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mb-3">AUTHENTICATION</p>
            <div className="bg-bg-secondary border border-border-subtle rounded-md p-4">
              <p className="text-sm text-text-secondary mb-3">All API requests require an Authorization header with your API token.</p>
              <div className="bg-bg-primary border border-border-subtle rounded-md p-3 font-mono text-xs relative">
                <span className="text-accent-violet">Authorization</span>: <span className="text-text-secondary">Bearer </span><span className="text-accent-amber">YOUR_API_TOKEN</span>
                <button className="absolute top-2 right-2 text-text-tertiary hover:text-text-primary"><Copy size={12} /></button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Endpoint Detail */}
        <div className="px-8 py-6">
          <AnimatePresence mode="wait">
            <motion.div key={`${selectedEndpoint.method}-${selectedEndpoint.path}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-mono font-bold px-3 py-1.5 rounded-md" style={{ backgroundColor: methodColors[selectedEndpoint.method]?.bg, color: methodColors[selectedEndpoint.method]?.text }}>
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono text-lg text-text-primary">{selectedEndpoint.path}</span>
              </div>
              <p className="text-sm text-text-secondary mb-5">{selectedEndpoint.desc}</p>

              {selectedEndpoint.params.length > 0 && (
                <div className="mb-6">
                  <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mb-3">PARAMETERS</p>
                  <div className="bg-bg-secondary border border-border-subtle rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-bg-primary text-left text-[10px] text-text-tertiary font-mono">
                          <th className="px-4 py-2">NAME</th><th className="px-4 py-2">TYPE</th><th className="px-4 py-2">REQUIRED</th><th className="px-4 py-2">DESCRIPTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEndpoint.params.map(p => (
                          <tr key={p.name} className="border-t border-[#111]">
                            <td className="px-4 py-2.5 font-mono text-xs text-accent-blue">{p.name}</td>
                            <td className="px-4 py-2.5 text-xs text-text-secondary">{p.type}</td>
                            <td className="px-4 py-2.5">{p.required ? <span className="text-[10px] text-accent-red">Required</span> : <span className="text-[10px] text-text-tertiary">Optional</span>}</td>
                            <td className="px-4 py-2.5 text-xs text-text-secondary">{p.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Request/Response */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mb-2">REQUEST BODY</p>
                  <div className="bg-bg-primary border border-border-subtle rounded-md overflow-hidden">
                    <SyntaxHighlight code={`{\n  "url": "https://example.com/file.zip",\n  "filename": "my-file.zip",\n  "category": "Software"\n}`} />
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mb-2">RESPONSE (200 OK)</p>
                  <div className="bg-bg-primary border border-border-subtle rounded-md overflow-hidden">
                    <SyntaxHighlight code={`{\n  "id": "dl_001",\n  "filename": "file.zip",\n  "status": "queued",\n  "progress": 0,\n  "createdAt": "2024-01-15T10:30:00Z"\n}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Code Examples */}
          <div className="border-t border-border-subtle pt-6 mb-8">
            <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em] mb-4">CODE EXAMPLES</p>
            <div className="flex border-b border-border-subtle mb-4">
              {(['curl', 'javascript', 'python', 'go', 'php'] as const).map(lang => (
                <button key={lang} onClick={() => setLangTab(lang)}
                  className={`px-4 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${langTab === lang ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
                  {lang === 'javascript' ? 'JavaScript' : lang}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {Object.entries(codeExamples[langTab]).map(([title, code]) => (
                <div key={title} className="bg-bg-primary border border-border-subtle rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-secondary">
                    <span className="text-xs text-text-secondary font-medium">{title}</span>
                    <button onClick={copyCode} className="text-text-tertiary hover:text-text-primary transition-colors">
                      {copiedCode ? <Check size={14} className="text-accent-cyan" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <SyntaxHighlight code={code} />
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Console */}
          <div className="border-t border-border-subtle pt-6 pb-10">
            <div className="flex items-center gap-2 mb-4">
              <p className="font-mono text-[10px] text-text-tertiary tracking-[0.05em]">TRY IT</p>
              <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
            </div>
            <div className="bg-bg-primary border border-border-subtle rounded-xl overflow-hidden">
              {/* Console top bar */}
              <div className="bg-[#0F0F0F] px-4 py-3 flex items-center gap-3 border-b border-border-subtle">
                <select value={consoleMethod} onChange={e => setConsoleMethod(e.target.value)}
                  className="bg-bg-primary border border-border-subtle rounded-md px-2 py-1.5 text-xs font-mono outline-none text-text-primary">
                  <option>GET</option><option>POST</option><option>DELETE</option><option>PATCH</option>
                </select>
                <div className="flex items-center gap-1 px-2 py-1.5 bg-bg-primary border border-border-subtle rounded-md flex-1">
                  <span className="text-xs text-text-tertiary font-mono">/api/v1</span>
                  <input type="text" value={consolePath} onChange={e => setConsolePath(e.target.value)}
                    className="bg-transparent flex-1 text-xs font-mono text-text-primary outline-none" />
                </div>
                <button onClick={sendRequest}
                  className="bg-accent-blue hover:bg-blue-600 text-white text-xs font-medium px-4 h-8 rounded-md flex items-center gap-1.5 transition-colors">
                  <Send size={12} /> SEND
                </button>
                <button onClick={() => setUseAuth(!useAuth)} className={`p-2 rounded-md transition-colors ${useAuth ? 'text-accent-violet' : 'text-text-tertiary'}`}>
                  {useAuth ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
              </div>
              {/* Body input */}
              {(consoleMethod === 'POST' || consoleMethod === 'PATCH') && (
                <div className="border-b border-border-subtle">
                  <div className="px-4 py-2 bg-[#0F0F0F]">
                    <p className="text-[10px] text-text-tertiary font-mono">REQUEST BODY</p>
                  </div>
                  <textarea value={consoleBody} onChange={e => setConsoleBody(e.target.value)}
                    placeholder={`{ "url": "https://..." }`}
                    className="w-full h-24 bg-bg-primary text-xs font-mono text-text-primary p-3 outline-none resize-none border-0" />
                </div>
              )}
              {/* Response */}
              {consoleResponse && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-accent-cyan/30">
                  <div className="px-4 py-2 flex items-center gap-4 bg-[#0F0F0F]">
                    <span className="text-xs font-mono text-accent-cyan">200 OK</span>
                    <span className="text-[10px] text-text-tertiary font-mono">{consoleResponse.time}</span>
                    <span className="text-[10px] text-text-tertiary font-mono">{consoleResponse.size}</span>
                  </div>
                  <SyntaxHighlight code={consoleResponse.body} />
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
