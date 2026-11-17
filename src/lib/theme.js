import { useSyncExternalStore } from "react";
import { applyAppBranding, getAppSettings } from "./appSettings.js";

export const THEME_KEY = "coletanea-theme";
export const ACCENT_KEY = "coletanea-accent";

export const ACCENT_OPTIONS = [
  {
    id: "azul",
    label: "Azul Royal",
    description: "Azul profundo, elétrico e fundo azul-gelo",
    swatch: "#1e3a8a",
    secondarySwatch: "#2563eb",
    paperSwatch: "#f4f7fb",
    textSwatch: "#0f172a",
    darkSwatch: "#2563eb",
    darkSecondarySwatch: "#3b82f6",
    darkPaperSwatch: "#0b1120",
    pine: "30 58 138",
    pineDark: "37 99 235",
    paper: "244 247 251",
    card: "255 255 255",
    ink: "15 23 42",
    inkSoft: "71 85 105",
    line: "216 226 240",
    darkPine: "37 99 235",
    darkPineDark: "29 78 216",
    darkPaper: "11 17 32",
    darkCard: "17 28 51",
    darkInk: "241 245 249",
    darkInkSoft: "148 163 184",
    darkLine: "30 41 59",
  },
  {
    id: "marinho",
    label: "Azul Marinho",
    description: "Marinho noturno, ciano oceano e gelo naval",
    swatch: "#172554",
    secondarySwatch: "#0284c7",
    paperSwatch: "#f0f6fc",
    textSwatch: "#0c192c",
    darkSwatch: "#1e40af",
    darkSecondarySwatch: "#0284c7",
    darkPaperSwatch: "#080d1a",
    pine: "23 37 84",
    pineDark: "2 132 199",
    paper: "240 246 252",
    card: "255 255 255",
    ink: "12 25 44",
    inkSoft: "67 86 112",
    line: "210 224 240",
    darkPine: "30 64 175",
    darkPineDark: "2 132 199",
    darkPaper: "8 13 26",
    darkCard: "15 23 42",
    darkInk: "240 246 252",
    darkInkSoft: "141 162 192",
    darkLine: "30 41 59",
  },
  {
    id: "turquesa",
    label: "Turquesa",
    description: "Azul-petróleo, acqua vibrante e gelo menta",
    swatch: "#0f766e",
    secondarySwatch: "#0d9488",
    paperSwatch: "#f2fbf9",
    textSwatch: "#0f2926",
    darkSwatch: "#0d9488",
    darkSecondarySwatch: "#14b8a6",
    darkPaperSwatch: "#071716",
    pine: "15 118 110",
    pineDark: "13 148 136",
    paper: "242 251 249",
    card: "255 255 255",
    ink: "15 41 38",
    inkSoft: "70 102 98",
    line: "209 235 230",
    darkPine: "13 148 136",
    darkPineDark: "15 118 110",
    darkPaper: "7 23 22",
    darkCard: "15 38 36",
    darkInk: "240 253 250",
    darkInkSoft: "138 181 176",
    darkLine: "25 59 56",
  },
  {
    id: "verde",
    label: "Verde Floresta",
    description: "Verde pinho profundo, esmeralda e fundo sutil",
    swatch: "#1e4d3a",
    secondarySwatch: "#15803d",
    paperSwatch: "#f3f8f5",
    textSwatch: "#12241c",
    darkSwatch: "#2e7a5a",
    darkSecondarySwatch: "#16a34a",
    darkPaperSwatch: "#09140f",
    pine: "30 77 58",
    pineDark: "21 128 61",
    paper: "243 248 245",
    card: "255 255 255",
    ink: "18 36 28",
    inkSoft: "75 99 88",
    line: "213 230 220",
    darkPine: "46 122 90",
    darkPineDark: "32 92 68",
    darkPaper: "9 20 15",
    darkCard: "17 34 26",
    darkInk: "239 247 243",
    darkInkSoft: "143 176 160",
    darkLine: "29 56 44",
  },
  {
    id: "indigo",
    label: "Índigo",
    description: "Azul-índigo profundo, violeta elétrico e gelo lavanda",
    swatch: "#3730a3",
    secondarySwatch: "#4f46e5",
    paperSwatch: "#f5f5fc",
    textSwatch: "#161433",
    darkSwatch: "#4f46e5",
    darkSecondarySwatch: "#6366f1",
    darkPaperSwatch: "#0d0c1d",
    pine: "55 48 163",
    pineDark: "79 70 229",
    paper: "245 245 252",
    card: "255 255 255",
    ink: "22 20 51",
    inkSoft: "82 79 115",
    line: "220 220 240",
    darkPine: "79 70 229",
    darkPineDark: "67 56 202",
    darkPaper: "13 12 29",
    darkCard: "22 21 48",
    darkInk: "242 242 250",
    darkInkSoft: "152 149 189",
    darkLine: "38 36 77",
  },
  {
    id: "roxo",
    label: "Roxo Ametista",
    description: "Roxo intenso, violeta vibrante e fundo ametista sutil",
    swatch: "#5e357e",
    secondarySwatch: "#7e22ce",
    paperSwatch: "#f8f5fb",
    textSwatch: "#22142e",
    darkSwatch: "#8b5cb8",
    darkSecondarySwatch: "#9333ea",
    darkPaperSwatch: "#130b1a",
    pine: "94 53 126",
    pineDark: "126 34 206",
    paper: "248 245 251",
    card: "255 255 255",
    ink: "34 20 46",
    inkSoft: "99 80 115",
    line: "228 217 237",
    darkPine: "139 92 184",
    darkPineDark: "110 68 150",
    darkPaper: "19 11 26",
    darkCard: "31 19 43",
    darkInk: "246 242 250",
    darkInkSoft: "172 151 189",
    darkLine: "51 32 69",
  },
  {
    id: "rosa",
    label: "Rosa Rubi",
    description: "Rubi profundo, magenta vibrante e fundo quartzo",
    swatch: "#9c2f5d",
    secondarySwatch: "#be185d",
    paperSwatch: "#fcf5f8",
    textSwatch: "#2b121d",
    darkSwatch: "#c64b80",
    darkSecondarySwatch: "#db2777",
    darkPaperSwatch: "#1a0b12",
    pine: "156 47 93",
    pineDark: "190 24 93",
    paper: "252 245 248",
    card: "255 255 255",
    ink: "43 18 29",
    inkSoft: "115 76 93",
    line: "237 216 225",
    darkPine: "198 75 128",
    darkPineDark: "163 54 101",
    darkPaper: "26 11 18",
    darkCard: "41 18 29",
    darkInk: "250 240 245",
    darkInkSoft: "189 149 167",
    darkLine: "69 31 49",
  },
  {
    id: "vermelho",
    label: "Vermelho Carmim",
    description: "Carmim sólido, vermelho intenso e fundo suave",
    swatch: "#991b1b",
    secondarySwatch: "#dc2626",
    paperSwatch: "#fcf5f5",
    textSwatch: "#2b1111",
    darkSwatch: "#b4372f",
    darkSecondarySwatch: "#dc2626",
    darkPaperSwatch: "#190b0b",
    pine: "153 27 27",
    pineDark: "220 38 38",
    paper: "252 245 245",
    card: "255 255 255",
    ink: "43 17 17",
    inkSoft: "115 77 77",
    line: "237 216 216",
    darkPine: "180 55 47",
    darkPineDark: "146 40 34",
    darkPaper: "25 11 11",
    darkCard: "41 19 19",
    darkInk: "250 242 242",
    darkInkSoft: "189 151 151",
    darkLine: "69 32 32",
  },
  {
    id: "laranja",
    label: "Laranja Terracota",
    description: "Terracota profundo, âmbar vibrante e areia suave",
    swatch: "#9a3412",
    secondarySwatch: "#c2410c",
    paperSwatch: "#fcf7f4",
    textSwatch: "#29160e",
    darkSwatch: "#d6622c",
    darkSecondarySwatch: "#ea580c",
    darkPaperSwatch: "#180e09",
    pine: "154 52 18",
    pineDark: "194 65 12",
    paper: "252 247 244",
    card: "255 255 255",
    ink: "41 22 14",
    inkSoft: "112 84 72",
    line: "235 220 211",
    darkPine: "214 98 44",
    darkPineDark: "176 74 28",
    darkPaper: "24 14 9",
    darkCard: "38 23 16",
    darkInk: "250 244 240",
    darkInkSoft: "186 160 147",
    darkLine: "66 40 28",
  },
  {
    id: "amarelo",
    label: "Amarelo Ouro",
    description: "Ouro escuro acessível, âmbar e marfim suave",
    swatch: "#854d0e",
    secondarySwatch: "#a16207",
    paperSwatch: "#fbf8f1",
    textSwatch: "#261b0d",
    darkSwatch: "#ca8a04",
    darkSecondarySwatch: "#a16207",
    darkPaperSwatch: "#171208",
    pine: "133 77 14",
    pineDark: "161 98 7",
    paper: "251 248 241",
    card: "255 255 255",
    ink: "38 27 13",
    inkSoft: "107 91 69",
    line: "232 223 200",
    darkPine: "202 138 4",
    darkPineDark: "161 106 18",
    darkPaper: "23 18 8",
    darkCard: "36 28 13",
    darkInk: "250 246 237",
    darkInkSoft: "184 171 143",
    darkLine: "61 48 23",
  },
  {
    id: "marrom",
    label: "Marrom Clássico",
    description: "Café expresso, caramelo e fundo papel clássico",
    swatch: "#5c3a21",
    secondarySwatch: "#79502b",
    paperSwatch: "#f3efe6",
    textSwatch: "#1c1915",
    darkSwatch: "#976432",
    darkSecondarySwatch: "#79502b",
    darkPaperSwatch: "#14100c",
    pine: "92 58 33",
    pineDark: "121 80 43",
    paper: "243 239 230",
    card: "255 253 248",
    ink: "28 25 21",
    inkSoft: "109 102 92",
    line: "230 222 208",
    darkPine: "151 100 50",
    darkPineDark: "117 74 37",
    darkPaper: "20 16 12",
    darkCard: "33 27 21",
    darkInk: "245 242 237",
    darkInkSoft: "168 159 147",
    darkLine: "56 46 36",
  },
  {
    id: "cinza",
    label: "Cinza Chumbo",
    description: "Ardósia profundo, azul-acinzentado e gelo neutro",
    swatch: "#334155",
    secondarySwatch: "#475569",
    paperSwatch: "#f5f7fa",
    textSwatch: "#0f172a",
    darkSwatch: "#64748b",
    darkSecondarySwatch: "#475569",
    darkPaperSwatch: "#0c1017",
    pine: "51 65 85",
    pineDark: "71 85 105",
    paper: "245 247 250",
    card: "255 255 255",
    ink: "15 23 42",
    inkSoft: "82 96 117",
    line: "220 226 236",
    darkPine: "100 116 139",
    darkPineDark: "71 85 105",
    darkPaper: "12 16 23",
    darkCard: "21 28 40",
    darkInk: "241 245 249",
    darkInkSoft: "148 163 184",
    darkLine: "36 47 64",
  },
];

const ACCENT_MAP = new Map(ACCENT_OPTIONS.map((item) => [item.id, item]));
const VALID_ACCENTS = new Set(ACCENT_OPTIONS.map((item) => item.id));

const THEME_COLOR = {
  light: "#f4f7fb",
  dark: "#0b1120",
};

let current = "light";
let currentAccent = "azul";
let followsSystemTheme = false;
let systemThemeMedia = null;
const listeners = new Set();

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (
      getAppSettings().allowAppearanceChanges &&
      getAppSettings().allowedThemes.includes(stored) &&
      ["dark", "light"].includes(stored)
    ) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function readSystemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function handleSystemThemeChange(event) {
  if (!followsSystemTheme) return;
  current = event.matches ? "dark" : "light";
  applyCssVariables(current, currentAccent);
  listeners.forEach((listener) => listener());
}

function readStoredAccent() {
  try {
    const stored = localStorage.getItem(ACCENT_KEY);
    if (
      getAppSettings().allowAppearanceChanges &&
      VALID_ACCENTS.has(stored) &&
      getAppSettings().allowedAccents.includes(stored)
    ) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return getAppSettings().accent;
}

function applyCssVariables(themeValue, accentValue) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = themeValue;
  root.dataset.accent = accentValue;
  const option = ACCENT_MAP.get(accentValue) || ACCENT_OPTIONS[0];
  const isDark = themeValue === "dark";
  root.style.setProperty("--pine", isDark ? option.darkPine : option.pine);
  root.style.setProperty("--pine-dark", isDark ? option.darkPineDark : option.pineDark);
  root.style.setProperty("--paper", isDark ? option.darkPaper : option.paper);
  root.style.setProperty("--card", isDark ? option.darkCard : option.card);
  root.style.setProperty("--ink", isDark ? option.darkInk : option.ink);
  root.style.setProperty("--ink-soft", isDark ? option.darkInkSoft : option.inkSoft);
  root.style.setProperty("--line", isDark ? option.darkLine : option.line);
  const meta = document.querySelector('meta[name="theme-color"]');
  const metaColor = isDark
    ? option.darkPaperSwatch || THEME_COLOR.dark
    : option.paperSwatch || THEME_COLOR.light;
  if (meta) meta.setAttribute("content", metaColor);
  applyAppBranding(themeValue);
}

export function getAccentHex(themeValue = current, accentValue = currentAccent) {
  const option = ACCENT_MAP.get(accentValue) || ACCENT_OPTIONS[0];
  return themeValue === "dark" ? option.darkSwatch : option.swatch;
}

export function getTheme() {
  return current;
}

export function getAccent() {
  return currentAccent;
}

export function subscribeTheme(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(next) {
  if (
    !getAppSettings().allowAppearanceChanges ||
    !getAppSettings().allowedThemes.includes(next) ||
    (next !== "light" && next !== "dark")
  ) {
    return;
  }
  followsSystemTheme = false;
  current = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* ignore */
  }
  applyCssVariables(current, currentAccent);
  listeners.forEach((listener) => listener());
}

export function setAccent(next) {
  if (
    !getAppSettings().allowAppearanceChanges ||
    !VALID_ACCENTS.has(next) ||
    !getAppSettings().allowedAccents.includes(next)
  ) {
    return;
  }
  currentAccent = next;
  try {
    localStorage.setItem(ACCENT_KEY, next);
  } catch {
    /* ignore */
  }
  applyCssVariables(current, currentAccent);
  listeners.forEach((listener) => listener());
}

export function toggleTheme() {
  setTheme(current === "dark" ? "light" : "dark");
}

export function initTheme() {
  if (typeof document === "undefined") return;
  const storedTheme = readStoredTheme();
  const defaultTheme = getAppSettings().theme;
  followsSystemTheme = storedTheme === null && defaultTheme === "system";
  current = storedTheme || (defaultTheme === "system" ? readSystemTheme() : defaultTheme);
  currentAccent = readStoredAccent();
  applyCssVariables(current, currentAccent);

  if (systemThemeMedia) {
    if (systemThemeMedia.removeEventListener) {
      systemThemeMedia.removeEventListener("change", handleSystemThemeChange);
    } else {
      systemThemeMedia.removeListener(handleSystemThemeChange);
    }
  }
  systemThemeMedia = window.matchMedia?.("(prefers-color-scheme: dark)") || null;
  if (systemThemeMedia) {
    if (systemThemeMedia.addEventListener) {
      systemThemeMedia.addEventListener("change", handleSystemThemeChange);
    } else {
      systemThemeMedia.addListener(handleSystemThemeChange);
    }
  }
}

export function useTheme() {
  return useSyncExternalStore(subscribeTheme, getTheme, () => "light");
}

export function useAccent() {
  return useSyncExternalStore(subscribeTheme, getAccent, () => "azul");
}
