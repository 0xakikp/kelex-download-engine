# Kelex Download Engine

A universal download manager for Windows, macOS, and Linux. Download anything — HTTP, YouTube, torrents, magnets — with a native desktop UI and embedded API backend.

## Features

- **HTTP/HTTPS downloads** — Multi-threaded with resume support
- **YouTube downloads** — Format selection, audio/video extraction
- **Torrents & magnets** — Via aria2c backend
- **Video conversion** — MP4, MP3, WebM, AVI, MKV, MOV, FLAC, WAV, AAC, OGG, M4A
- **Clipboard monitoring** — Auto-detects URLs and adds to queue
- **Drag & drop** — Drop URLs or torrent files onto the app
- **Native notifications** — OS-level alerts when downloads complete
- **Deep links** — `kelex://<url>` protocol support
- **Auto-updater** — Electron-updater with GitHub releases
- **Dark/light mode** — Theme persistence
- **File browser** — Browse, download, delete completed files

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS + Framer Motion |
| Backend | Fastify + TypeScript + yt-dlp + aria2c + ffmpeg |
| Desktop | Electron 33 + electron-builder |
| Packaging | DMG (mac), NSIS (win), AppImage (linux) |

## Quick Start (Development)

```bash
# Clone
git clone https://github.com/0xakikp/kelex-download-engine.git
cd kelex-download-engine

# Install dependencies
npm install
cd backend && npm install && cd ..

# Dev mode (frontend + backend auto-start)
npm run electron:dev
```

## Build for Distribution

```bash
# macOS (.dmg + .zip, x64 + arm64)
npm run electron:build-mac

# Windows (.exe installer, x64)
npm run electron:build-win

# Linux (.AppImage, x64)
npm run electron:build-linux

# All platforms at once
npm run electron:build-all
```

Output goes to `release/`.

## Architecture

```
┌─────────────────────────────────────────┐
│  Electron Main Process                  │
│  ├── Starts Fastify backend (port 3001) │
│  ├── System tray + native menus         │
│  ├── Clipboard watcher                  │
│  ├── Protocol handler (kelex://)        │
│  └── Auto-updater                       │
├─────────────────────────────────────────┤
│  Renderer Process (Chromium)            │
│  ├── React UI (HashRouter)              │
│  ├── WebSocket real-time progress       │
│  └── IPC via preload.js               │
├─────────────────────────────────────────┤
│  Fastify Backend (embedded)           │
│  ├── /api/v1/downloads (HTTP/YouTube)   │
│  ├── /api/v1/torrents (magnet/torrent)  │
│  ├── /api/v1/convert (ffmpeg)           │
│  ├── /api/v1/files (file browser)       │
│  └── /ws/progress (WebSocket)           │
└─────────────────────────────────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/downloads` | Start download |
| GET | `/api/v1/downloads` | List all downloads |
| GET | `/api/v1/downloads/stats` | Download statistics |
| POST | `/api/v1/downloads/:id/pause` | Pause download |
| POST | `/api/v1/downloads/:id/resume` | Resume download |
| POST | `/api/v1/downloads/:id/cancel` | Cancel download |
| POST | `/api/v1/downloads/:id/retry` | Retry failed download |
| DELETE | `/api/v1/downloads/:id` | Remove download |
| POST | `/api/v1/torrents/add` | Add magnet/torrent |
| GET | `/api/v1/youtube/info?url=` | YouTube video info |
| POST | `/api/v1/convert` | Convert video/audio |
| GET | `/api/v1/files/` | List downloaded files |
| GET | `/api/v1/files/download/:name` | Download a file |
| DELETE | `/api/v1/files/:name` | Delete a file |
| WS | `/ws/progress` | Real-time progress |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + N` | New download |
| `Cmd/Ctrl + V` | Paste URL from clipboard |
| `Cmd/Ctrl + 1` | Go to Downloads |
| `Cmd/Ctrl + 2` | Go to YouTube |
| `Cmd/Ctrl + 3` | Go to Torrents |
| `Cmd/Ctrl + 4` | Go to Files |
| `Cmd/Ctrl + ,` | Open Settings |
| `Cmd/Ctrl + Q` | Quit |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend API port |
| `DOWNLOAD_DIR` | `userData/downloads` | Download storage path |
| `NODE_ENV` | `production` | Runtime environment |

## License

MIT — House of Aki Kp
