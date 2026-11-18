import { useEffect, useState } from "react";
import { request } from "@/api/songs.js";
import Lyrics from "@/components/Lyrics.jsx";
import SongScroll from "@/components/SongScroll.jsx";
import {
  APP_SETTING_LIMITS,
  APP_SETTINGS_DEFAULTS,
  applyAppBranding,
  getAppIconImage,
  getAppSettings,
  normalizeAppSettings,
  setAppSettings,
} from "@/lib/appSettings.js";
import { ACCENT_OPTIONS, initTheme } from "@/lib/theme.js";

const SONG_VIEWS = [
  { value: "letra", label: "Letra" },
  { value: "vozes", label: "Vozes" },
  { value: "cifra", label: "Cifra" },
];

const PERSONALIZATION_FIELDS = {
  identidade: [
    { id: "nome", label: "Nome" },
    { id: "icone", label: "Ícone" },
  ],
  temas: [
    { id: "aparencia", label: "Aparência" },
    { id: "temaPadrao", label: "Tema padrão" },
    { id: "temasDisponiveis", label: "Temas disponíveis" },
    { id: "corPadrao", label: "Cor padrão" },
    { id: "coresDisponiveis", label: "Cores disponíveis" },
  ],
  visualizacao: [
    { id: "visualizacaoInicial", label: "Visualização inicial" },
    { id: "tamanhoLetra", label: "Tamanho da letra" },
    { id: "cronologia", label: "Cronologia" },
  ],
  acoes: [
    { id: "menus", label: "Menus disponíveis" },
    { id: "temasMusicas", label: "Temas de músicas" },
    { id: "controles", label: "Controles indisponíveis" },
    { id: "audio", label: "Áudio sem demonstração" },
  ],
};

const PREVIEW_LETRA =
  "Tua luz me guia a cada dia.\nEm teu amor encontro paz.\n\nCom esperança sigo os passos,\ncom gratidão celebro o bem.";
const PREVIEW_REFRAO = "És meu abrigo e canção.";

const THEMES = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

const MENU_OPTIONS = [
  { id: "favorites", label: "Favoritos", description: "Acesso à lista de músicas favoritas." },
  { id: "previews", label: "Pré-visualizações", description: "Acesso às demonstrações de áudio." },
  { id: "install", label: "Instalação", description: "Acesso às instruções para instalar o app." },
  { id: "about", label: "Informações", description: "Acesso à página de informações do app." },
  { id: "settings", label: "Configurações", description: "Acesso às preferências pessoais de leitura." },
];

const MAX_IMAGE_BYTES = 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export default function AdminPersonalizationSection({ activeTab }) {
  const [settings, setSettings] = useState(() => ({ ...getAppSettings() }));
  const [activeField, setActiveField] = useState(PERSONALIZATION_FIELDS[activeTab][0].id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sectionFields = PERSONALIZATION_FIELDS[activeTab];
  const selectedField = sectionFields.some((field) => field.id === activeField)
    ? activeField
    : sectionFields[0].id;

  useEffect(() => {
    setActiveField(PERSONALIZATION_FIELDS[activeTab][0].id);
  }, [activeTab]);

  useEffect(() => {
    let active = true;
    request("/api/app-settings")
      .then((result) => {
        const normalized = normalizeAppSettings(result);
        if (!normalized) throw new Error("configuracoes_invalidas");
        if (active) setSettings(normalized);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar as configurações padrão.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = (changes) => {
    setSettings((current) => ({ ...current, ...changes }));
    setError("");
    setNotice("");
  };

  const handleImageChange = (field) => (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) {
      setError("Use uma imagem PNG, JPG ou WebP de até 1 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string" || !reader.result) {
        setError("Não foi possível ler a imagem selecionada.");
        return;
      }
      update({ [field]: reader.result });
    };
    reader.onerror = () => setError("Não foi possível ler a imagem selecionada.");
    reader.readAsDataURL(file);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await request("/api/admin/app-settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      const normalized = normalizeAppSettings(saved);
      if (!normalized) throw new Error("configuracoes_invalidas");
      setSettings(normalized);
      setAppSettings(normalized);
      initTheme();
      applyAppBranding();
      setNotice("Personalização salva.");
    } catch {
      setError("Não foi possível salvar as configurações. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const accent = ACCENT_OPTIONS.find((option) => option.id === settings.accent) ?? ACCENT_OPTIONS[0];
  const isDark =
    settings.theme === "dark" ||
    (settings.theme === "system" &&
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
  const previewStyle = {
    "--paper": isDark ? accent.darkPaper : accent.paper,
    "--card": isDark ? accent.darkCard : accent.card,
    "--ink": isDark ? accent.darkInk : accent.ink,
    "--ink-soft": isDark ? accent.darkInkSoft : accent.inkSoft,
    "--line": isDark ? accent.darkLine : accent.line,
    "--pine": isDark ? accent.darkPine : accent.pine,
    "--pine-dark": isDark ? accent.darkPineDark : accent.pineDark,
    "--voice-men": isDark ? "96 165 250" : "29 78 216",
    "--voice-women": isDark ? "56 189 248" : "2 132 199",
  };
  const previewView = SONG_VIEWS.find((item) => item.value === settings.defaultSongView) ?? SONG_VIEWS[0];
  const previewIcon =
    getAppIconImage(settings, isDark ? "dark" : "light") ||
    `${import.meta.env.BASE_URL || "/"}icon.png`;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 pb-3 xl:col-span-2">
        <nav
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
          aria-label={`Configurações de ${activeTab}`}
        >
          {sectionFields.map((field) => (
            <button
              key={field.id}
              type="button"
              onClick={() => setActiveField(field.id)}
              aria-current={selectedField === field.id ? "page" : undefined}
              className={`h-8 shrink-0 rounded-[3px] px-3 text-xs font-medium transition-colors ${
                selectedField === field.id
                  ? "bg-pine text-white font-semibold"
                  : "text-ink-soft hover:bg-card hover:text-ink"
              }`}
            >
              {field.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSettings({ ...APP_SETTINGS_DEFAULTS, menuAccess: { ...APP_SETTINGS_DEFAULTS.menuAccess } });
              setError("");
              setNotice("");
            }}
            disabled={loading || saving}
            className="h-8.5 rounded-[3px] border border-line bg-card px-3 text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
          >
            Restaurar padrão
          </button>
          <button
            type="submit"
            form="admin-personalization-form"
            disabled={loading || saving}
            className="h-8.5 rounded-[3px] bg-pine px-4 text-xs font-semibold text-white hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>

      <form id="admin-personalization-form" onSubmit={save} className="space-y-5">
        {activeTab === "identidade" ? (
          <IdentitySettings
            activeField={selectedField}
            settings={settings}
            update={update}
            onImageChange={handleImageChange}
          />
        ) : activeTab === "temas" ? (
          <ThemeSettings activeField={selectedField} settings={settings} update={update} />
        ) : activeTab === "visualizacao" ? (
          <ViewSettings activeField={selectedField} settings={settings} update={update} />
        ) : (
          <AccessSettings activeField={selectedField} settings={settings} update={update} />
        )}

        {error ? (
          <p role="alert" className="rounded-[3px] border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-xs text-danger">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-[3px] border border-pine/30 bg-pine/5 px-3.5 py-2.5 text-xs text-pine">
            {notice}
          </p>
        ) : null}
      </form>

      <aside className="border-t border-line/80 pt-5 xl:sticky xl:top-4 xl:self-start xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Prévia do app
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            A tela do celular acompanha as opções selecionadas em tempo real.
          </p>
        </div>

        <div className="mx-auto mt-3.5 max-w-[340px] rounded-[2.4rem] border-[6px] border-neutral-800 bg-neutral-900 p-1.5 shadow-xl ring-1 ring-black/20">
            <div
              style={previewStyle}
              className="flex h-[min(600px,calc(100dvh-230px))] min-h-[450px] flex-col overflow-hidden rounded-[2rem] bg-paper text-ink"
            >
              {/* Barra de status do celular (horário, câmera, sinal, Wi-Fi e bateria) */}
              <div
                aria-hidden
                className="flex h-7 shrink-0 items-center justify-between bg-pine px-4 pt-1 text-[11px] font-semibold tracking-tight text-white select-none"
              >
                <span className="tabular-nums">09:41</span>
                <span className="h-3 w-14 rounded-full bg-black/45" />
                <span className="flex items-center gap-1.5">
                  {/* Sinal de rede */}
                  <svg viewBox="0 0 16 12" className="h-2.5 w-3.5 fill-current">
                    <rect x="1" y="8" width="2" height="3" rx="0.5" />
                    <rect x="4.5" y="6" width="2" height="5" rx="0.5" />
                    <rect x="8" y="3.5" width="2" height="7.5" rx="0.5" />
                    <rect x="11.5" y="1" width="2" height="10" rx="0.5" />
                  </svg>
                  {/* Wi-Fi */}
                  <svg viewBox="0 0 16 12" className="h-2.5 w-3.5 fill-none stroke-current" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M1.5 4.2a9.5 9.5 0 0 1 13 0" />
                    <path d="M4.2 7a6 6 0 0 1 7.6 0" />
                    <circle cx="8" cy="9.8" r="1" className="fill-current stroke-none" />
                  </svg>
                  {/* Bateria */}
                  <span className="inline-flex items-center">
                    <span className="flex h-2.5 w-5 items-center rounded-[3px] border border-white/80 p-[1.5px]">
                      <span className="h-full w-3.5 rounded-[1px] bg-white" />
                    </span>
                    <span className="ml-[1px] h-1 w-[1.5px] rounded-r-sm bg-white/80" />
                  </span>
                </span>
              </div>

              {/* Cabeçalho do aplicativo */}
              <header className="flex h-12 shrink-0 items-center gap-2 border-b border-pine-dark bg-pine px-3 text-white shadow-sm">
                {previewIcon ? (
                  <img
                    src={previewIcon}
                    alt={`Ícone ${settings.appName}`}
                    className="h-7 w-7 rounded-lg object-contain"
                  />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
                    {settings.appName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{settings.appName}</span>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-white/90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="10.8" cy="10.8" r="6.3" />
                  <path d="m15.5 15.5 4.2 4.2" />
                </svg>
              </header>

              {/* Conteúdo da tela */}
              <div className="flex min-h-0 flex-1 flex-col bg-paper">
                <div className="shrink-0 px-4 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex rounded-full bg-pine/10 px-2 py-0.5 text-[10px] font-medium text-pine">
                      {previewView.label}
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-ink-soft">#001</span>
                  </div>
                  <h4 className="mt-1.5 text-sm font-semibold">Uma canção de exemplo</h4>
                </div>
                <SongScroll>
                  <Lyrics
                    letra={PREVIEW_LETRA}
                    refrao={PREVIEW_REFRAO}
                    vozesLetra={["homens", "mulheres", "", "mulheres", "homens"]}
                    vozesRefrao={["mulheres"]}
                    letraVozes=""
                    vozesArranjo={[]}
                    cifraLetra={"C\nG\n\nAm\nF"}
                    cifraRefrao="C"
                    cronologica={settings.showChronological}
                    refraoPrimeiro={false}
                    showVoices={settings.defaultSongView === "vozes"}
                    showChords={settings.defaultSongView === "cifra"}
                    fontSize={settings.fontSize}
                  />
                </SongScroll>
                {settings.missingAudioBehavior !== "hidden" ? (
                  <div className="shrink-0 border-t border-line bg-paper px-3 py-1.5 text-[10px] text-ink-soft">
                    Demonstração de áudio{" "}
                    {settings.missingAudioBehavior === "locked" ? "bloqueada" : "indisponível"}
                  </div>
                ) : null}
              </div>

              {/* Menu inferior do app + barra gestual do celular */}
              <div className="shrink-0 border-t border-line bg-card">
                <nav
                  aria-label="Menu inferior da prévia"
                  className="grid grid-cols-4 px-1 pt-1.5 pb-1"
                >
                  <div className="flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-semibold text-pine">
                    <PreviewPraiseIcon />
                    <span>Músicas</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium text-pine">
                    <PreviewViewIcon view={settings.defaultSongView} />
                    <span>{previewView.label}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium text-ink-soft">
                    <PreviewSettingsIcon />
                    <span>Ajustes</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium text-ink-soft">
                    <PreviewMoreIcon />
                    <span>Mais+</span>
                  </div>
                </nav>
                <div aria-hidden className="flex justify-center pb-1.5 pt-0.5">
                  <span className="h-1 w-24 rounded-full bg-ink/20" />
                </div>
              </div>
            </div>
          </div>

          {activeTab === "identidade" ? (
            <div
              style={previewStyle}
              className="mt-3 flex items-center gap-3 border-t border-line/80 pt-3 text-ink"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-line bg-card">
                {previewIcon ? (
                  <img
                    src={previewIcon}
                    alt={`Ícone ${settings.appName}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xs font-bold text-pine">
                    {settings.appName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{settings.appName}</p>
                <p className="mt-0.5 text-[10px] text-ink-soft">Ícone na tela inicial do aparelho</p>
              </div>
            </div>
          ) : null}
          <p className="mt-3 text-center text-xs text-ink-soft">
            Tema: {THEMES.find((item) => item.value === settings.theme)?.label} · Cor: {accent.label}
          </p>
      </aside>
    </div>
  );
}

function PreviewViewIcon({ view }) {
  if (view === "vozes") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0">
        <circle cx="6.4" cy="6.4" r="2.5" className="fill-voice-men" />
        <path className="fill-voice-men" d="M2.2 18.2v-.4c0-2.4 1.85-4.1 4.2-4.1s4.2 1.7 4.2 4.1v.4z" />
        <circle cx="17.6" cy="6.4" r="2.5" className="fill-voice-women" />
        <path className="fill-voice-women" d="M13.4 18.2v-.4c0-2.4 1.85-4.1 4.2-4.1s4.2 1.7 4.2 4.1v.4z" />
      </svg>
    );
  }
  if (view === "cifra") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4.5" y="3.5" width="15" height="17" rx="1.5" />
        <path d="M8 7.5h8M8 12h8M8 16.5h5" />
        <circle cx="15.5" cy="16.5" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 7h14M7 12h10M6 17h12" />
    </svg>
  );
}

function PreviewPraiseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function PreviewMoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M17.5 14v7" />
      <path d="M14 17.5h7" />
    </svg>
  );
}

function PreviewSettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function IdentitySettings({ activeField, settings, update, onImageChange }) {
  const [iconTheme, setIconTheme] = useState("light");
  const defaultIconSrc = `${import.meta.env.BASE_URL || "/"}icon.png`;
  const field = {
    nome: {
      title: "Nome do aplicativo",
      description: "Nome exibido na página inicial e nas telas do app.",
    },
    icone: {
      title: "Ícone do aplicativo",
      description: "Escolha o ícone padrão ou carregue versões personalizadas para tema claro e escuro.",
    },
  }[activeField];

  return (
    <SettingsCard title={field.title} description={field.description}>
      {activeField === "nome" ? (
        <label className="block max-w-md space-y-1.5">
          <span className="text-xs font-medium text-ink-soft">Nome do aplicativo</span>
          <input
            value={settings.appName}
            onChange={(event) => update({ appName: event.target.value })}
            maxLength={40}
            required
            className="h-9 w-full rounded-[3px] border border-line bg-card px-2.5 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
          />
          <span className="block text-xs text-ink-soft">Até 40 caracteres.</span>
        </label>
      ) : (
        <div className="space-y-5">
          <ChoiceGroup
            label="Modo do ícone"
            value={settings.appIconMode}
            choices={[
              { value: "default", label: "Padrão" },
              { value: "custom", label: "Personalizado" },
            ]}
            onChange={(appIconMode) => update({ appIconMode })}
          />
          {settings.appIconMode === "default" ? (
            <div className="flex items-center gap-4 border-t border-line/80 pt-4">
              <img
                src={defaultIconSrc}
                alt="Ícone padrão do aplicativo"
                className="h-14 w-14 shrink-0 rounded-[3px] border border-line bg-black object-contain"
              />
              <div>
                <p className="text-[13px] font-medium text-ink">Ícone padrão</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Este ícone será usado nos temas claro e escuro.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="inline-flex gap-1 rounded-[3px] border border-line bg-card p-0.5" role="group" aria-label="Tema do ícone">
                {[
                  { value: "light", label: "Claro" },
                  { value: "dark", label: "Escuro" },
                ].map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    aria-pressed={iconTheme === theme.value}
                    onClick={() => setIconTheme(theme.value)}
                    className={`h-8 rounded-[2px] px-3 text-xs font-medium ${
                      iconTheme === theme.value
                        ? "bg-pine text-white"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
              <ImageSetting
                label={`Ícone para tema ${iconTheme === "light" ? "claro" : "escuro"}`}
                description="PNG, JPG ou WebP · até 1 MB. PNG mantém o fundo transparente."
                value={
                  iconTheme === "light"
                    ? settings.appIconLightDataUrl
                    : settings.appIconDarkDataUrl
                }
                fallbackSrc={defaultIconSrc}
                onChange={onImageChange(
                  iconTheme === "light" ? "appIconLightDataUrl" : "appIconDarkDataUrl",
                )}
                onClear={() =>
                  update({
                    [iconTheme === "light" ? "appIconLightDataUrl" : "appIconDarkDataUrl"]: "",
                  })
                }
              />
            </>
          )}
        </div>
      )}
    </SettingsCard>
  );
}

function ThemeSettings({ activeField, settings, update }) {
  const toggleAccent = (id, checked) => {
    const nextAccents = checked
      ? [...settings.allowedAccents, id]
      : settings.allowedAccents.filter((accent) => accent !== id);
    if (nextAccents.length === 0) return;
    update({
      allowedAccents: nextAccents,
      accent: nextAccents.includes(settings.accent) ? settings.accent : nextAccents[0],
    });
  };
  const toggleTheme = (theme, checked) => {
    const allowedThemes = checked
      ? [...settings.allowedThemes, theme]
      : settings.allowedThemes.filter((item) => item !== theme);
    if (allowedThemes.length === 0) return;
    update({
      allowedThemes,
      theme: allowedThemes.includes(settings.theme) ? settings.theme : "system",
    });
  };
  const setDefaultTheme = (theme) => {
    update({
      theme,
      allowedThemes:
        theme === "system" || settings.allowedThemes.includes(theme)
          ? settings.allowedThemes
          : [...settings.allowedThemes, theme],
    });
  };
  const setDefaultAccent = (accent) => {
    update({
      accent,
      allowedAccents: settings.allowedAccents.includes(accent)
        ? settings.allowedAccents
        : [...settings.allowedAccents, accent],
    });
  };

  const field = {
    aparencia: {
      title: "Aparência",
      description: "Defina se as pessoas podem personalizar a aparência do app.",
    },
    temaPadrao: {
      title: "Tema padrão",
      description: "Escolha o tema inicial para quem não tiver uma preferência salva.",
    },
    temasDisponiveis: {
      title: "Temas disponíveis",
      description: "Defina quais temas os usuários podem escolher.",
    },
    corPadrao: {
      title: "Cor padrão (Paleta do app)",
      description: "Escolha a paleta inicial do aplicativo (cor principal, secundária/hover, fundo suave e textos).",
    },
    coresDisponiveis: {
      title: "Cores disponíveis (Paletas)",
      description: "Defina quais paletas de cores os usuários podem escolher nas configurações do aplicativo.",
    },
  }[activeField];

  return (
    <SettingsCard title={field.title} description={field.description}>
      {activeField === "aparencia" ? (
        <SettingSwitch
          checked={settings.allowAppearanceChanges}
          onChange={(allowAppearanceChanges) => update({ allowAppearanceChanges })}
          label="Permitir que usuários alterem a aparência"
          description="Quando desativado, tema e cor ficam definidos pelo administrador."
        />
      ) : null}
      {activeField === "temaPadrao" ? (
        <fieldset>
          <legend className="text-sm font-semibold">Tema padrão</legend>
          <ChoiceGroup
            label="Tema padrão"
            value={settings.theme}
            choices={THEMES}
            onChange={setDefaultTheme}
          />
        </fieldset>
      ) : null}
      {activeField === "temasDisponiveis" ? (
        <fieldset>
          <legend className="text-sm font-semibold">Temas que usuários podem escolher</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              { value: "light", label: "Claro" },
              { value: "dark", label: "Escuro" },
            ].map((theme) => (
              <label key={theme.value} className="flex items-center gap-3 rounded-[3px] border border-line bg-card px-3 py-2">
                <input
                  type="checkbox"
                  checked={settings.allowedThemes.includes(theme.value)}
                  onChange={(event) => toggleTheme(theme.value, event.target.checked)}
                  disabled={
                    settings.allowedThemes.length === 1 &&
                    settings.allowedThemes.includes(theme.value)
                  }
                  className="h-4 w-4 rounded-[2px] accent-pine"
                />
                <span className="text-[13px] font-medium text-ink">{theme.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {activeField === "corPadrao" ? (
        <fieldset>
          <legend className="text-sm font-semibold">Paleta padrão do aplicativo</legend>
          <AccentChoices
            value={settings.accent}
            accents={ACCENT_OPTIONS}
            onChange={setDefaultAccent}
          />
        </fieldset>
      ) : null}
      {activeField === "coresDisponiveis" ? (
        <fieldset>
          <legend className="text-sm font-semibold">Paletas disponíveis para usuários</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ACCENT_OPTIONS.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-3 rounded-[3px] border border-line bg-card/50 px-3 py-2.5 transition-colors hover:bg-card"
              >
                <input
                  type="checkbox"
                  checked={settings.allowedAccents.includes(option.id)}
                  onChange={(event) => toggleAccent(option.id, event.target.checked)}
                  disabled={
                    settings.allowedAccents.length === 1 &&
                    settings.allowedAccents.includes(option.id)
                  }
                  className="h-4 w-4 shrink-0 rounded-[2px] accent-pine"
                />
                <PaletteSwatchBar option={option} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{option.label}</span>
                  {option.description ? (
                    <span className="block truncate text-[11px] text-ink-soft">{option.description}</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </SettingsCard>
  );
}

function ViewSettings({ activeField, settings, update }) {
  const field = {
    visualizacaoInicial: {
      title: "Visualização inicial",
      description: "Escolha qual conteúdo da música será exibido primeiro.",
    },
    tamanhoLetra: {
      title: "Tamanho da letra",
      description: "Defina o tamanho inicial da letra no leitor.",
    },
    cronologia: {
      title: "Cronologia",
      description: "Escolha se a cronologia da música começa ativada.",
    },
  }[activeField];

  return (
    <SettingsCard title={field.title} description={field.description}>
      {activeField === "visualizacaoInicial" ? (
        <fieldset>
          <legend className="text-sm font-semibold">Visualização inicial da música</legend>
          <ChoiceGroup
            label="Visualização inicial da música"
            value={settings.defaultSongView}
            choices={SONG_VIEWS}
            onChange={(defaultSongView) => update({ defaultSongView })}
          />
        </fieldset>
      ) : null}
      {activeField === "tamanhoLetra" ? (
        <label className="block">
          <span className="flex items-center justify-between gap-4 text-sm font-semibold">
            Tamanho padrão da letra
            <span className="font-mono font-normal tabular-nums text-ink-soft">{settings.fontSize}px</span>
          </span>
          <input
            type="range"
            min={APP_SETTING_LIMITS.fontSize.min}
            max={APP_SETTING_LIMITS.fontSize.max}
            step="2"
            value={settings.fontSize}
            aria-label="Tamanho padrão da letra"
            onChange={(event) => update({ fontSize: Number(event.target.value) })}
            className="mt-3 w-full accent-pine"
          />
        </label>
      ) : null}
      {activeField === "cronologia" ? (
        <SettingSwitch
          checked={settings.showChronological}
          onChange={(showChronological) => update({ showChronological })}
          label="Iniciar com a cronologia ativada"
          description="Repete o refrão depois de cada estrofe quando a música tem cronologia."
        />
      ) : null}
    </SettingsCard>
  );
}

function AccessSettings({ activeField, settings, update }) {
  const updateMenu = (id, checked) => {
    update({ menuAccess: { ...settings.menuAccess, [id]: checked } });
  };

  const field = {
    menus: {
      title: "Menus disponíveis",
      description: "Escolha quais menus aparecem para os usuários.",
    },
    temasMusicas: {
      title: "Temas de músicas",
      description: "Controle a criação e o gerenciamento de temas pessoais.",
    },
    controles: {
      title: "Controles indisponíveis",
      description: "Defina como exibir cifra ou vozes ausentes em uma música.",
    },
    audio: {
      title: "Áudio sem demonstração",
      description: "Defina como exibir o botão quando não há áudio disponível.",
    },
  }[activeField];

  return (
    <SettingsCard title={field.title} description={field.description}>
      {activeField === "menus" ? (
        <>
          <fieldset>
            <legend className="text-sm font-semibold">Menus disponíveis</legend>
            <div className="mt-3 space-y-2">
              {MENU_OPTIONS.map((menu) => (
                <SettingSwitch
                  key={menu.id}
                  checked={settings.menuAccess[menu.id]}
                  onChange={(checked) => updateMenu(menu.id, checked)}
                  label={menu.label}
                  description={menu.description}
                  compact
                />
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-ink-soft">
            Menus desativados ficam ocultos ou bloqueados conforme a opção correspondente; o acesso
            direto pela URL também é impedido.
          </p>
        </>
      ) : null}
      {activeField === "temasMusicas" ? (
        <SettingSwitch
          checked={settings.songThemesEnabled}
          onChange={(songThemesEnabled) => update({ songThemesEnabled })}
          label="Permitir que usuários criem e gerenciem temas de músicas"
          description="Atualmente cada pessoa mantém suas próprias listas neste dispositivo."
        />
      ) : null}
      {activeField === "controles" ? (
        <fieldset>
          <legend className="text-sm font-semibold">Controles indisponíveis</legend>
          <p className="mt-1 text-xs text-ink-soft">
            Por exemplo, cifra ou vozes quando a música não tem esses dados.
          </p>
          <ChoiceGroup
            label="Controles indisponíveis"
            value={settings.unavailableControlsBehavior}
            choices={[
              { value: "hidden", label: "Ocultar" },
              { value: "locked", label: "Mostrar bloqueado" },
            ]}
            onChange={(unavailableControlsBehavior) => update({ unavailableControlsBehavior })}
          />
        </fieldset>
      ) : null}
      {activeField === "audio" ? (
        <fieldset>
          <legend className="text-sm font-semibold">Botão de áudio sem demonstração</legend>
          <ChoiceGroup
            label="Botão de áudio sem demonstração"
            value={settings.missingAudioBehavior}
            choices={[
              { value: "hidden", label: "Ocultar" },
              { value: "disabled", label: "Desativar" },
              { value: "locked", label: "Mostrar bloqueado" },
            ]}
            onChange={(missingAudioBehavior) => update({ missingAudioBehavior })}
          />
        </fieldset>
      ) : null}
    </SettingsCard>
  );
}

function SettingsCard({ title, description, children }) {
  return (
    <section className="space-y-5">
      <div className="border-b border-line/80 pb-4">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ImageSetting({ label, description, value, fallbackSrc, onChange, onClear }) {
  const previewSrc = value || fallbackSrc;
  return (
    <div className="border-t border-line/80 pt-4">
      <p className="text-[13px] font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
      <div className="mt-3 flex items-center gap-3">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={`Prévia de ${label.toLowerCase()}`}
            className="h-14 w-14 shrink-0 rounded-[3px] border border-line bg-black object-contain"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-[3px] border border-dashed border-line bg-card text-xs text-ink-soft">
            Sem imagem
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-8.5 cursor-pointer items-center rounded-[3px] border border-line bg-card px-3 text-xs font-medium text-ink hover:bg-paper">
            Enviar imagem
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onChange}
              className="sr-only"
            />
          </label>
          {value ? (
            <button type="button" onClick={onClear} className="h-8.5 rounded-[3px] border border-danger/30 bg-card px-3 text-xs font-medium text-danger hover:bg-danger-soft">
              Remover
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PaletteSwatchBar({ option }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-6 w-12 shrink-0 overflow-hidden rounded-[2px] border border-black/15"
    >
      <span style={{ backgroundColor: option.swatch }} className="h-full flex-1" title="Cor principal" />
      <span style={{ backgroundColor: option.secondarySwatch || option.swatch }} className="h-full flex-1" title="Cor secundária / hover" />
      <span style={{ backgroundColor: option.paperSwatch || "#f4f7fb" }} className="h-full flex-1" title="Fundo neutro" />
      <span style={{ backgroundColor: option.textSwatch || "#0f172a" }} className="h-full w-2.5" title="Texto" />
    </span>
  );
}

function AccentChoices({ value, accents, onChange }) {
  return (
    <div role="radiogroup" aria-label="Cor padrão" className="mt-3 grid gap-2 sm:grid-cols-2">
      {accents.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.id)}
            className={`flex items-center gap-3 rounded-[3px] border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pine ${
              selected
                ? "border-pine bg-card"
                : "border-line bg-card/50 hover:bg-card"
            }`}
          >
            <PaletteSwatchBar option={option} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">{option.label}</span>
              {option.description ? (
                <span className="block truncate text-[11px] text-ink-soft">{option.description}</span>
              ) : null}
            </span>
            <span
              aria-hidden
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border ${
                selected ? "border-pine bg-pine text-white" : "border-line bg-card"
              }`}
            >
              {selected ? (
                <svg
                  viewBox="0 0 20 20"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m4.5 10.5 3.5 3.5 7.5-7.5" />
                </svg>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChoiceGroup({ label, value, choices, onChange }) {
  return (
    <div className="mt-3 inline-flex flex-wrap gap-1 rounded-[3px] border border-line bg-card p-0.5" role="group" aria-label={label}>
      {choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          aria-pressed={value === choice.value}
          onClick={() => onChange(choice.value)}
          className={`h-8 rounded-[2px] px-3.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pine ${
            value === choice.value
              ? "bg-pine text-white"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}

function SettingSwitch({ checked, onChange, label, description, compact = false }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 border-b border-line/70 ${compact ? "py-2.5" : "py-3"}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded-[2px] accent-pine"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{description}</span> : null}
      </span>
    </label>
  );
}
