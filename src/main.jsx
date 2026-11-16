import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "@/lib/auth.jsx";
import {
  applyAppBranding,
  normalizeAppSettings,
  setAppSettings,
} from "@/lib/appSettings.js";
import { initPwa } from "@/lib/pwa.js";
import { initTheme } from "@/lib/theme.js";
import "./index.css";

const rawBase = import.meta.env.BASE_URL || "/";
const basename = rawBase === "/" ? undefined : rawBase.replace(/\/$/, "");

async function startApp() {
  try {
    const response = await fetch(`${rawBase.replace(/\/$/, "")}/api/app-settings`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const settings = normalizeAppSettings(await response.json());
    if (!settings) throw new Error("Configurações inválidas.");
    setAppSettings(settings);
  } catch (error) {
    console.warn("Não foi possível carregar os padrões do aplicativo; usando os padrões locais.", error);
  }

  initTheme();
  applyAppBranding();
  initPwa();
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter basename={basename}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      const swUrl = `${rawBase.replace(/\/$/, "")}/sw.js`;
      navigator.serviceWorker.register(swUrl).catch(() => {
        /* ignore service worker registration errors */
      });
    });
  }
}

startApp();
