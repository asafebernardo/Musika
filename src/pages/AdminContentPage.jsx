import { useEffect, useMemo, useState } from "react";
import {
  createSong,
  deleteSong,
  getAudioUrl,
  messageForSongError,
  request,
  updateSong,
} from "@/api/songs.js";
import ChordEditor from "@/components/ChordEditor.jsx";
import Lyrics from "@/components/Lyrics.jsx";
import LyricEditor from "@/components/LyricEditor.jsx";
import MarqueeText from "@/components/MarqueeText.jsx";
import SongScroll from "@/components/SongScroll.jsx";
import VocalArrangementEditor from "@/components/VocalArrangementEditor.jsx";
import { emptySongForm, fieldsFromSong, payloadFromSongForm } from "@/lib/songEditor.js";
import { filterSongs, withNumbers } from "@/lib/songs.js";
import { getAppSettings } from "@/lib/appSettings.js";
import { ACCENT_OPTIONS, useAccent, useTheme } from "@/lib/theme.js";
import AdminPersonalizationSection from "@/pages/AdminPersonalizationSection.jsx";
import AdminRegistriesSection from "@/pages/AdminRegistriesSection.jsx";
import AdminFinalPreviewSection from "@/pages/AdminFinalPreviewSection.jsx";
import AdminProjectExportSection from "@/pages/AdminProjectExportSection.jsx";
import AdminSlidesEditorSection from "@/pages/AdminSlidesEditorSection.jsx";
import UserProfileMenu from "@/components/UserProfileMenu.jsx";

const PERSONALIZATION_SECTIONS = [
  { id: "identidade", label: "Identidade" },
  { id: "temas", label: "Temas e Cores" },
  { id: "visualizacao", label: "Leitura Padrão" },
  { id: "acoes", label: "Permissões e Menus" },
];

const USER_ACCOUNT_SECTIONS = [
  { id: "perfil", label: "Meu Perfil e Contato" },
  { id: "plano", label: "Plano Pago Atual" },
  { id: "faturas", label: "Faturas e Recibos" },
  { id: "dados-pagamento", label: "Dados de Pagamento" },
  { id: "forma-pagamento", label: "Forma de Pagamento" },
];

const SIDEBAR_GROUPS = [
  {
    id: "edicao",
    label: "Edição",
    items: [
      { id: "letra", label: "Letra & Áudio", icon: LyricIcon },
      { id: "vozes", label: "Arranjo de Vozes", icon: VoicesPartsIcon },
      { id: "cifra", label: "Cifras & Tons", icon: ChordIcon },
      { id: "slides", label: "Projeção (Slides)", icon: SlidesIcon },
    ],
  },
  {
    id: "sistema",
    label: "Catálogo & Sistema",
    items: [
      { id: "temas-musicas", label: "Temas & Listas", icon: RegistryIcon },
      { id: "ficha-tecnica", label: "Fichas Técnicas", icon: SongMetadataIcon },
      { id: "personalizacao", label: "Aparência do App", icon: SettingsIcon },
      { id: "acessos", label: "Equipe & Acessos", icon: PeopleIcon },
      { id: "minha-conta", label: "Minha Conta", icon: UserAccountIcon },
    ],
  },
  {
    id: "publicacao",
    label: "Publicação",
    items: [
      { id: "previa-final", label: "Simulador do App", icon: FinalPreviewIcon },
      { id: "gerar-projeto", label: "Exportar & Publicar", icon: ProjectExportIcon },
    ],
  },
];

const PREVIEW_MODES = [
  { id: "letra", label: "Letra" },
  { id: "vozes", label: "Vozes" },
  { id: "cifra", label: "Cifra" },
];

const SECTION_TITLES = {
  letra: "Letra & Áudio",
  vozes: "Arranjo de Vozes",
  cifra: "Cifras & Tons",
  slides: "Projeção (Slides)",
  "temas-musicas": "Temas & Listas",
  "ficha-tecnica": "Fichas Técnicas",
  personalizacao: "Aparência do App",
  "previa-final": "Simulador do App",
  "gerar-projeto": "Exportar & Publicar",
  acessos: "Equipe & Acessos",
  "minha-conta": "Minha Conta",
};

export default function AdminContentPage({ user, onLogout, accessPanel }) {
  const { appName } = getAppSettings();
  const [songs, setSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeSection, setActiveSection] = useState("letra");
  const [activePersonalizationSection, setActivePersonalizationSection] = useState("identidade");
  const [activeUserAccountSection, setActiveUserAccountSection] = useState("perfil");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewOrientation, setPreviewOrientation] = useState("portrait");
  const [customPreviewMode, setCustomPreviewMode] = useState(null);
  const [customPreviewTheme, setCustomPreviewTheme] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...emptySongForm });
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingSongs(true);
    request("/api/songs")
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("erro_interno");
        if (active) setSongs(data);
      })
      .catch((loadError) => {
        if (active) {
          setLoadError(messageForSongError(loadError));
        }
      })
      .finally(() => {
        if (active) setLoadingSongs(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!previewOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewOpen]);

  const selectedSong = songs.find((song) => song.id === selectedId) ?? null;
  const visibleSongs = useMemo(() => filterSongs(songs, search), [songs, search]);
  const isAccessSection = activeSection === "acessos";
  const isUserAccountSection = activeSection === "minha-conta";
  const isRegistrySection =
    activeSection === "temas-musicas" || activeSection === "ficha-tecnica";
  const activeRegistryTab = activeSection === "ficha-tecnica" ? "informacoes" : "temas";
  const isPersonalizationSection = activeSection === "personalizacao";
  const isSlidesSection = activeSection === "slides";
  const isFinalPreviewSection = activeSection === "previa-final";
  const isProjectExportSection = activeSection === "gerar-projeto";
  const isUtilitySection =
    isAccessSection ||
    isUserAccountSection ||
    isRegistrySection ||
    isPersonalizationSection ||
    isSlidesSection ||
    isFinalPreviewSection ||
    isProjectExportSection;
  const isSongSection = ["letra", "vozes", "cifra"].includes(activeSection);
  const hasSideMobilePreview = isSongSection;
  const previewMode = customPreviewMode || (isSongSection ? activeSection : "letra");
  const number = withNumbers(songs).find((song) => song.id === selectedId)?.numero;

  useEffect(() => {
    if (["letra", "vozes", "cifra"].includes(activeSection)) {
      setCustomPreviewMode(null);
    }
  }, [activeSection]);

  const handleSongSavedFromRegistry = (savedSong) => {
    setSongs((current) =>
      withNumbers([
        ...current.filter((song) => song.id !== savedSong.id),
        savedSong,
      ]),
    );
    if (selectedId === savedSong.id) {
      setForm(fieldsFromSong(savedSong));
    }
  };

  const updateForm = (updates) => {
    setForm((current) => ({ ...current, ...updates }));
    setDirty(true);
    setError("");
    setNotice("");
  };

  const startNewSong = () => {
    if (dirty && !window.confirm("Descartar as alterações não salvas?")) return;
    setSelectedId(null);
    setEditing(true);
    setForm({ ...emptySongForm });
    setDirty(false);
    setError("");
    setNotice("");
    setActiveSection("letra");
  };

  const selectSong = (song) => {
    if (dirty && !window.confirm("Descartar as alterações não salvas?")) return;
    setSelectedId(song.id);
    setEditing(true);
    setForm(fieldsFromSong(song));
    setDirty(false);
    setError("");
    setNotice("");
    setActiveSection("letra");
  };

  const discardChanges = () => {
    if (selectedSong) {
      setForm(fieldsFromSong(selectedSong));
      setEditing(true);
    } else {
      setForm({ ...emptySongForm });
      setEditing(false);
      setActiveSection("letra");
    }
    setDirty(false);
    setError("");
    setNotice("");
  };

  const saveSong = async () => {
    if (!form.titulo.trim()) {
      setActiveSection("letra");
      setError("Informe o título antes de salvar a música.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = payloadFromSongForm(form);
      const result = selectedId
        ? await updateSong(selectedId, payload)
        : await createSong(payload);
      const saved = result.song;
      setSongs((current) =>
        withNumbers([
          ...current.filter((song) => song.id !== saved.id),
          saved,
        ]),
      );
      setSelectedId(saved.id);
      setEditing(true);
      setForm(fieldsFromSong(saved));
      setDirty(false);
      setNotice("Alterações salvas. A prévia já reflete o resultado.");
    } catch (saveError) {
      setError(messageForSongError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const removeSong = async (song) => {
    if (!window.confirm(`Excluir “${song.titulo}” do catálogo? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await deleteSong(song.id);
      setSongs((current) => current.filter((entry) => entry.id !== song.id));
      if (selectedId === song.id) {
        setSelectedId(null);
        setEditing(false);
        setForm({ ...emptySongForm });
        setDirty(false);
        setActiveSection("letra");
      }
      setNotice("Música excluída do catálogo.");
    } catch (deleteError) {
      setError(messageForSongError(deleteError));
    }
  };

  const handleAudioChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string" || !reader.result) {
        setError("Não foi possível ler o arquivo de áudio.");
        return;
      }
      updateForm({
        audioDataUrl: reader.result,
        audioNome: file.name,
        removeAudio: false,
      });
    };
    reader.onerror = () => setError("Não foi possível ler o arquivo de áudio.");
    reader.readAsDataURL(file);
  };

  const clearAudio = () => {
    updateForm({
      audioDataUrl: "",
      audioNome: "",
      removeAudio: true,
    });
  };

  const activeGroup = SIDEBAR_GROUPS.find((group) =>
    group.items.some((item) => item.id === activeSection),
  );

  return (
    <div className="flex h-full min-h-0 w-full bg-paper text-ink">
      <aside
        className={`hidden shrink-0 flex-col border-r border-line bg-card transition-[width] duration-200 lg:flex ${
          sidebarCollapsed ? "w-[68px]" : "w-60"
        }`}
      >
        <div
          className={`flex items-center border-b border-line ${
            sidebarCollapsed ? "justify-center px-2 py-4" : "justify-between gap-2 px-4 py-4"
          }`}
        >
          {!sidebarCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                {appName}
              </p>
              <h1 className="mt-0.5 truncate text-sm font-semibold tracking-tight text-ink">
                Estúdio de edição
              </h1>
              <p className="mt-0.5 truncate text-[11px] text-ink-soft">Painel administrativo</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            title={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-paper text-ink-soft transition-colors hover:border-ink-soft/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
          >
            <SidebarCollapseIcon collapsed={sidebarCollapsed} className="h-4 w-4" />
          </button>
        </div>

        <nav
          className={`flex-1 overflow-y-auto ${
            sidebarCollapsed ? "space-y-4 px-2 py-4" : "space-y-6 px-3 py-5"
          }`}
          aria-label="Seções do painel"
        >
          {SIDEBAR_GROUPS.map((group, groupIndex) => (
            <div
              key={group.id}
              className={
                sidebarCollapsed && groupIndex > 0 ? "border-t border-line pt-3" : undefined
              }
            >
              {!sidebarCollapsed ? (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft/75">
                  {group.label}
                </p>
              ) : (
                <p className="sr-only">{group.label}</p>
              )}

              <div className="space-y-0.5" role="group" aria-label={group.label}>
                {group.items.map((item) => (
                  <SidebarButton
                    key={item.id}
                    active={activeSection === item.id}
                    collapsed={sidebarCollapsed}
                    icon={item.icon}
                    label={item.label}
                    onClick={() => setActiveSection(item.id)}
                  >
                    {item.label}
                  </SidebarButton>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-2.5">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            title={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            className={`flex h-9 w-full items-center rounded-lg text-xs font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink ${
              sidebarCollapsed ? "justify-center px-0" : "gap-2.5 px-3"
            }`}
          >
            <SidebarCollapseIcon collapsed={sidebarCollapsed} className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed ? <span>Recolher menu</span> : null}
          </button>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-line bg-card">
          <div className="flex min-h-14 items-center gap-2 px-3 sm:gap-4 sm:px-7">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-ink-soft">
                Administração{activeGroup ? ` / ${activeGroup.label}` : ""} /{" "}
                {SECTION_TITLES[activeSection]}
              </p>
              <h2 className="truncate text-base font-semibold tracking-tight text-ink">
                {editing && !isUtilitySection ? form.titulo || "Nova música" : SECTION_TITLES[activeSection]}
              </h2>
            </div>
            {editing && !isUtilitySection ? (
              <div className="flex shrink-0 items-center gap-2">
                {dirty ? (
                  <button
                    type="button"
                    onClick={discardChanges}
                    className="hidden h-9 rounded-md border border-line px-3.5 text-xs font-medium hover:bg-paper sm:inline-flex sm:items-center sm:text-sm"
                  >
                    Descartar
                  </button>
                ) : null}
                {selectedId ? (
                  <button
                    type="button"
                    onClick={() => selectedSong && removeSong(selectedSong)}
                    className="hidden h-9 rounded-md border border-danger/30 px-3.5 text-xs font-medium text-danger hover:bg-danger-soft sm:inline-flex sm:items-center sm:text-sm"
                  >
                    Excluir
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={saveSong}
                  disabled={saving || !dirty}
                  className="h-9 rounded-md bg-pine px-4 text-xs font-semibold text-white hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  {saving ? "Salvando…" : "Salvar"}
                </button>
              </div>
            ) : null}
            {isSongSection ? (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                aria-haspopup="dialog"
                className="h-9 shrink-0 rounded-md border border-line px-2.5 text-xs font-medium hover:bg-paper sm:px-3 sm:text-sm"
              >
                Visualizar
              </button>
            ) : null}
          </div>
          <nav
            className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 lg:hidden"
            aria-label="Seções do painel"
          >
            {SIDEBAR_GROUPS.flatMap((group) => group.items).map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
                  activeSection === section.id
                    ? "bg-pine text-white"
                    : "text-ink-soft hover:bg-paper"
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
          {isPersonalizationSection ? (
            <nav
              className="flex gap-1.5 overflow-x-auto border-t border-line bg-paper/40 px-3 py-2 sm:px-7"
              aria-label="Submenus de personalização"
            >
              {PERSONALIZATION_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActivePersonalizationSection(section.id)}
                  aria-current={activePersonalizationSection === section.id ? "page" : undefined}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activePersonalizationSection === section.id
                      ? "bg-pine text-white"
                      : "text-ink-soft hover:bg-card hover:text-ink"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          ) : null}
          {isUserAccountSection ? (
            <nav
              className="flex gap-1.5 overflow-x-auto border-t border-line bg-paper/40 px-3 py-2 sm:px-7"
              aria-label="Submenus da minha conta"
            >
              {USER_ACCOUNT_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveUserAccountSection(section.id)}
                  aria-current={activeUserAccountSection === section.id ? "page" : undefined}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeUserAccountSection === section.id
                      ? "bg-pine text-white"
                      : "text-ink-soft hover:bg-card hover:text-ink"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          ) : null}
        </header>

        <div
          className={`grid min-h-0 flex-1 ${
            isUtilitySection
              ? "grid-cols-1 overflow-y-auto"
              : "grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden"
          }`}
        >
          <main
            className={`min-w-0 p-4 sm:p-6 lg:min-h-0 lg:p-8 ${
              activeSection === "letra" && !editing
                ? "flex min-h-0 flex-col overflow-hidden lg:overflow-hidden"
                : "lg:overflow-y-auto"
            }`}
          >
            {isAccessSection ? (
              accessPanel
            ) : isUserAccountSection ? (
              <UserProfileMenu
                user={user}
                onLogout={onLogout}
                inline
                activeTab={activeUserAccountSection}
                onTabChange={setActiveUserAccountSection}
              />
            ) : isRegistrySection ? (
              <AdminRegistriesSection
                activeTab={activeRegistryTab}
                onTabChange={(nextTab) =>
                  setActiveSection(nextTab === "informacoes" ? "ficha-tecnica" : "temas-musicas")
                }
                songs={visibleSongs}
                loadingSongs={loadingSongs}
                onSongSaved={handleSongSavedFromRegistry}
              />
            ) : isPersonalizationSection ? (
              <AdminPersonalizationSection activeTab={activePersonalizationSection} />
            ) : isSlidesSection ? (
              <AdminSlidesEditorSection songs={withNumbers(songs)} loadingSongs={loadingSongs} />
            ) : isFinalPreviewSection ? (
              <AdminFinalPreviewSection songs={withNumbers(songs)} />
            ) : isProjectExportSection ? (
              <AdminProjectExportSection totalSongs={songs.length} />
            ) : (
              <div
                className={`mx-auto w-full max-w-5xl ${
                  activeSection === "letra" && !editing
                    ? "flex min-h-0 flex-1 flex-col"
                    : "space-y-5"
                }`}
              >
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
                {loadError ? (
                  <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                    Não foi possível carregar o catálogo: {loadError}
                  </p>
                ) : null}
                {activeSection === "letra" ? (
                  <>
                    <SongPickerSection
                      songs={visibleSongs}
                      totalSongs={songs.length}
                      loading={loadingSongs}
                      search={search}
                      onSearch={setSearch}
                      selectedId={selectedId}
                      onSelect={selectSong}
                      onNew={startNewSong}
                      fillHeight={!editing}
                    />
                    {editing ? (
                      <SongEditorSection
                        section={activeSection}
                        form={form}
                        onUpdate={updateForm}
                        onAudioChange={handleAudioChange}
                        onClearAudio={clearAudio}
                      />
                    ) : null}
                  </>
                ) : editing ? (
                  <SongEditorSection
                    section={activeSection}
                    form={form}
                    onUpdate={updateForm}
                  />
                ) : (
                  <EmptyEditorSection
                    section={activeSection}
                    onCreate={startNewSong}
                    onGoToLyrics={() => setActiveSection("letra")}
                    hasSongs={songs.length > 0}
                  />
                )}
              </div>
            )}
          </main>

          {hasSideMobilePreview ? (
            <aside className="border-t border-line bg-paper p-4 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
              <MobilePreview
                form={form}
                number={number}
                previewMode={previewMode}
                onPreviewModeChange={setCustomPreviewMode}
                customPreviewTheme={customPreviewTheme}
                onTogglePreviewTheme={(nextTheme) => setCustomPreviewTheme(nextTheme)}
                onOpenExpand={(nextOrientation) => {
                  if (nextOrientation) setPreviewOrientation(nextOrientation);
                  setPreviewOpen(true);
                }}
                editing={editing}
                orientation="portrait"
              />
            </aside>
          ) : null}
        </div>
      </section>
      {previewOpen ? (
        <PreviewModal
          form={form}
          number={number}
          previewMode={previewMode}
          onPreviewModeChange={setCustomPreviewMode}
          customPreviewTheme={customPreviewTheme}
          onTogglePreviewTheme={(nextTheme) => setCustomPreviewTheme(nextTheme)}
          editing={editing}
          orientation={previewOrientation}
          onOrientationChange={setPreviewOrientation}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}

function SidebarButton({ active, collapsed = false, icon: Icon, label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={`group relative flex h-9 w-full items-center rounded-md text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine ${
        collapsed ? "justify-center px-0" : "gap-2.5 px-3 text-left"
      } ${
        active
          ? "bg-paper font-semibold text-ink before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-0.5 before:rounded-r-full before:bg-pine"
          : "font-medium text-ink-soft hover:bg-paper/75 hover:text-ink"
      }`}
    >
      <Icon
        className={`h-[17px] w-[17px] shrink-0 transition-colors ${
          active ? "text-pine" : "text-ink-soft/80 group-hover:text-ink"
        }`}
      />
      {!collapsed ? <span className="truncate">{children}</span> : null}
    </button>
  );
}

function SongMetadataIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M8 8.5h8" />
      <path d="M8 12.5h8" />
      <path d="M8 16.5h5" />
    </svg>
  );
}

function SidebarCollapseIcon({ collapsed, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9 4v16" />
      {collapsed ? (
        <path d="m13 9 3 3-3 3" />
      ) : (
        <path d="m15 9-3 3 3 3" />
      )}
    </svg>
  );
}

function LyricIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 7h14" />
      <path d="M7 12h10" />
      <path d="M6 17h12" />
    </svg>
  );
}

function VoicesPartsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <circle cx="6.4" cy="6.4" r="2.5" className="fill-voice-men" />
      <path className="fill-voice-men" d="M2.2 18.2v-.4c0-2.4 1.85-4.1 4.2-4.1s4.2 1.7 4.2 4.1v.4z" />
      <circle cx="17.6" cy="6.4" r="2.5" className="fill-voice-women" />
      <path className="fill-voice-women" d="M13.4 18.2v-.4c0-2.4 1.85-4.1 4.2-4.1s4.2 1.7 4.2 4.1v.4z" />
    </svg>
  );
}

function ChordIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4.5" y="3.5" width="15" height="17" rx="1.5" />
      <path d="M8 7.5h8" />
      <path d="M8 12h8" />
      <path d="M8 16.5h5" />
      <circle cx="15.5" cy="16.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
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

function PeopleIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20v-1.2a5.5 5.5 0 0 1 11 0V20z" />
      <path d="M16 5.3a3 3 0 0 1 0 5.4M17 14a4.8 4.8 0 0 1 3.5 4.6V20h-3" />
    </svg>
  );
}

function UserAccountIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 19.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function RegistryIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6.5h16M4 12h16M4 17.5h10" />
      <circle cx="18" cy="17.5" r="2.5" />
    </svg>
  );
}

function SlidesIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
      <path d="M7.5 8.5h9" />
      <path d="M9.5 11.5h5" />
    </svg>
  );
}

function FinalPreviewIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10 18.5h4" />
      <path d="m10.5 9.5 4 2.5-4 2.5z" />
    </svg>
  );
}

function ProjectExportIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

function SongPickerSection({
  songs,
  totalSongs,
  loading,
  search,
  onSearch,
  selectedId,
  onSelect,
  onNew,
  fillHeight,
}) {
  return (
    <section
      className={`overflow-hidden rounded-lg border border-line bg-card ${
        fillHeight ? "flex min-h-0 flex-1 flex-col" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-ink">Catálogo de músicas</h3>
            {!loading ? (
              <span className="inline-flex items-center rounded-md border border-line bg-paper px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums text-ink-soft">
                {totalSongs}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-ink-soft">
            Selecione uma música na lista para editar ou crie um novo registro.
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex h-8.5 items-center gap-1.5 rounded-md bg-pine px-3.5 text-xs font-semibold text-white transition-all hover:bg-pine-dark active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine sm:h-9"
        >
          <span aria-hidden className="text-sm leading-none">
            +
          </span>
          Nova música
        </button>
      </div>
      {totalSongs ? (
        <div className="border-b border-line bg-paper/40 px-4 py-2.5 sm:px-5">
          <div className="relative flex items-center">
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-ink-soft"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Filtrar por número, título ou trecho da letra…"
              aria-label="Buscar músicas"
              className="h-9 w-full rounded-md border border-line bg-paper pl-8.5 pr-8 text-xs transition-shadow outline-none focus:border-pine/60 focus:ring-1 focus:ring-pine sm:text-sm"
            />
            {search ? (
              <button
                type="button"
                onClick={() => onSearch("")}
                aria-label="Limpar busca"
                className="absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-soft hover:bg-card hover:text-ink"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {loading ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Carregando catálogo…</p>
      ) : songs.length ? (
        <ul
          className={`divide-y divide-line overflow-y-auto ${
            fillHeight ? "min-h-0 flex-1" : "max-h-60"
          }`}
        >
          {songs.map((song) => {
            const isSelected = selectedId === song.id;
            return (
              <li key={song.id}>
                <button
                  type="button"
                  onClick={() => onSelect(song)}
                  aria-current={isSelected ? "true" : undefined}
                  className={`group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pine sm:px-5 ${
                    isSelected
                      ? "bg-paper before:absolute before:bottom-0 before:left-0 before:top-0 before:w-0.5 before:bg-pine"
                      : "hover:bg-paper/65"
                  }`}
                >
                  <span
                    className={`inline-flex w-10 shrink-0 items-center justify-center rounded border py-0.5 font-mono text-xs font-medium tabular-nums transition-colors ${
                      isSelected
                        ? "border-pine/40 bg-pine/15 text-ink"
                        : "border-line bg-paper text-ink-soft group-hover:text-ink"
                    }`}
                  >
                    {String(song.numero).padStart(3, "0")}
                  </span>

                  <span
                    className={`min-w-0 flex-1 truncate text-sm transition-colors ${
                      isSelected ? "font-semibold text-ink" : "font-medium text-ink"
                    }`}
                  >
                    {song.titulo}
                  </span>

                  {song.audioArquivo ? (
                    <span
                      title="Com demonstração de áudio"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded border border-line bg-paper px-2 py-0.5 text-[11px] font-medium text-ink"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="hidden sm:inline">Com áudio</span>
                    </span>
                  ) : (
                    <span
                      title="Sem demonstração de áudio"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded border border-line/70 bg-paper/50 px-2 py-0.5 text-[11px] text-ink-soft/75"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-ink-soft/35" />
                      <span className="hidden sm:inline">Sem áudio</span>
                    </span>
                  )}

                  <span
                    className={`inline-flex h-7 shrink-0 items-center gap-1 rounded border px-2 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-pine/40 bg-pine/15 text-ink"
                        : "border-transparent text-ink-soft group-hover:border-line group-hover:bg-card group-hover:text-ink"
                    }`}
                  >
                    <span>{isSelected ? "Editando" : "Editar"}</span>
                    <span
                      aria-hidden
                      className="transition-transform duration-150 group-hover:translate-x-0.5"
                    >
                      ›
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-6 text-sm text-ink-soft">
          {search ? "Nenhuma música encontrada." : "O catálogo ainda está vazio."}
        </p>
      )}
    </section>
  );
}

function SongEditorSection({ section, form, onUpdate, onAudioChange, onClearAudio }) {
  if (section === "letra") {
    return (
      <div className="space-y-5">
        <section className="space-y-5 rounded-lg border border-line bg-card p-5 sm:p-6">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-ink">Informações da música</h3>
            <p className="mt-1 text-xs text-ink-soft sm:text-sm">
              Defina o título e a demonstração de áudio junto com o conteúdo principal.
            </p>
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-medium text-ink-soft sm:text-sm">Título</span>
            <input
              value={form.titulo}
              onChange={(event) => onUpdate({ titulo: event.target.value })}
              maxLength={200}
              placeholder="Título da música"
              className="h-9.5 w-full rounded-md border border-line bg-paper px-3 text-sm outline-none focus:border-pine/60 focus:ring-1 focus:ring-pine"
            />
          </label>
          <div className="space-y-2.5">
            <span className="block text-xs font-medium text-ink-soft sm:text-sm">Demonstração de áudio</span>
            {form.audioDataUrl || (form.audioArquivo && !form.removeAudio) ? (
              <div className="space-y-3 rounded-md border border-line bg-paper p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink sm:text-sm">
                    {form.audioNome || form.audioArquivo}
                  </span>
                  <div className="flex gap-2">
                    <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-line bg-card px-3 text-xs font-medium hover:bg-paper">
                      Trocar áudio
                      <input
                        type="file"
                        accept="audio/*,.mp1,.mp2,.mp3,.mpeg,.wav,.m4a,.ogg,.aac,.flac"
                        className="sr-only"
                        onChange={onAudioChange}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={onClearAudio}
                      className="h-8 rounded-md border border-danger/30 px-3 text-xs font-medium text-danger hover:bg-danger-soft"
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <audio
                  controls
                  preload="metadata"
                  src={form.audioDataUrl || getAudioUrl(form.audioArquivo)}
                  className="h-9 w-full"
                />
              </div>
            ) : (
              <label className="group flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line bg-paper/60 px-4 py-5 text-center text-sm text-ink-soft transition-all duration-150 hover:border-ink-soft/50 hover:bg-paper">
                <span className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-card text-ink-soft transition-transform duration-150 group-hover:scale-105 group-hover:text-ink">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </span>
                <span className="text-xs font-medium text-ink sm:text-sm">
                  Adicionar demonstração de áudio
                </span>
                <span className="mt-0.5 text-xs text-ink-soft">
                  MP3, WAV, M4A, OGG e outros formatos de áudio
                </span>
                <input
                  type="file"
                  accept="audio/*,.mp1,.mp2,.mp3,.mpeg,.wav,.m4a,.ogg,.aac,.flac"
                  className="sr-only"
                  onChange={onAudioChange}
                />
              </label>
            )}
          </div>
        </section>
        <section className="space-y-6 rounded-lg border border-line bg-card p-5 sm:p-6">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-ink">Letra e refrão</h3>
            <p className="mt-1 text-xs text-ink-soft sm:text-sm">
              Edite o texto que será exibido no aplicativo.
            </p>
          </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink-soft sm:text-sm">Letra</label>
          <LyricEditor
            label="Letra"
            text={form.letra}
            marks={[]}
            showVoiceTools={false}
            placeholder={"Primeira estrofe\n\nSegunda estrofe"}
            minClass="min-h-[320px]"
            onChange={({ text }) => onUpdate({ letra: text })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink-soft sm:text-sm">Refrão</label>
          <LyricEditor
            label="Refrão"
            text={form.refrao}
            marks={[]}
            showVoiceTools={false}
            placeholder="Texto do refrão"
            italic
            minClass="min-h-36"
            onChange={({ text }) => onUpdate({ refrao: text })}
          />
        </div>
        {form.refrao.trim() ? (
          <div className="grid gap-3 md:grid-cols-2">
            <CheckOption
              checked={form.refraoPrimeiro}
              onChange={(refraoPrimeiro) => onUpdate({ refraoPrimeiro })}
              title="Refrão primeiro"
              description="Exibe o refrão antes das estrofes."
            />
            <CheckOption
              checked={form.cronologica}
              onChange={(cronologica) => onUpdate({ cronologica })}
              title="Ordem cronológica"
              description="Repete o refrão após cada estrofe."
            />
          </div>
        ) : null}
        </section>
      </div>
    );
  }

  if (section === "vozes") {
    return (
      <section className="space-y-5 rounded-lg border border-line bg-card p-5 sm:p-6">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-ink">Arranjo de vozes</h3>
          <p className="mt-1 text-xs text-ink-soft sm:text-sm">
            Selecione trechos do texto para marcar cada voz. A prévia à direita atualiza em tempo real.
          </p>
        </div>
        <VocalArrangementEditor
          text={form.letraVozes}
          marks={form.vozesArranjo}
          somenteVozes={form.somenteVozes}
          onChange={({ text, marks }) => onUpdate({ letraVozes: text, vozesArranjo: marks })}
          onSomenteVozesChange={(somenteVozes) => onUpdate({ somenteVozes })}
        />
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-lg border border-line bg-card p-5 sm:p-6">
      <div>
        <h3 className="text-base font-semibold tracking-tight text-ink">Cifras</h3>
        <p className="mt-1 text-xs text-ink-soft sm:text-sm">
          Associe os acordes às linhas. A visualização mobile mostra a cifra como será lida no app.
        </p>
      </div>
      <div className="space-y-2">
        <ChordEditor
          label="Cifra da letra"
          text={form.letra}
          chords={form.cifraLetra}
          onChange={(cifraLetra) => onUpdate({ cifraLetra })}
        />
      </div>
      <div className="space-y-2">
        <ChordEditor
          label="Cifra do refrão"
          text={form.refrao}
          chords={form.cifraRefrao}
          italic
          emptyHint="Escreva o refrão na seção Letra para cifrar aqui."
          onChange={(cifraRefrao) => onUpdate({ cifraRefrao })}
        />
      </div>
    </section>
  );
}

function CheckOption({ checked, onChange, title, description }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3.5 hover:bg-paper/60">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-pine"
      />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-ink-soft">{description}</span>
      </span>
    </label>
  );
}

function EmptyEditorSection({ section, onCreate, onGoToLyrics, hasSongs }) {
  return (
    <section className="rounded-lg border border-line bg-card p-8 text-center sm:p-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        {SECTION_TITLES[section]}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-ink">Selecione uma música para editar</h3>
      <p className="mx-auto mt-1.5 max-w-lg text-sm leading-6 text-ink-soft">
        {hasSongs
          ? "Escolha uma música na aba Letra para editar o arranjo ou as cifras."
          : "Crie a primeira música pela aba Letra. O editor e a prévia mobile ficam lado a lado."}
      </p>
      <button
        type="button"
        onClick={hasSongs ? onGoToLyrics : onCreate}
        className="mt-6 h-9.5 rounded-md bg-pine px-4 text-sm font-semibold text-white hover:bg-pine-dark"
      >
        {hasSongs ? "Selecionar na aba Letra" : "Criar primeira música"}
      </button>
    </section>
  );
}

function MobilePreview({
  form,
  number,
  previewMode,
  onPreviewModeChange,
  customPreviewTheme,
  onTogglePreviewTheme,
  onOpenExpand,
  editing,
  orientation = "portrait",
  modal = false,
}) {
  const { appName } = getAppSettings();
  const globalTheme = useTheme();
  const currentAccentId = useAccent();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const effectiveTheme = customPreviewTheme || globalTheme;
  const isPreviewDark = effectiveTheme === "dark";
  const accentOption =
    ACCENT_OPTIONS.find((option) => option.id === currentAccentId) || ACCENT_OPTIONS[0];

  const previewVars = {
    "--paper": isPreviewDark ? accentOption.darkPaper : accentOption.paper,
    "--card": isPreviewDark ? accentOption.darkCard : accentOption.card,
    "--ink": isPreviewDark ? accentOption.darkInk : accentOption.ink,
    "--ink-soft": isPreviewDark ? accentOption.darkInkSoft : accentOption.inkSoft,
    "--line": isPreviewDark ? accentOption.darkLine : accentOption.line,
    "--pine": isPreviewDark ? accentOption.darkPine : accentOption.pine,
    "--pine-dark": isPreviewDark ? accentOption.darkPineDark : accentOption.pineDark,
    "--voice-men": isPreviewDark ? "96 165 250" : "29 78 216",
    "--voice-women": isPreviewDark ? "56 189 248" : "2 132 199",
  };

  const previewLabel = PREVIEW_MODES.find((mode) => mode.id === previewMode)?.label || "Letra";
  const deviceHeight =
    orientation === "landscape"
      ? "h-[min(420px,calc(100dvh-180px))] min-h-[260px]"
      : modal
        ? "h-[min(620px,calc(100dvh-180px))] min-h-[300px]"
        : "h-[min(620px,calc(100dvh-245px))] min-h-[430px]";
  const barHeight = orientation === "landscape" ? "h-11" : "h-14";
  const hasAudio = Boolean(form.audioDataUrl || (form.audioArquivo && !form.removeAudio));
  const hasContent = Boolean(
    form.letra.trim() || form.refrao.trim() || form.letraVozes.trim(),
  );

  return (
    <div
      className={`mx-auto w-full ${
        orientation === "landscape" ? "max-w-[820px]" : "max-w-[380px]"
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Prévia ao vivo</p>
          <div
            className="group relative inline-flex items-center"
            onMouseLeave={() => setTooltipOpen(false)}
          >
            <button
              type="button"
              aria-label="Informações sobre a prévia"
              aria-expanded={tooltipOpen}
              onClick={() => setTooltipOpen((prev) => !prev)}
              onBlur={() => setTooltipOpen(false)}
              className="inline-flex h-5 w-5 items-center justify-center rounded border border-line bg-card text-[11px] font-bold text-ink-soft transition-colors hover:border-ink-soft/50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
            >
              i
            </button>
            <div
              role="tooltip"
              className={`pointer-events-none absolute left-0 top-full z-30 mt-2 w-60 rounded-lg border border-line bg-card px-3 py-2 text-xs font-normal leading-relaxed text-ink shadow-lg transition-all duration-150 ${
                tooltipOpen
                  ? " visible translate-y-0 opacity-100"
                  : "invisible -translate-y-1 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
              }`}
            >
              <span
                aria-hidden
                className="absolute -top-1.5 left-2 h-2.5 w-2.5 rotate-45 border-l border-t border-line bg-card"
              />
              A prévia é somente visualização. Alterne abaixo entre Letra, Vozes, Cifra ou tema Claro/Escuro para testar a leitura.
            </div>
          </div>
        </div>
        <span className="font-mono text-[11px] font-medium text-ink-soft">
          {orientation === "landscape" ? "Paisagem" : "Retrato"} · {isPreviewDark ? "Escuro" : "Claro"}
        </span>
      </div>

      {/* Barra de controles rápidos da prévia */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-line bg-card p-1">
        <div
          className="inline-flex rounded-md bg-paper p-0.5"
          role="group"
          aria-label="Modo de visualização da prévia"
        >
          {PREVIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onPreviewModeChange?.(mode.id)}
              aria-pressed={previewMode === mode.id}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                previewMode === mode.id
                  ? "bg-card text-ink shadow-2xs ring-1 ring-line"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {onTogglePreviewTheme ? (
            <button
              type="button"
              onClick={() => onTogglePreviewTheme(isPreviewDark ? "light" : "dark")}
              aria-label={
                isPreviewDark
                  ? "Alternar prévia para tema claro"
                  : "Alternar prévia para tema escuro"
              }
              title={
                isPreviewDark
                  ? "Testar prévia em modo claro"
                  : "Testar prévia em modo escuro"
              }
              className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-paper px-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink-soft/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
            >
              {isPreviewDark ? (
                <SunMiniIcon className="h-3.5 w-3.5 text-ink" />
              ) : (
                <MoonMiniIcon className="h-3.5 w-3.5 text-ink" />
              )}
              <span>{isPreviewDark ? "Claro" : "Escuro"}</span>
            </button>
          ) : null}

          {!modal && onOpenExpand ? (
            <button
              type="button"
              onClick={() => onOpenExpand("landscape")}
              aria-label="Expandir prévia para testar modo paisagem"
              title="Expandir simulador (Retrato / Paisagem)"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-paper px-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink-soft/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
            >
              <ExpandMiniIcon className="h-3.5 w-3.5" />
              <span>Paisagem</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full overflow-hidden rounded-[2.2rem] border-[6px] border-neutral-800 bg-neutral-900 p-1.5 shadow-xl ring-1 ring-black/20">
        <div
          style={previewVars}
          data-theme={effectiveTheme}
          className={`flex ${deviceHeight} flex-col overflow-hidden rounded-[1.8rem] bg-paper text-ink transition-colors duration-200`}
        >
          {/* Barra de status do celular */}
          <div
            aria-hidden
            className="flex h-6 shrink-0 items-center justify-between bg-pine px-4 pt-0.5 text-[10px] font-semibold tracking-tight text-white select-none"
          >
            <span className="tabular-nums">09:41</span>
            {orientation !== "landscape" ? (
              <span className="h-2.5 w-12 rounded-full bg-black/45" />
            ) : null}
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 16 12" className="h-2.5 w-3 fill-current">
                <rect x="1" y="8" width="2" height="3" rx="0.5" />
                <rect x="4.5" y="6" width="2" height="5" rx="0.5" />
                <rect x="8" y="3.5" width="2" height="7.5" rx="0.5" />
                <rect x="11.5" y="1" width="2" height="10" rx="0.5" />
              </svg>
              <svg viewBox="0 0 16 12" className="h-2.5 w-3 fill-none stroke-current" strokeWidth="1.6" strokeLinecap="round">
                <path d="M1.5 4.2a9.5 9.5 0 0 1 13 0" />
                <path d="M4.2 7a6 6 0 0 1 7.6 0" />
                <circle cx="8" cy="9.8" r="1" className="fill-current stroke-none" />
              </svg>
              <span className="inline-flex items-center">
                <span className="flex h-2.5 w-4 items-center rounded-[2.5px] border border-white/80 p-[1px]">
                  <span className="h-full w-3 rounded-[1px] bg-white" />
                </span>
                <span className="ml-[1px] h-1 w-[1.5px] rounded-r-sm bg-white/80" />
              </span>
            </span>
          </div>
          <header
            className={`flex shrink-0 items-center border-b border-pine-dark bg-pine px-2 text-white shadow-sm ${barHeight}`}
          >
            <div className="flex w-full items-center gap-1">
              <span
                aria-hidden
                className={`inline-flex shrink-0 items-center justify-center rounded-full text-xl leading-none text-white/85 ${
                  orientation === "landscape" ? "h-8 w-8" : "h-10 w-10"
                }`}
              >
                ‹
              </span>
              <div className="min-w-0 flex-1 px-1">
                {editing ? (
                  <h1 className="flex min-h-6 min-w-0 items-stretch gap-3 text-white">
                    <span className="flex w-[3ch] shrink-0 items-center justify-end text-base font-semibold tabular-nums leading-tight">
                      {number ? String(number).padStart(3, "0") : "—"}
                    </span>
                    <span aria-hidden className="w-px shrink-0 self-stretch bg-white/35" />
                    <span className="flex min-w-0 flex-1 items-center">
                      <MarqueeText
                        text={form.titulo.trim() || "Nova música"}
                        className="text-base font-semibold leading-tight"
                      />
                    </span>
                  </h1>
                ) : (
                  <p className="truncate text-sm font-medium text-white">{appName}</p>
                )}
              </div>
              {editing ? <PreviewFavoriteIcon orientation={orientation} /> : null}
              {hasAudio ? <PreviewAudioIcon orientation={orientation} /> : null}
            </div>
          </header>
          <SongScroll>
            {editing && hasContent ? (
              <Lyrics
                letra={form.letra}
                refrao={form.refrao}
                vozesLetra={form.vozesLetra}
                vozesRefrao={form.vozesRefrao}
                letraVozes={form.letraVozes}
                vozesArranjo={form.vozesArranjo}
                cifraLetra={form.cifraLetra}
                cifraRefrao={form.cifraRefrao}
                cronologica={form.cronologica}
                refraoPrimeiro={form.refraoPrimeiro}
                showVoices={previewMode === "vozes"}
                showChords={previewMode === "cifra"}
                fontSize={14}
              />
            ) : (
              <div className="flex h-full min-h-72 items-center justify-center px-8 text-center">
                <p className="text-sm leading-6 text-ink-soft">
                  {editing
                    ? `Adicione conteúdo em ${previewLabel} para visualizar o resultado.`
                    : "Selecione ou crie uma música. A prévia aparece aqui sem abrir o app."}
                </p>
              </div>
            )}
          </SongScroll>
          <div className="shrink-0 border-t border-line bg-card">
            <nav
              aria-label="Controles da música"
              className="grid grid-cols-3"
            >
              {PREVIEW_MODES.map((mode) => {
                const isModeActive = previewMode === mode.id;
                const ModeIcon =
                  mode.id === "letra"
                    ? LyricIcon
                    : mode.id === "vozes"
                      ? VoicesPartsIcon
                      : ChordIcon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onPreviewModeChange?.(mode.id)}
                    aria-pressed={isModeActive}
                    className={`flex items-center justify-center transition-colors ${
                      orientation === "landscape"
                        ? "h-9 flex-row gap-1.5 text-[11px]"
                        : "h-12 flex-col gap-0.5 text-[11px]"
                    } font-medium ${
                      isModeActive ? "text-pine" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    <ModeIcon className="h-4 w-4 shrink-0" />
                    {mode.label}
                  </button>
                );
              })}
            </nav>
            <div aria-hidden className="flex justify-center pb-1.5 pt-0.5">
              <span className="h-1 w-24 rounded-full bg-ink/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SunMiniIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonMiniIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ExpandMiniIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function PreviewFavoriteIcon({ orientation }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${
        orientation === "landscape" ? "h-8 w-8" : "h-10 w-10"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.8 8.7c0 5.2-8.8 10.1-8.8 10.1S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z" />
      </svg>
    </span>
  );
}

function PreviewAudioIcon({ orientation }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${
        orientation === "landscape" ? "h-8 w-8" : "h-10 w-10"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </span>
  );
}

function PreviewModal({
  form,
  number,
  previewMode,
  onPreviewModeChange,
  customPreviewTheme,
  onTogglePreviewTheme,
  editing,
  orientation,
  onOrientationChange,
  onClose,
}) {
  const previewLabel = PREVIEW_MODES.find((mode) => mode.id === previewMode)?.label || "Letra";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-preview-title"
        className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
      >
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div>
            <h2 id="admin-preview-title" className="text-sm font-semibold">
              Visualização · {previewLabel}
            </h2>
            <p className="mt-0.5 text-xs text-ink-soft">Prévia atualizada com as alterações.</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Orientação da prévia"
              className="inline-flex rounded-lg border border-line bg-paper p-0.5"
            >
              <button
                type="button"
                aria-pressed={orientation === "portrait"}
                onClick={() => onOrientationChange("portrait")}
                className={`h-8 rounded-md px-2.5 text-xs font-medium ${
                  orientation === "portrait" ? "bg-card text-ink shadow-sm" : "text-ink-soft"
                }`}
              >
                Retrato
              </button>
              <button
                type="button"
                aria-pressed={orientation === "landscape"}
                onClick={() => onOrientationChange("landscape")}
                className={`h-8 rounded-md px-2.5 text-xs font-medium ${
                  orientation === "landscape" ? "bg-card text-ink shadow-sm" : "text-ink-soft"
                }`}
              >
                Paisagem
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-line px-3 text-xs font-medium hover:bg-paper"
            >
              Fechar
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
          <MobilePreview
            form={form}
            number={number}
            previewMode={previewMode}
            onPreviewModeChange={onPreviewModeChange}
            customPreviewTheme={customPreviewTheme}
            onTogglePreviewTheme={onTogglePreviewTheme}
            editing={editing}
            orientation={orientation}
            modal
          />
        </div>
      </section>
    </div>
  );
}
