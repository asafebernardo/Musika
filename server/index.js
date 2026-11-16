import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  createSong,
  deleteSong,
  getSong,
  listSongs,
  streamAudioFile,
  updateSong,
} from "./songs-store.js";
import {
  handleAuthRequest,
  isAdminRequest,
  isAuthenticatedRequest,
  isSameOriginRequest,
} from "./auth-api.js";
import {
  getAppIcon,
  getAppManifest,
  getAppSettings,
  updateAppSettings,
} from "./app-settings-store.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const port = Number(process.env.PORT || 3002);
const isProduction = process.env.NODE_ENV === "production";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "50mb" }));
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(async (req, res, next) => {
  try {
    const result = await handleAuthRequest({
      method: req.method,
      pathname: req.path,
      headers: req.headers,
      body: req.body,
      secure: isProduction,
    });
    if (!result) return next();
    for (const [name, value] of Object.entries(result.headers || {})) {
      res.setHeader(name, value);
    }
    res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
});

async function requireAdmin(req, res, next) {
  try {
    if (!isSameOriginRequest(req.headers, isProduction)) {
      res.status(403).json({ error: "origem_invalida" });
      return;
    }
    if (!(await isAdminRequest(req.headers))) {
      res.status(403).json({ error: "acesso_negado" });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAuthenticated(req, res, next) {
  try {
    if (!(await isAuthenticatedRequest(req.headers))) {
      res.status(403).json({ error: "acesso_negado" });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

function sendResult(res, result, successStatus = 200) {
  if (result?.error === "nao_encontrada") {
    res.status(404).json({ error: result.error });
    return;
  }
  if (result?.error) {
    const status = result.error === "numero_em_uso" ? 409 : 400;
    res.status(status).json({ error: result.error });
    return;
  }
  res.status(successStatus).json(result.song ?? result);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "musika" });
});

app.get("/api/app-settings", async (_req, res, next) => {
  try {
    res.json(await getAppSettings());
  } catch (error) {
    next(error);
  }
});

app.get("/api/app-manifest", async (_req, res, next) => {
  try {
    res.type("application/manifest+json").json(await getAppManifest());
  } catch (error) {
    next(error);
  }
});

app.get("/api/app-icon", async (_req, res, next) => {
  try {
    const icon = await getAppIcon();
    if (!icon) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", icon.contentType);
    res.setHeader("Cache-Control", "no-store");
    res.end(icon.data);
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/app-settings", requireAdmin, async (req, res, next) => {
  try {
    const result = await updateAppSettings(req.body);
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result.settings);
  } catch (error) {
    next(error);
  }
});

app.get("/data/songs.json", requireAuthenticated, async (_req, res, next) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json(await listSongs());
  } catch (error) {
    next(error);
  }
});

app.get("/api/audios/:filename", requireAuthenticated, async (req, res, next) => {
  try {
    await streamAudioFile(req.params.filename, req, res);
  } catch (error) {
    next(error);
  }
});

app.get("/data/audios/:filename", requireAuthenticated, async (req, res, next) => {
  try {
    await streamAudioFile(req.params.filename, req, res);
  } catch (error) {
    next(error);
  }
});

app.get("/api/songs", requireAuthenticated, async (_req, res, next) => {
  try {
    res.json(await listSongs());
  } catch (error) {
    next(error);
  }
});

app.get("/api/songs/:id", requireAuthenticated, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "id_invalido" });
      return;
    }
    const song = await getSong(id);
    if (!song) {
      res.status(404).json({ error: "nao_encontrada" });
      return;
    }
    res.json(song);
  } catch (error) {
    next(error);
  }
});

app.post("/api/songs", requireAdmin, async (req, res, next) => {
  try {
    sendResult(res, await createSong(req.body), 201);
  } catch (error) {
    next(error);
  }
});

app.put("/api/songs/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "id_invalido" });
      return;
    }
    sendResult(res, await updateSong(id, req.body));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/songs/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "id_invalido" });
      return;
    }
    const result = await deleteSong(id);
    if (result.error) {
      sendResult(res, result);
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

if (isProduction) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distDir, "index.html"), (error) => {
      if (error) next(error);
    });
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "erro_interno" });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Musika API em http://127.0.0.1:${port}`);
});
