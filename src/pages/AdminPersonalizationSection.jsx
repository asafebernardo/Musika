import { useEffect, useState } from "react";
import { request } from "@/api/songs.js";
import {
  APP_SETTING_LIMITS,
  APP_SETTINGS_DEFAULTS,
  applyAppBranding,
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
    "--paper": isDark ? "0 0 0" : "243 239 230",
    "--card": isDark ? "18 18 18" : "255 253 248",
    "--ink": isDark ? "245 245 245" : "28 25 21",
    "--ink-soft": isDark ? "163 163 163" : "109 102 92",
    "--line": isDark ? "42 42 42" : "230 222 208",
    "--pine": isDark ? accent.darkPine : accent.pine,
    "--pine-dark": isDark ? accent.darkPineDark : accent.pineDark,
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={save} className="space-y-5">
        {activeTab === "identidade" ? (
          <IdentitySettings
            settings={settings}
            update={update}
            onImageChange={handleImageChange}
          />
        ) : activeTab === "temas" ? (
          <ThemeSettings settings={settings} update={update} />
        ) : activeTab === "visualizacao" ? (
          <ViewSettings settings={settings} update={update} />
        ) : (
          <AccessSettings settings={settings} update={update} />
        )}

        {error ? (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-xl border border-pine/20 bg-pine/5 px-4 py-3 text-sm text-pine">
            {notice}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setSettings({ ...APP_SETTINGS_DEFAULTS, menuAccess: { ...APP_SETTINGS_DEFAULTS.menuAccess } });
              setError("");
              setNotice("");
            }}
            disabled={loading || saving}
            className="h-10 rounded-lg border border-line px-4 text-sm font-medium hover:bg-card disabled:opacity-50"
          >
            Restaurar padrão inicial
          </button>
          <button
            type="submit"
            disabled={loading || saving}
            className="h-10 rounded-lg bg-pine px-5 text-sm font-semibold text-white hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar personalização"}
          </button>
        </div>
      </form>

      <aside className="xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold">Prévia do app</h3>
            <p className="mt-1 text-xs text-ink-soft">Exemplo com os padrões selecionados.</p>
          </div>
          <div className="mx-auto mt-4 max-w-[260px] rounded-[2rem] border-[5px] border-neutral-800 bg-neutral-800 p-1.5 shadow-lg">
            <div style={previewStyle} className="overflow-hidden rounded-[1.5rem] bg-paper text-ink">
              <div className="flex h-10 items-center gap-2 bg-pine px-3 text-[10px] font-semibold text-white">
                {settings.appIconDataUrl || settings.appLogoDataUrl ? (
                  <img
                    src={settings.appIconDataUrl || settings.appLogoDataUrl}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{settings.appName}</span>
                <span aria-hidden>•••</span>
              </div>
              <div className="min-h-64 bg-paper px-4 py-4">
                <span className="inline-flex rounded-full bg-pine/10 px-2 py-1 text-[10px] font-medium text-pine">
                  {SONG_VIEWS.find((item) => item.value === settings.defaultSongView)?.label}
                </span>
                <h4 className="mt-3 text-sm font-semibold">Uma canção de exemplo</h4>
                <p className="mt-3 whitespace-pre-line leading-relaxed" style={{ fontSize: settings.fontSize }}>
                  {"A letra será exibida neste tamanho.\n\nO tema e a cor acompanham a seleção."}
                </p>
                <div className="mt-4 rounded-lg border border-line bg-card px-3 py-2 text-[10px] text-ink-soft">
                  Prévia de áudio {settings.missingAudioBehavior === "hidden" ? "oculta" : "indisponível"}
                </div>
              </div>
              <div className="h-1 bg-pine" />
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-ink-soft">
            Tema: {THEMES.find((item) => item.value === settings.theme)?.label} · Cor: {accent.label}
          </p>
        </div>
      </aside>
    </div>
  );
}

function IdentitySettings({ settings, update, onImageChange }) {
  return (
    <SettingsCard
      title="Identidade do aplicativo"
      description={`Nome, logo e ícone que identificam ${settings.appName} no app.`}
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Nome do aplicativo</span>
        <input
          value={settings.appName}
          onChange={(event) => update({ appName: event.target.value })}
          maxLength={40}
          required
          className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
        />
        <span className="block text-xs text-ink-soft">Até 40 caracteres.</span>
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <ImageSetting
          label="Logo"
          description="PNG, JPG ou WebP · até 1 MB"
          value={settings.appLogoDataUrl}
          onChange={onImageChange("appLogoDataUrl")}
          onClear={() => update({ appLogoDataUrl: "" })}
        />
        <ImageSetting
          label="Ícone do aplicativo"
          description="Usado como ícone e favicon quando suportado."
          value={settings.appIconDataUrl}
          onChange={onImageChange("appIconDataUrl")}
          onClear={() => update({ appIconDataUrl: "" })}
        />
      </div>
    </SettingsCard>
  );
}

function ThemeSettings({ settings, update }) {
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

  return (
    <SettingsCard
      title="Temas e cores"
      description="Escolha o padrão visual e quais cores as pessoas poderão selecionar."
    >
      <SettingSwitch
        checked={settings.allowAppearanceChanges}
        onChange={(allowAppearanceChanges) => update({ allowAppearanceChanges })}
        label="Permitir que usuários alterem a aparência"
        description="Quando desativado, tema e cor ficam definidos pelo administrador."
      />
      <fieldset>
        <legend className="text-sm font-semibold">Tema padrão</legend>
        <ChoiceGroup
          label="Tema padrão"
          value={settings.theme}
          choices={THEMES}
          onChange={setDefaultTheme}
        />
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Temas que usuários podem escolher</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            { value: "light", label: "Claro" },
            { value: "dark", label: "Escuro" },
          ].map((theme) => (
            <label key={theme.value} className="flex items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2.5">
              <input
                type="checkbox"
                checked={settings.allowedThemes.includes(theme.value)}
                onChange={(event) => toggleTheme(theme.value, event.target.checked)}
                disabled={
                  settings.allowedThemes.length === 1 &&
                  settings.allowedThemes.includes(theme.value)
                }
                className="h-4 w-4 accent-pine"
              />
              <span className="text-sm">{theme.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Cor padrão</legend>
        <AccentChoices
          value={settings.accent}
          accents={ACCENT_OPTIONS.filter((option) => settings.allowedAccents.includes(option.id))}
          onChange={(accent) => update({ accent })}
        />
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Cores disponíveis para usuários</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {ACCENT_OPTIONS.map((option) => (
            <label key={option.id} className="flex items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2.5">
              <input
                type="checkbox"
                checked={settings.allowedAccents.includes(option.id)}
                onChange={(event) => toggleAccent(option.id, event.target.checked)}
                disabled={
                  settings.allowedAccents.length === 1 &&
                  settings.allowedAccents.includes(option.id)
                }
                className="h-4 w-4 accent-pine"
              />
              <span style={{ backgroundColor: option.swatch }} className="h-5 w-5 rounded-full border border-black/10" />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-ink-soft">
        A aparência padrão continua valendo para quem não tiver uma preferência pessoal salva.
      </p>
    </SettingsCard>
  );
}

function ViewSettings({ settings, update }) {
  return (
    <SettingsCard
      title="Visualização"
      description="Defina como a música será exibida por padrão."
    >
      <fieldset>
        <legend className="text-sm font-semibold">Visualização inicial da música</legend>
        <ChoiceGroup
          label="Visualização inicial da música"
          value={settings.defaultSongView}
          choices={SONG_VIEWS}
          onChange={(defaultSongView) => update({ defaultSongView })}
        />
      </fieldset>
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
      <SettingSwitch
        checked={settings.showChronological}
        onChange={(showChronological) => update({ showChronological })}
        label="Iniciar com a cronologia ativada"
        description="Repete o refrão depois de cada estrofe quando a música tem cronologia."
      />
    </SettingsCard>
  );
}

function AccessSettings({ settings, update }) {
  const updateMenu = (id, checked) => {
    update({ menuAccess: { ...settings.menuAccess, [id]: checked } });
  };

  return (
    <SettingsCard
      title="Acesso e ações"
      description="Controle menus e botões que aparecem para usuários finais."
    >
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
      <SettingSwitch
        checked={settings.songThemesEnabled}
        onChange={(songThemesEnabled) => update({ songThemesEnabled })}
        label="Permitir que usuários criem e gerenciem temas de músicas"
        description="Atualmente cada pessoa mantém suas próprias listas neste dispositivo."
      />
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
      <p className="text-xs text-ink-soft">
        Menus desativados ficam ocultos ou bloqueados conforme a opção acima; o acesso direto pela
        URL também é impedido.
      </p>
    </SettingsCard>
  );
}

function SettingsCard({ title, description, children }) {
  return (
    <section className="space-y-6 rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ImageSetting({ label, description, value, onChange, onClear }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs text-ink-soft">{description}</p>
      <div className="mt-3 flex items-center gap-3">
        {value ? (
          <img src={value} alt={`Prévia de ${label.toLowerCase()}`} className="h-14 w-14 rounded-xl border border-line bg-card object-contain p-1" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-line bg-card text-xs text-ink-soft">
            Sem imagem
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-line bg-card px-3 text-sm font-medium hover:bg-paper">
            Enviar imagem
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onChange}
              className="sr-only"
            />
          </label>
          {value ? (
            <button type="button" onClick={onClear} className="h-9 rounded-lg px-3 text-sm text-danger hover:bg-danger-soft">
              Remover
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AccentChoices({ value, accents, onChange }) {
  return (
    <div role="radiogroup" aria-label="Cor padrão" className="mt-3 flex flex-wrap gap-3">
      {accents.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          aria-label={option.label}
          title={option.label}
          onClick={() => onChange(option.id)}
          style={{ backgroundColor: option.swatch }}
          className={`h-9 w-9 rounded-full border border-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
            value === option.id ? "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-card" : "opacity-85 hover:opacity-100"
          }`}
        />
      ))}
    </div>
  );
}

function ChoiceGroup({ label, value, choices, onChange }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1 rounded-xl border border-line bg-paper p-1" role="group" aria-label={label}>
      {choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          aria-pressed={value === choice.value}
          onClick={() => onChange(choice.value)}
          className={`min-h-9 flex-1 rounded-lg px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine ${
            value === choice.value
              ? "bg-card text-ink shadow-sm"
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
    <label className={`flex items-start gap-3 rounded-xl border border-line bg-paper ${compact ? "p-3" : "p-4"}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-pine"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{description}</span> : null}
      </span>
    </label>
  );
}
