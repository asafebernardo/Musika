import { copyFile, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import {
  createSong,
  deleteSong,
  getSong,
  listSongs,
  streamAudioFile,
  updateSong,
} from "./server/songs-store.js";
import {
  handleAuthRequest,
  isAdminRequest,
  isAuthenticatedRequest,
  isSameOriginRequest,
} from "./server/auth-api.js";
import {
  getAppIcon,
  getAppManifest,
  getAppSettings,
  updateAppSettings,
} from "./server/app-settings-store.js";

const root = path.dirname(fileURLToPath(import.meta.url));

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function sendStoreResult(res, result, successStatus = 200) {
  if (result?.error === "nao_encontrada") {
    sendJson(res, 404, { error: result.error });
    return;
  }
  if (result?.error) {
    const status = result.error === "numero_em_uso" ? 409 : 400;
    sendJson(res, status, { error: result.error });
    return;
  }
  sendJson(res, successStatus, result.song ?? result);
}

function localSongsApiPlugin() {
  return {
    name: "coletanea-local-songs-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        if (/^\/data\/users\.json(?:\..*)?$/i.test(url.pathname)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        if (url.pathname === "/data/songs.json" && req.method === "GET") {
          if (!(await isAuthenticatedRequest(req.headers))) {
            sendJson(res, 403, { error: "acesso_negado" });
            return;
          }
          sendJson(res, 200, await listSongs());
          return;
        }
        const dataAudioMatch = url.pathname.match(/\/data\/audios\/([^/]+)$/);
        if (dataAudioMatch && (req.method === "GET" || req.method === "HEAD")) {
          if (!(await isAuthenticatedRequest(req.headers))) {
            sendJson(res, 403, { error: "acesso_negado" });
            return;
          }
          await streamAudioFile(decodeURIComponent(dataAudioMatch[1]), req, res);
          return;
        }
        if (!url.pathname.startsWith("/api/")) {
          next();
          return;
        }
        try {
          if (url.pathname.startsWith("/api/auth/") || url.pathname.startsWith("/api/admin/users")) {
            const body =
              req.method === "POST" ? await readJsonBody(req) : {};
            const result = await handleAuthRequest({
              method: req.method,
              pathname: url.pathname,
              headers: req.headers,
              body,
            });
            if (result) {
              for (const [name, value] of Object.entries(result.headers || {})) {
                res.setHeader(name, value);
              }
              sendJson(res, result.status, result.body);
              return;
            }
          }
          if (req.method === "GET" && url.pathname === "/api/health") {
            sendJson(res, 200, { ok: true, app: "musika" });
            return;
          }
          if (req.method === "GET" && url.pathname === "/api/app-settings") {
            sendJson(res, 200, await getAppSettings());
            return;
          }
          if (req.method === "GET" && url.pathname === "/api/app-manifest") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
            res.setHeader("Cache-Control", "no-store");
            res.end(JSON.stringify(await getAppManifest()));
            return;
          }
          if (req.method === "GET" && url.pathname === "/api/app-icon") {
            const icon = await getAppIcon();
            if (!icon) {
              res.statusCode = 404;
              res.end();
              return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", icon.contentType);
            res.setHeader("Cache-Control", "no-store");
            res.end(icon.data);
            return;
          }
          if (req.method === "PUT" && url.pathname === "/api/admin/app-settings") {
            if (
              !isSameOriginRequest(req.headers) ||
              !(await isAdminRequest(req.headers))
            ) {
              sendJson(res, 403, { error: "acesso_negado" });
              return;
            }
            const body = await readJsonBody(req);
            const result = await updateAppSettings(body);
            if (result.error) {
              sendJson(res, 400, { error: result.error });
              return;
            }
            sendJson(res, 200, result.settings);
            return;
          }
          if (req.method === "GET" && url.pathname === "/api/songs") {
            if (!(await isAuthenticatedRequest(req.headers))) {
              sendJson(res, 403, { error: "acesso_negado" });
              return;
            }
            sendJson(res, 200, await listSongs());
            return;
          }
          if (req.method === "POST" && url.pathname === "/api/songs") {
            if (
              !isSameOriginRequest(req.headers) ||
              !(await isAdminRequest(req.headers))
            ) {
              sendJson(res, 403, { error: "acesso_negado" });
              return;
            }
            const body = await readJsonBody(req);
            sendStoreResult(res, await createSong(body), 201);
            return;
          }
          const audioMatch = url.pathname.match(/^\/api\/audios\/([^/]+)$/);
          if (audioMatch && (req.method === "GET" || req.method === "HEAD")) {
            if (!(await isAuthenticatedRequest(req.headers))) {
              sendJson(res, 403, { error: "acesso_negado" });
              return;
            }
            await streamAudioFile(decodeURIComponent(audioMatch[1]), req, res);
            return;
          }
          const match = url.pathname.match(/^\/api\/songs\/(\d+)$/);
          if (match) {
            const id = Number(match[1]);
            if (req.method === "GET") {
              if (!(await isAuthenticatedRequest(req.headers))) {
                sendJson(res, 403, { error: "acesso_negado" });
                return;
              }
              const song = await getSong(id);
              if (!song) {
                sendJson(res, 404, { error: "nao_encontrada" });
                return;
              }
              sendJson(res, 200, song);
              return;
            }
            if (req.method === "PUT") {
              if (
                !isSameOriginRequest(req.headers) ||
                !(await isAdminRequest(req.headers))
              ) {
                sendJson(res, 403, { error: "acesso_negado" });
                return;
              }
              const body = await readJsonBody(req);
              sendStoreResult(res, await updateSong(id, body), 200);
              return;
            }
            if (req.method === "DELETE") {
              if (
                !isSameOriginRequest(req.headers) ||
                !(await isAdminRequest(req.headers))
              ) {
                sendJson(res, 403, { error: "acesso_negado" });
                return;
              }
              const result = await deleteSong(id);
              if (result?.error) {
                sendStoreResult(res, result);
                return;
              }
              res.statusCode = 204;
              res.end();
              return;
            }
          }
          next();
        } catch (error) {
          console.error(error);
          sendJson(res, 500, { error: "erro_interno" });
        }
      });
    },
    async closeBundle() {
      const distDir = path.join(root, "dist");
      const distDataDir = path.join(distDir, "data");
      await mkdir(distDataDir, { recursive: true });
      await copyFile(
        path.join(root, "data", "songs.json"),
        path.join(distDataDir, "songs.json"),
      );
      try {
        await cp(path.join(root, "data", "audios"), path.join(distDataDir, "audios"), {
          recursive: true,
        });
      } catch {
        /* data/audios may not exist yet */
      }
      try {
        await copyFile(path.join(distDir, "index.html"), path.join(distDir, "404.html"));
      } catch {
        /* ignore */
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_DEV_API_URL || "http://127.0.0.1:3002";
  const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const defaultBase =
    process.env.GITHUB_ACTIONS === "true" && repoName ? `/${repoName}/` : "/";

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const versionDate = `${dd}.${mm}.${yy}`;

  return {
    base: env.VITE_BASE || defaultBase,
    define: {
      __APP_VERSION_DATE__: JSON.stringify(versionDate),
    },
    resolve: {
      alias: {
        "@": path.resolve(root, "./src"),
      },
    },
    plugins: [react(), localSongsApiPlugin()],
    server: {
      host: true,
      port: 5174,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: true,
      port: 5174,
      strictPort: true,
    },
  };
});
