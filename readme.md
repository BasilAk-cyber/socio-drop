# Media Downloader API

A lightweight Express API that downloads and streams videos from supported sites (YouTube, X/Twitter, and anything else [yt-dlp](https://github.com/yt-dlp/yt-dlp) supports) directly to the client — no temporary files, no disk writes on the server.

## How it works

Requests are handled by spawning [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) as a child process. The video is never saved to disk on the server — `yt-dlp` streams the video bytes straight to `stdout`, which is piped directly into the HTTP response as it arrives.

```
source site → yt-dlp (stdout) → Express (pipe) → HTTP response → client
```

## Requirements

- **Node.js** v18+
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** installed and available on your system `PATH`
  - Verify with: `yt-dlp --version`
  - Install via `pip install yt-dlp`, `winget install yt-dlp` (Windows), or download the standalone binary from the [releases page](https://github.com/yt-dlp/yt-dlp/releases/latest)

## Setup

```bash
npm install
npm run dev
```

The server starts on `PORT` (env var) or `3000` by default.

## Endpoints

### `GET /health`

Health check.

**Response**
```json
{ "status": "ok" }
```

### `GET /download`

Downloads and streams a video from a given URL.

**Query parameters**

| Param | Required | Description |
|-------|----------|--------------|
| `url` | Yes | The URL of the video to download (any site supported by yt-dlp) |

**Example**
```bash
curl -o video.mp4 "http://localhost:3000/download?url=https://x.com/username/status/123456789"
```
```browser
http://localhost:3000/download?url=https://x.com/username/status/123456789
```

**Response**
- `200 OK` — streams the video as `application/octet-stream`, with `Content-Disposition: attachment; filename="<video title>.mp4"`
- `400 Bad Request` — missing `url` query parameter
- `500 Internal Server Error` — yt-dlp failed to resolve the video info, or wasn't found on the system

## Error handling

- Failed yt-dlp spawns (e.g. not installed) are caught and return a `500` rather than crashing the server.
- If the video stream fails *after* headers have already been sent to the client, the connection is aborted (`res.destroy()`) rather than attempting to send a second, invalid response.
- Client disconnects (`req.on("close")`) kill the in-progress yt-dlp process to avoid orphaned downloads.