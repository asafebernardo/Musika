import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  APP_SETTINGS_DEFAULTS,
  normalizeAppSettings,
} from "../src/lib/appSettings.js";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(serverDir, "../data");
const filePath = path.join(dataDir, "app-settings.json");
let queue = Promise.resolve();

function withLock(task) {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readSettingsFile() {
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { ...APP_SETTINGS_DEFAULTS };
    throw error;
  }
  const settings = normalizeAppSettings(JSON.parse(raw));
  if (!settings) throw new Error("configuracoes_invalidas");
  return settings;
}

export function getAppSettings() {
  return withLock(readSettingsFile);
}

export async function getAppIcon() {
  const { appIconDataUrl } = await getAppSettings();
  if (!appIconDataUrl) return null;
  return decodeIcon(appIconDataUrl);
}

export async function getAppManifest() {
  const { appName, appIconDataUrl } = await getAppSettings();
  const icon = appIconDataUrl ? decodeIcon(appIconDataUrl) : null;
  return {
    name: appName,
    short_name: appName.slice(0, 12),
    description: `${appName}: músicas cristãs, letras e cifras em um só aplicativo.`,
    lang: "pt-BR",
    start_url: "/?pwa=1",
    scope: "/",
    display: "standalone",
    background_color: "#f3efe6",
    theme_color: "#f3efe6",
    icons: icon
      ? [{ src: "/api/app-icon", sizes: "any", type: icon.contentType, purpose: "any" }]
      : [
          { src: "/logo.jfif", sizes: "2048x2048", type: "image/jpeg", purpose: "any" },
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
  };
}

function decodeIcon(dataUrl) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("icone_invalido");
  return { contentType: match[1], data: Buffer.from(match[2], "base64") };
}

export function updateAppSettings(input) {
  return withLock(async () => {
    const settings = normalizeAppSettings(input);
    if (!settings) return { error: "configuracoes_invalidas" };
    await mkdir(dataDir, { recursive: true });
    const temporaryPath = `${filePath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    await rename(temporaryPath, filePath);
    return { settings };
  });
}
