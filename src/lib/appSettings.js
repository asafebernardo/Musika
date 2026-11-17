export const APP_SETTINGS_DEFAULTS = {
  accent: "azul",
  allowedAccents: [
    "azul",
    "marinho",
    "turquesa",
    "verde",
    "indigo",
    "roxo",
    "rosa",
    "vermelho",
    "laranja",
    "amarelo",
    "marrom",
    "cinza",
  ],
  allowedThemes: ["light", "dark"],
  allowAppearanceChanges: true,
  appIconMode: "default",
  appIconLightDataUrl: "",
  appIconDarkDataUrl: "",
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
  "azul",
  "marinho",
  "turquesa",
  "verde",
  "indigo",
  "roxo",
  "rosa",
  "vermelho",
  "laranja",
  "amarelo",
  "marrom",
  "cinza",
]);
const LEGACY_ACCENT_MAP = {
  eletrico: "azul",
  ciano: "turquesa",
};
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
  const legacyBrandingImage =
    (typeof value.appIconLightDataUrl === "string" && value.appIconLightDataUrl) ||
    (typeof value.appBrandingLightDataUrl === "string" && value.appBrandingLightDataUrl) ||
    (typeof value.appLogoDataUrl === "string" && value.appLogoDataUrl) ||
    (typeof value.appIconDataUrl === "string" && value.appIconDataUrl) ||
    "";
  const iconLightDataUrl =
    value.appIconLightDataUrl || value.appBrandingLightDataUrl || legacyBrandingImage;
  const iconDarkDataUrl =
    value.appIconDarkDataUrl ||
    value.appBrandingDarkDataUrl ||
    (typeof value.appLogoDataUrl === "string" && value.appLogoDataUrl) ||
    (typeof value.appIconDataUrl === "string" && value.appIconDataUrl) ||
    legacyBrandingImage;
  const appIconMode =
    value.appIconMode || (iconLightDataUrl || iconDarkDataUrl ? "custom" : "default");
  const rawAccent = typeof value.accent === "string" ? (LEGACY_ACCENT_MAP[value.accent] || value.accent) : APP_SETTINGS_DEFAULTS.accent;
  const rawAllowedAccents = Array.isArray(value.allowedAccents)
    ? Array.from(new Set(value.allowedAccents.map((item) => LEGACY_ACCENT_MAP[item] || item)))
    : APP_SETTINGS_DEFAULTS.allowedAccents;
  const settings = {
    ...APP_SETTINGS_DEFAULTS,
    ...value,
    accent: rawAccent,
    allowedAccents: rawAllowedAccents,
    appIconMode,
    appIconLightDataUrl: iconLightDataUrl,
    appIconDarkDataUrl: iconDarkDataUrl,
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
    !["default", "custom"].includes(settings.appIconMode) ||
    !isValidImage(settings.appIconLightDataUrl) ||
    !isValidImage(settings.appIconDarkDataUrl) ||
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
    appIconMode: settings.appIconMode,
    appIconLightDataUrl: settings.appIconLightDataUrl,
    appIconDarkDataUrl: settings.appIconDarkDataUrl,
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

export function getAppIconImage(settings = appSettings, theme = "light") {
  if (settings.appIconMode === "default") return "";
  const lightImage = settings.appIconLightDataUrl || "";
  const darkImage = settings.appIconDarkDataUrl || "";
  return theme === "dark"
    ? darkImage || lightImage
    : lightImage || darkImage;
}

export function setAppSettings(value) {
  const normalized = normalizeAppSettings(value);
  if (!normalized) throw new Error("configuracoes_invalidas");
  appSettings = normalized;
  return appSettings;
}

export function applyAppBranding(theme) {
  if (typeof document === "undefined") return;
  const { appName, appIconLightDataUrl, appIconDarkDataUrl } = appSettings;
  const activeTheme = theme || document.documentElement.dataset.theme || "light";
  const iconDataUrl = getAppIconImage(appSettings, activeTheme);
  document.title = appName;
  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) appleTitle.setAttribute("content", appName);
  document
    .querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')
    .forEach((link) => {
      if (!link.dataset.defaultHref) link.dataset.defaultHref = link.getAttribute("href") || "";
      link.setAttribute("href", iconDataUrl || link.dataset.defaultHref);
    });
  const manifest = document.querySelector('link[rel="manifest"]');
  if (manifest) {
    if (!manifest.dataset.defaultHref) manifest.dataset.defaultHref = manifest.getAttribute("href") || "";
    manifest.setAttribute(
      "href",
      appName !== APP_SETTINGS_DEFAULTS.appName ||
        appSettings.appIconMode === "custom" ||
        appIconLightDataUrl ||
        appIconDarkDataUrl
        ? `${window.location.origin}/api/app-manifest`
        : manifest.dataset.defaultHref,
    );
  }
}
