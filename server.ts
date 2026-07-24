import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Readable } from "stream";
import { lookup } from "dns/promises";

async function startServer() {
  const app = express();
  const PORT = 5173;

  // Use JSON middleware with limit to handle standard JSON payloads
  app.use(express.json({ limit: "10mb" }));

  // ---- Security: basic SSRF protection for the Jellyfin proxy ----
  // Blocks requests to loopback, link-local, private networks unless explicitly
  // allowed via the JELLYFIN_ALLOWED_HOSTS env var (comma-separated hostnames/IPs).
  // In development (non-production), private/LAN hosts are allowed by default
  // because the proxy exists precisely to reach a self-hosted Jellyfin server.
  const isProduction = process.env.NODE_ENV === "production";
  const ALLOWED_HOSTS = new Set(
    (process.env.JELLYFIN_ALLOWED_HOSTS || "").split(",").map((h) => h.trim()).filter(Boolean),
  );

  // Cache of host -> isPrivate, resolved on first request to that host
  const hostPrivacyCache = new Map<string, boolean>();

  const isIpPrivate = (ip: string): boolean => {
    // IPv4
    const v4 = ip.split(".").map((n) => parseInt(n, 10));
    if (v4.length === 4 && v4.every((n) => n >= 0 && n <= 255)) {
      if (v4[0] === 10) return true; // 10.0.0.0/8
      if (v4[0] === 127) return true; // 127.0.0.0/8 loopback
      if (v4[0] === 172 && v4[1] >= 16 && v4[1] <= 31) return true; // 172.16.0.0/12
      if (v4[0] === 192 && v4[1] === 168) return true; // 192.168.0.0/16
      if (v4[0] === 169 && v4[1] === 254) return true; // 169.254.0.0/16 link-local
      if (v4[0] === 0) return true; // 0.0.0.0/8
      if (v4[0] === 100 && v4[1] >= 64 && v4[1] <= 127) return true; // CGNAT 100.64.0.0/10
      return false;
    }
    // IPv6
    if (ip === "::1" || ip === "::") return true; // loopback / unspecified
    if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // unique local
    if (ip.startsWith("fe80")) return true; // link-local
    if (ip.startsWith("::ffff:")) {
      // IPv4-mapped IPv6 — re-check the embedded v4 address
      const embedded = ip.slice("::ffff:".length);
      return isIpPrivate(embedded);
    }
    return false;
  };

  const isHostAllowed = async (hostname: string): Promise<boolean> => {
    if (ALLOWED_HOSTS.has(hostname)) return true;
    // Literal IP in the URL?
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(":")) {
      // In development, allow private/loopback IPs (typical self-hosted Jellyfin).
      // In production, block them unless explicitly allowlisted.
      if (!isProduction) return true;
      return !isIpPrivate(hostname);
    }
    // Cached?
    const cached = hostPrivacyCache.get(hostname);
    if (cached !== undefined) return !cached;
    // Resolve and check all addresses
    try {
      const records = await lookup(hostname, { all: true });
      const privateAddrs = records.some((r) => isIpPrivate(r.address));
      hostPrivacyCache.set(hostname, privateAddrs);
      // In dev, allow private hosts; in prod, block them
      return isProduction ? !privateAddrs : true;
    } catch {
      // Unresolvable: reject to avoid info leaks
      hostPrivacyCache.set(hostname, true);
      return false;
    }
  };

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

      // SSRF guard: block loopback / private network targets
      let parsed: URL;
      try {
        parsed = new URL(targetUrl);
      } catch {
        return res.status(400).json({ error: "Invalid URL" });
      }
      const allowed = await isHostAllowed(parsed.hostname);
      if (!allowed) {
        console.warn("Proxy blocked: target host is on a private/loopback network:", parsed.hostname);
        return res.status(403).json({
          error: "Host blocked by SSRF protection",
          hint: "Define JELLYFIN_ALLOWED_HOSTS if this is your local Jellyfin server.",
        });
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
