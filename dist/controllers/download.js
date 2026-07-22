import { spawn } from 'node:child_process';
function getFilename(url) {
    return new Promise((resolve, reject) => {
        const child = spawn("yt-dlp", ["--print", "%(title)s.%(ext)s", url]);
        let out = "";
        let errOut = "";
        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (errOut += d)); // <-- add this
        child.on("close", (code) => code === 0
            ? resolve(out.trim())
            : reject(new Error(errOut || `yt-dlp exited with code ${code}`)) // <-- use errOut here
        );
        child.on("error", reject);
    });
}
function sanitizeFilename(name) {
    return name
        .replace(/[^\x20-\x7E]/g, "") // strip non-ASCII (emoji, accents, etc.)
        .replace(/["\r\n]/g, "") // strip quotes and line breaks
        .trim() || "download.mp4"; // fallback if everything got stripped
}
function isNoVideoError(message) {
    return /no video could be found|no media found|unsupported url/i.test(message);
}
export const download = async (req, res) => {
    try {
        const url = req.query.url;
        if (!url)
            return res.status(400).json({ error: "Missing url" });
        let sanitizeNAme;
        try {
            const rawFilename = await getFilename(url);
            sanitizeNAme = sanitizeFilename(rawFilename);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Filename lookup failed:", message);
            console.error("RAW ERROR MESSAGE:", message);
            if (isNoVideoError(message)) {
                return res.status(400).json({ error: "This post doesn't contain a video" });
            }
            return res.status(500).json({ error: "Could not resolve video info" });
        }
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${sanitizeNAme}"`);
        const child = spawn("yt-dlp", [
            "-f", "best[ext=mp4]/best",
            "-o", "-",
            url,
        ]);
        child.stdout.pipe(res);
        child.stderr.on("data", (d) => console.error("yt-dlp:", d.toString()));
        child.on('error', (err) => {
            console.error('yt-dlp spawn failed:', err.message);
            if (!res.headersSent) {
                res.status(500).json({ error: "yt-dlp not found or failed to start" });
            }
            else {
                res.destroy(); // headers/data already sent, can't send JSON now — just end the connection
            }
        });
        child.on("close", (code) => {
            if (code !== 0) {
                console.error(`yt-dlp (download) exited with code ${code}`);
            }
            if (!res.writableEnded) {
                res.end();
            }
        });
        req.on("close", () => child.kill());
    }
    catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ message: "Server Error" });
        }
    }
};
