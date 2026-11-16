export const APP_SETTINGS_DEFAULTS = {
  accent: "verde",
  allowedAccents: [
    "verde",
    "amarelo",
    "azul",
    "laranja",
    "roxo",
    "rosa",
    "cinza",
    "turquesa",
    "vermelho",
    "indigo",
    "marrom",
  ],
  allowedThemes: ["light", "dark"],
  allowAppearanceChanges: true,
  appIconDataUrl: "",
  appLogoDataUrl: "",
  appName: "Musika",
  defaultSongView: "letra",
  fontSize: 18,
  menuAccess: {
    favorites: true,
    previews: true,
    install: true,
    about: true,
    settings: true,
  },
  missingAudioBehavior: "hidden",
  songThemesEnabled: false,
  theme: "system",
  showChronological: false,
  unavailableControlsBehavior: "hidden",
};

export const APP_SETTING_LIMITS = {
  fontSize: { min: 16, max: 28 },
};

const VALID_ACCENTS = new Set([
  "verde",
  "amarelo",
  "azul",
  "laranja",
  "roxo",
  "rosa",
  "cinza",
  "turquesa",
  "vermelho",
  "indigo",
  "marrom",
]);
const VALID_SONG_VIEWS = new Set(["letra", "vozes", "cifra"]);
const VALID_THEMES = new Set(["system", "light", "dark"]);
const VALID_USER_THEMES = new Set(["light", "dark"]);
const VALID_UNAVAILABLE_BEHAVIORS = new Set(["hidden", "locked"]);
const VALID_MISSING_AUDIO_BEHAVIORS = new Set(["hidden", "disabled", "locked"]);
const MENU_ACCESS_KEYS = Object.keys(APP_SETTINGS_DEFAULTS.menuAccess);
const IMAGE_DATA_URL_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_DATA_URL_LENGTH = 1_400_000;

let appSettings = { ...APP_SETTINGS_DEFAULTS };

export function normalizeAppSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const settings = {
    ...APP_SETTINGS_DEFAULTS,
    ...value,
    menuAccess: {
      ...APP_SETTINGS_DEFAULTS.menuAccess,
      ...(value.menuAccess && typeof value.menuAccess === "object" ? value.menuAccess : {}),
    },
  };
  const { fontSize } = APP_SETTING_LIMITS;
  if (
    typeof settings.appName !== "string" ||
    !settings.appName.trim() ||
    settings.appName.trim().length > 40 ||
    !isValidImage(settings.appLogoDataUrl) ||
    !isValidImage(settings.appIconDataUrl) ||
    !Array.isArray(settings.allowedAccents) ||
    settings.allowedAccents.length === 0 ||
    !settings.allowedAccents.every((accent) => VALID_ACCENTS.has(accent)) ||
    new Set(settings.allowedAccents).size !== settings.allowedAccents.length ||
    !settings.allowedAccents.includes(settings.accent) ||
    !Array.isArray(settings.allowedThemes) ||
    settings.allowedThemes.length === 0 ||
    !settings.allowedThemes.every((theme) => VALID_USER_THEMES.has(theme)) ||
    new Set(settings.allowedThemes).size !== settings.allowedThemes.length ||
    typeof settings.allowAppearanceChanges !== "boolean" ||
    !VALID_ACCENTS.has(settings.accent) ||
    !VALID_SONG_VIEWS.has(settings.defaultSongView) ||
    !Number.isInteger(settings.fontSize) ||
    settings.fontSize < fontSize.min ||
    settings.fontSize > fontSize.max ||
    !VALID_THEMES.has(settings.theme) ||
    (settings.theme !== "system" && !settings.allowedThemes.includes(settings.theme)) ||
    typeof settings.showChronological !== "boolean" ||
    !settings.menuAccess ||
    !MENU_ACCESS_KEYS.every((key) => typeof settings.menuAccess[key] === "boolean") ||
    typeof settings.songThemesEnabled !== "boolean" ||
    !VALID_MISSING_AUDIO_BEHAVIORS.has(settings.missingAudioBehavior) ||
    !VALID_UNAVAILABLE_BEHAVIORS.has(settings.unavailableControlsBehavior)
  ) {
    return null;
  }
  return {
    accent: settings.accent,
    allowedAccents: [...settings.allowedAccents],
    allowedThemes: [...settings.allowedThemes],
    allowAppearanceChanges: settings.allowAppearanceChanges,
    appIconDataUrl: settings.appIconDataUrl,
    appLogoDataUrl: settings.appLogoDataUrl,
    appName: settings.appName.trim(),
    defaultSongView: settings.defaultSongView,
    fontSize: settings.fontSize,
    menuAccess: Object.fromEntries(
      MENU_ACCESS_KEYS.map((key) => [key, settings.menuAccess[key]]),
    ),
    missingAudioBehavior: settings.missingAudioBehavior,
    songThemesEnabled: settings.songThemesEnabled,
    theme: settings.theme,
    showChronological: settings.showChronological,
    unavailableControlsBehavior: settings.unavailableControlsBehavior,
  };
}

function isValidImage(value) {
  return (
    typeof value === "string" &&
    (value === "" ||
      (value.length <= MAX_IMAGE_DATA_URL_LENGTH && IMAGE_DATA_URL_PATTERN.test(value)))
  );
}

export function getAppSettings() {
  return appSettings;
}

export function setAppSettings(value) {
  const normalized = normalizeAppSettings(value);
  if (!normalized) throw new Error("configuracoes_invalidas");
  appSettings = normalized;
  return appSettings;
}

export function applyAppBranding() {
  if (typeof document === "undefined") return;
  const { appName, appIconDataUrl, appLogoDataUrl } = appSettings;
  document.title = appName;
  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) appleTitle.setAttribute("content", appName);
  document
    .querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')
    .forEach((link) => {
      if (!link.dataset.defaultHref) link.dataset.defaultHref = link.getAttribute("href") || "";
      link.setAttribute("href", appIconDataUrl || link.dataset.defaultHref);
    });
  const manifest = document.querySelector('link[rel="manifest"]');
  if (manifest) {
    if (!manifest.dataset.defaultHref) manifest.dataset.defaultHref = manifest.getAttribute("href") || "";
    manifest.setAttribute(
      "href",
      appName !== APP_SETTINGS_DEFAULTS.appName || appIconDataUrl || appLogoDataUrl
        ? `${window.location.origin}/api/app-manifest`
        : manifest.dataset.defaultHref,
    );
  }
}
