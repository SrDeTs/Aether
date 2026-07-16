import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Readable } from "stream";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware with limit to handle standard JSON payloads
  app.use(express.json({ limit: "10mb" }));

  // Jellyfin Proxy Endpoint to fix CORS and Mixed Content (HTTP on HTTPS)
  app.all("/api/jellyfin-proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    try {
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        return res.status(400).json({ error: "Invalid URL protocol" });
      }

      const headers: Record<string, string> = {};

      // Forward relevant headers from the client
      const allowedHeaders = [
        "x-emby-token",
        "x-emby-authorization",
        "authorization",
        "accept",
        "content-type",
        "range"
      ];

      for (const header of allowedHeaders) {
        if (req.headers[header]) {
          headers[header] = req.headers[header] as string;
        }
      }

      const options: RequestInit = {
        method: req.method,
        headers,
      };

      if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
        options.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, options);

      // Copy response status
      res.status(response.status);

      // Forward response headers
      const headersToForward = [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "cache-control"
      ];

      for (const header of headersToForward) {
        const val = response.headers.get(header);
        if (val) {
          res.setHeader(header, val);
        }
      }

      if (response.body) {
        const readable = Readable.fromWeb(response.body as any);
        readable.pipe(res);
      } else {
        res.end();
      }
    } catch (err: any) {
      console.error("Proxy error for URL:", targetUrl, err.message);
      res.status(500).json({ error: "Proxy request failed", details: err.message });
    }
  });

  // Healthcheck endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
