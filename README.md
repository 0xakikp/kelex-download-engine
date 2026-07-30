# Kelex Download Engine

A terminal-first download manager for macOS, Windows, and Linux. Download anything — HTTP, HTTPS, YouTube, torrents, magnets — from the command line.

## Features

- **HTTP/HTTPS downloads** — Multi-threaded with resume support
- **YouTube downloads** — Format selection, audio/video extraction
- **Torrents & magnets** — Via aria2c backend
- **Video conversion** — MP4, MP3, WebM, AVI, MKV, MOV, FLAC, WAV, AAC, OGG, M4A
- **Live dashboard** — `kelex` opens a real-time dashboard (active downloads, bandwidth graph, torrent seeds/leechers)
- **Styled CLI** — ASCII banner, gradient headers, boxed panels, progress bars, emojis
- **Browser cookies** — Use `--cookies-from-browser chrome|firefox|safari|edge|brave` for private/protected downloads
- **One-click open** — Open downloaded files or their folders straight from the terminal
- **Exact errors** — Full backend error messages, with `--debug` for stack traces
- **Clipboard monitoring** — Auto-detects URLs and adds to queue
- **Native notifications** — OS-level alerts when downloads complete
- **Deep links** — `kelex://<url>` protocol support
- **File browser** — Browse, download, delete completed files

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Fastify + TypeScript + yt-dlp + aria2c + ffmpeg |
| CLI | Node.js + Commander + Chalk + Ora |
| Real-time | WebSocket progress feed |

## Quick Start

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Build backend & CLI
npm run build

# Run from project directory
./kelex

# Or make it globally available
npm link
kelex
```

## Usage

### Dashboard + command shell (default)

```bash
./kelex
```

Running `kelex` with no arguments opens a split-screen view:

- **Top half:** live dashboard with downloads, stats, and bandwidth graph.
- **Bottom half:** boxed command prompt where you can type commands.

```text
Live Dashboard
📁 ~/kelex-downloads
⬇️ Active 1  ⏸ Paused 0  ⏳ Queued 0  ✅ Completed 0  ❌ Failed 0  📦 Total 1
⚡ 12.5 MB/s ▂▄▆█▇▅▃▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
⬇️ example_video.mp4
   ████████████████░░░░░░░░░░░░ 53.2%  11.3 MB/s  1.2 GB
   DOWNLOADING · abc123 · 🌱 8 / 🧲 3

Type commands below · Ctrl+C to exit
╭────────────────────────────────────────────────────────────────────────────╮
│ kelex ❯                                                                    │
╰────────────────────────────────────────────────────────────────────────────╯
```

Type commands and press Enter:

```text
kelex ❯ download "https://example.com/file.zip"
kelex ❯ list
kelex ❯ pause <id>
kelex ❯ quit
```

### Dedicated interactive shell

```bash
./kelex repl
```

Enter a full-screen, boxed, colorful REPL with command history (↑/↓) when you want more space for command output.

### Full-screen dashboard

```bash
./kelex status
```

Opens the live dashboard across the whole terminal. Press `Ctrl+C` to exit.

### One-shot commands

```bash
./kelex download "https://example.com/file.zip"
./kelex list
./kelex status
./kelex stats
./kelex --debug download "not-a-valid-url"

# Private/protected downloads (YouTube, members-only, etc.)
./kelex download "https://youtube.com/watch?v=..." --cookies-from-browser chrome
./kelex youtube download "https://youtube.com/watch?v=..." --cookies-from-browser firefox

# Open downloaded files / folders
./kelex open <id>
./kelex open-dir [id]
```

## Available commands

```text
kelex                         # Open live dashboard (default)
kelex repl                    # Open interactive command shell
kelex download <url>          # Add a new download
kelex list                    # List all downloads (shows download directory)
kelex active                  # List active downloads
kelex status                  # Live status dashboard
kelex info <id>               # Show download details and saved path
kelex config                  # Show configuration and download directory
kelex open <id>               # Open a downloaded file in the default app
kelex open-dir [id]           # Open the download directory (or a download's folder)
kelex pause <id>              # Pause a download
kelex resume <id>             # Resume a download
kelex cancel / stop <id>      # Cancel / stop a download
kelex retry <id>              # Retry a failed download
kelex remove / rm / delete    # Remove / delete a download
kelex youtube info <url>      # Show YouTube video info
kelex youtube search <query>  # Search YouTube
kelex youtube download <url>  # Add a YouTube download
kelex torrent <url>           # Add a torrent or magnet link
kelex files                   # List downloaded files
kelex file-delete <name>      # Delete a downloaded file
kelex stats                   # Show download statistics
kelex watch                   # Watch live progress
kelex server start            # Start backend server
kelex server stop             # Stop backend server
kelex help                    # Show help
```

## Global install

After building, run:

```bash
npm link
```

Then you can use `kelex` from anywhere.

## Options

```text
-p, --port <port>    Backend port (default: 3001)
-h, --host <host>    Backend host (default: 127.0.0.1)
-d, --debug          Show debug output and stack traces
-V, --version        Show version
```

## Pause, resume, and crash recovery

Kelex persists the full download queue to disk (`~/kelex-downloads/.kelex/state.json`). This means:

- **Pause / resume** works even if the app is closed or crashes.
- Downloads that were active when the backend stopped are restored as **paused** and can be resumed.
- HTTP and torrent downloads resume from where they left off thanks to `aria2c` control files.
- YouTube downloads resume from the partial file when possible.

```bash
./kelex pause <id>
./kelex resume <id>
./kelex retry <id>      # retry a failed download from its last progress
```

## Stop and delete

```bash
./kelex cancel <id>     # stop a running download (keeps partial file for retry)
./kelex stop <id>       # alias for cancel
./kelex remove <id>     # remove the download record and delete the file
./kelex rm <id>         # alias for remove
./kelex delete <id>     # alias for remove
```

## Backend server

The CLI automatically starts the backend on first use and keeps it running across commands. You can also manage it manually:

```bash
npm run start   # Start backend server
npm run dev     # Start backend in watch mode
npm run cli -- server stop
```

The backend API runs on `http://localhost:3001` by default.

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
| GET | `/api/v1/youtube/search?q=` | YouTube search |
| POST | `/api/v1/convert` | Convert video/audio |
| GET | `/api/v1/files/` | List downloaded files |
| GET | `/api/v1/files/download/:name` | Download a file |
| DELETE | `/api/v1/files/:name` | Delete a file |
| WS | `/ws/progress` | Real-time progress |

## Debugging

Run any command with `--debug` to see:

- Backend startup logs
- HTTP requests and responses
- Full stack traces on errors

```bash
./kelex --debug download "https://example.com/file.zip"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend API port |
| `DOWNLOAD_DIR` | `~/kelex-downloads` | Download storage path |
| `NODE_ENV` | `development` | Runtime environment |
| `KELEX_DEFAULT_BROWSER` | — | Default browser for `--cookies-from-browser` (e.g. `chrome`, `firefox`, `safari`, `edge`, `brave`) |
| `MAX_CONCURRENT` | `5` | Maximum simultaneous downloads |

## License

MIT — House of Aki Kp
