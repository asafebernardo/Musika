import { useEffect, useMemo, useRef, useState } from "react";
import {
  createSong,
  deleteSong,
  getAudioUrl,
  messageForSongError,
  request,
  updateSong,
} from "@/api/songs.js";
import ChordEditor from "@/components/ChordEditor.jsx";
import EditIcon from "@/components/EditIcon.jsx";
import Lyrics from "@/components/Lyrics.jsx";
import LyricEditor from "@/components/LyricEditor.jsx";
import MarqueeText from "@/components/MarqueeText.jsx";
import SongScroll from "@/components/SongScroll.jsx";
import VocalArrangementEditor from "@/components/VocalArrangementEditor.jsx";
import { songHasChords } from "@/lib/chords.js";
import { emptySongForm, fieldsFromSong, payloadFromSongForm } from "@/lib/songEditor.js";
import {
  buildUpdatesForAlbumSelection,
  buildUpdatesForComposerSelection,
  getRelatedSongInfoOptions,
  useSongInfoRegistry,
} from "@/lib/songInfoRegistry.js";
import { filterSongs, withNumbers } from "@/lib/songs.js";
import { syncSongSingleTheme, useSongThemes } from "@/lib/songThemes.js";
import { getAppSettings } from "@/lib/appSettings.js";
import { ACCENT_OPTIONS, toggleTheme, useAccent, useTheme } from "@/lib/theme.js";
import { songHasVoices } from "@/lib/voices.js";
import AdminPersonalizationSection from "@/pages/AdminPersonalizationSection.jsx";
import AdminRegistriesSection from "@/pages/AdminRegistriesSection.jsx";
import AdminFinalPreviewSection from "@/pages/AdminFinalPreviewSection.jsx";
import AdminProjectExportSection from "@/pages/AdminProjectExportSection.jsx";
import AdminSlidesEditorSection from "@/pages/AdminSlidesEditorSection.jsx";
import UserProfileMenu, { USER_ACCOUNT_SECTIONS } from "@/components/UserProfileMenu.jsx";

const PERSONALIZATION_SECTIONS = [
  { id: "identidade", label: "Identidade" },
  { id: "temas", label: "Temas e Cores" },
  { id: "visualizacao", label: "Leitura Padrão" },
  { id: "acoes", label: "Permissões e Menus" },
];

const SIDEBAR_GROUPS = [
  {
    id: "edicao",
    label: "Edição",
    items: [
      { id: "completa", label: "Edição Completa", icon: SongMetadataIcon },
      { id: "letra", label: "Letra & Áudio", icon: LyricIcon },
      { id: "vozes", label: "Arranjo de Vozes", icon: VoicesPartsIcon },
      { id: "cifra", label: "Cifras & Tons", icon: ChordIcon },
      { id: "slides", label: "Projeção (Slides)", icon: SlidesIcon },
      { id: "experimental", label: "Experimental", icon: SongMetadataIcon },
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
  completa: "Edição Completa",
  experimental: "Experimental",
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

const CONTENT_LABELS = { letra: "áudio", vozes: "vozes", cifra: "cifra" };
const EDITOR_SECTIONS = ["letra", "vozes", "cifra"];
const EDITOR_OPTIONS = SIDEBAR_GROUPS[0].items.filter((item) => EDITOR_SECTIONS.includes(item.id));
const EDITOR_DESCRIPTIONS = {
  letra: "Edite a letra, o refrão e o áudio.",
  vozes: "Organize as partes e harmonias vocais.",
  cifra: "Edite as cifras e os tons da música.",
};
const NEW_SONG_STEPS = [
  { id: "informacoes", label: "Informações" },
  { id: "letra-base", label: "Letra base" },
  { id: "vozes", label: "Vozes", optional: true },
  { id: "cifra", label: "Cifras", optional: true },
];
const EXPERIMENTAL_TABS = [
  { id: "informacoes", label: "Informações & Áudio" },
  { id: "letra-base", label: "Letra" },
  { id: "vozes", label: "Vozes" },
  { id: "cifra", label: "Cifra" },
  { id: "slides", label: "Projeção" },
];
const EMPTY_CONTENT_FILTERS = { letra: "all", vozes: "all", cifra: "all" };

function hasSectionContent(song, section) {
  if (section === "vozes") return songHasVoices(song);
  if (section === "cifra") return songHasChords(song);
  return Boolean(String(song.audioArquivo ?? "").trim());
}

export default function AdminContentPage({ user, onLogout, logoutError, accessPanel }) {
  const { appName } = getAppSettings();
  const panelTheme = useTheme();
  const isPanelDark = panelTheme === "dark";
  const [songs, setSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeSection, setActiveSection] = useState("letra");
  const [activePersonalizationSection, setActivePersonalizationSection] = useState("identidade");
  const [activeUserAccountSection, setActiveUserAccountSection] = useState("perfil");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidePreviewCollapsed, setSidePreviewCollapsed] = useState(
    () => window.matchMedia("(max-width: 1023px)").matches,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewOrientation, setPreviewOrientation] = useState("portrait");
  const [customPreviewMode, setCustomPreviewMode] = useState(null);
  const [customPreviewTheme, setCustomPreviewTheme] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...emptySongForm });
  const [editorRevision, setEditorRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [registryDirty, setRegistryDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [contentFilters, setContentFilters] = useState(EMPTY_CONTENT_FILTERS);
  const [completeTab, setCompleteTab] = useState(null);
  const [experimentalTab, setExperimentalTab] = useState("informacoes");
  const [experimentalPickerOpen, setExperimentalPickerOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [invalidFields, setInvalidFields] = useState({});
  const [notice, setNotice] = useState("");
  const [songToDelete, setSongToDelete] = useState(null);
  const [deletingSong, setDeletingSong] = useState(false);

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
  const isCompleteSection = activeSection === "completa";
  const isExperimentalSection = activeSection === "experimental";
  const isSongSection = isCompleteSection || isExperimentalSection || EDITOR_SECTIONS.includes(activeSection);
  const isWizard = wizardStep !== null;
  const editorSection = isWizard
    ? NEW_SONG_STEPS[wizardStep].id
    : isCompleteSection ? completeTab : isExperimentalSection ? experimentalTab : activeSection;
  const hasContentFilters = Object.values(contentFilters).some((value) => value !== "all");
  const catalogSongs = useMemo(
    () => {
      if (isCompleteSection || isExperimentalSection) {
        return visibleSongs.filter((song) =>
          EDITOR_SECTIONS.every((section) => {
            const filter = contentFilters[section];
            return filter === "all" || hasSectionContent(song, section) === (filter === "present");
          }),
        );
      }
      return pendingOnly && isSongSection
        ? visibleSongs.filter((song) => !hasSectionContent(song, activeSection))
        : visibleSongs;
    },
    [visibleSongs, pendingOnly, isSongSection, isCompleteSection, isExperimentalSection, activeSection, contentFilters],
  );
  const isCompleteChooser = isCompleteSection && editing && !completeTab && !isWizard;
  const hasSideMobilePreview = isSongSection && editing && !isCompleteChooser &&
    !(isExperimentalSection && !isWizard && (experimentalTab === "slides" || experimentalPickerOpen));
  const previewMode = customPreviewMode || (
    editorSection === "vozes" || editorSection === "cifra" ? editorSection : "letra"
  );
  const number = withNumbers(songs).find((song) => song.id === selectedId)?.numero;

  useEffect(() => {
    const field = invalidFields.titulo ? "admin-song-title" : invalidFields.letra ? "admin-song-lyrics" : null;
    if (field) document.getElementById(field)?.focus();
  }, [invalidFields, editorSection]);

  useEffect(() => {
    if (!hasSideMobilePreview) setPreviewOpen(false);
  }, [hasSideMobilePreview]);

  useEffect(() => {
    if (isSongSection) {
      setCustomPreviewMode(null);
    }
  }, [activeSection, completeTab, experimentalTab, wizardStep, isSongSection]);

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
    if ((invalidFields.titulo && updates.titulo?.trim()) || (invalidFields.letra && updates.letra?.trim())) {
      setInvalidFields((current) => ({
        ...current,
        ...(updates.titulo?.trim() ? { titulo: false } : {}),
        ...(updates.letra?.trim() ? { letra: false } : {}),
      }));
    }
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
    setInvalidFields({});
    setNotice("");
    setPendingOnly(false);
    setCompleteTab(null);
    setExperimentalPickerOpen(false);
    setExperimentalTab("informacoes");
    setWizardStep(0);
    if (!isCompleteSection && !isExperimentalSection) setActiveSection("letra");
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("nova") !== "1") return;
    url.searchParams.delete("nova");
    window.history.replaceState(window.history.state, "", url);
    startNewSong();
  }, []);

  const backToSongList = () => {
    if (dirty && !window.confirm("Descartar as alterações não salvas?")) return;
    setSelectedId(null);
    setEditing(false);
    setCompleteTab(null);
    setExperimentalPickerOpen(false);
    setWizardStep(null);
    setForm({ ...emptySongForm });
    setDirty(false);
    setError("");
    setInvalidFields({});
    setNotice("");
  };

  const selectSong = (song) => {
    if (dirty && !window.confirm("Descartar as alterações não salvas?")) return;
    setSelectedId(song.id);
    setEditing(true);
    setCompleteTab(null);
    setExperimentalPickerOpen(false);
    setExperimentalTab("informacoes");
    setWizardStep(null);
    setForm(fieldsFromSong(song));
    setDirty(false);
    setError("");
    setInvalidFields({});
    setNotice("");
  };

  const openSection = (section) => {
    if (saving) return;
    if (
      isRegistrySection &&
      section !== activeSection &&
      registryDirty &&
      !window.confirm("Descartar as alterações não salvas?")
    ) return;
    if (isWizard && section !== activeSection) {
      if (dirty && !window.confirm("Descartar as alterações não salvas?")) return;
      setWizardStep(null);
      setSelectedId(null);
      setEditing(false);
      setCompleteTab(null);
      setForm({ ...emptySongForm });
      setDirty(false);
      setError("");
      setInvalidFields({});
      setNotice("");
      setPendingOnly(false);
      setActiveSection(section);
      return;
    }
    if (section !== activeSection && (isExperimentalSection || section === "experimental" || section === "completa" || EDITOR_SECTIONS.includes(section))) {
      if (dirty && !window.confirm("Descartar as alterações não salvas?")) return;
      setSelectedId(null);
      setEditing(false);
      setCompleteTab(null);
      setExperimentalPickerOpen(false);
      setExperimentalTab("informacoes");
      setWizardStep(null);
      setForm({ ...emptySongForm });
      setDirty(false);
      setError("");
      setInvalidFields({});
      setNotice("");
      setPendingOnly(false);
    }
    setActiveSection(section);
  };

  const discardChanges = () => {
    if (selectedSong) {
      setForm(fieldsFromSong(selectedSong));
      setEditing(true);
    } else {
      setForm({ ...emptySongForm });
      setEditing(false);
      setCompleteTab(null);
      setWizardStep(null);
      if (!isCompleteSection) setActiveSection("letra");
    }
    setEditorRevision((revision) => revision + 1);
    setDirty(false);
    setError("");
    setInvalidFields({});
    setNotice("");
  };

  const saveSong = async () => {
    if (!form.titulo.trim()) {
      if (isWizard) setWizardStep(0);
      else if (isExperimentalSection) {
        setExperimentalPickerOpen(false);
        setExperimentalTab("informacoes");
      } else if (isCompleteSection) setCompleteTab("letra");
      else setActiveSection("letra");
      setError("");
      setInvalidFields({ titulo: true });
      return;
    }
    if (!form.letra.trim() && (isWizard || !form.letraVozes.trim())) {
      if (isWizard) setWizardStep(1);
      else if (isExperimentalSection) {
        setExperimentalPickerOpen(false);
        setExperimentalTab("letra-base");
      } else if (isCompleteSection) setCompleteTab("letra");
      else setActiveSection("letra");
      setError("");
      setInvalidFields({ letra: true });
      return;
    }
    setSaving(true);
    setError("");
    setInvalidFields({});
    setNotice("");
    try {
      const payload = payloadFromSongForm(form);
      const result = selectedId
        ? await updateSong(selectedId, payload)
        : await createSong(payload);
      const saved = result.song ?? result;
      syncSongSingleTheme(saved.id, saved.tema);
      setSongs((current) =>
        withNumbers([
          ...current.filter((song) => song.id !== saved.id),
          saved,
        ]),
      );
      setSelectedId(saved.id);
      setEditing(true);
      setForm(fieldsFromSong(saved));
      setEditorRevision((revision) => revision + 1);
      setDirty(false);
      if (isWizard) {
        setWizardStep(null);
        if (isExperimentalSection) {
          setExperimentalTab("informacoes");
        } else {
          setActiveSection("completa");
          setCompleteTab("letra");
        }
        setNotice("Música cadastrada. Use as abas para continuar editando.");
      } else {
        setNotice("Alterações salvas. A prévia já reflete o resultado.");
      }
    } catch (saveError) {
      setError(messageForSongError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const nextWizardStep = () => {
    if (wizardStep === 0 && !form.titulo.trim()) {
      setError("");
      setInvalidFields({ titulo: true });
      return;
    }
    if (wizardStep === 1 && !form.letra.trim()) {
      setError("");
      setInvalidFields({ letra: true });
      return;
    }
    setError("");
    setInvalidFields({});
    setWizardStep((step) => Math.min(step + 1, NEW_SONG_STEPS.length - 1));
  };

  const removeSong = (song) => {
    if (!song) return;
    setError("");
    setNotice("");
    setSongToDelete(song);
  };

  const confirmRemoveSong = async () => {
    if (!songToDelete) return;
    setDeletingSong(true);
    setError("");
    setNotice("");
    try {
      await deleteSong(songToDelete.id);
      setSongs((current) => current.filter((entry) => entry.id !== songToDelete.id));
      if (selectedId === songToDelete.id) {
        setSelectedId(null);
        setEditing(false);
        setCompleteTab(null);
        setForm({ ...emptySongForm });
        setDirty(false);
        if (activeSection !== "completa" && activeSection !== "experimental") setActiveSection("letra");
      }
      setNotice(`Música “${songToDelete.titulo}” excluída do catálogo.`);
      setSongToDelete(null);
    } catch (deleteError) {
      setError(messageForSongError(deleteError));
    } finally {
      setDeletingSong(false);
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
                    onClick={() => openSection(item.id)}
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
        <header className="relative z-20 shrink-0 border-b border-line bg-card">
          <div className={`flex items-center gap-2 px-3 sm:gap-4 sm:px-7 ${
            isExperimentalSection ? "min-h-12 py-1" : "min-h-14 py-2"
          }`}>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-ink-soft">
                Administração{activeGroup ? ` / ${activeGroup.label}` : ""} /{" "}
                {SECTION_TITLES[activeSection]}
                {editing && !isUtilitySection
                  ? ` / ${selectedId ? "Editar música" : "Cadastro de nova música"}`
                  : ""}
              </p>
              {!isExperimentalSection ? (
                <h2 className="truncate text-lg font-bold tracking-tight text-ink">
                  {editing && !isUtilitySection
                    ? form.titulo || "Cadastro de nova música"
                    : SECTION_TITLES[activeSection]}
                </h2>
              ) : null}
            </div>
            <AccountOptionsMenu
              compact={isExperimentalSection}
              activeSection={isUserAccountSection ? activeUserAccountSection : null}
              onSelect={(section) => {
                setActiveUserAccountSection(section);
                openSection("minha-conta");
              }}
              onLogout={() => {
                if (saving) return;
                if (isWizard && dirty && !window.confirm("Descartar as alterações não salvas?")) return;
                onLogout();
              }}
            />
            <button
              type="button"
              role="switch"
              aria-checked={isPanelDark}
              onClick={() => toggleTheme({ force: true })}
              aria-label="Tema escuro"
              title={isPanelDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
              className={`inline-flex shrink-0 items-center gap-2 rounded-md text-xs font-semibold text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine ${
                isExperimentalSection
                  ? "h-9 px-1 hover:text-pine"
                  : "h-11 border border-line bg-paper px-2.5 hover:border-pine/60 sm:px-3"
              }`}
            >
              <span aria-hidden="true" className={`relative rounded-full p-0.5 transition-colors ${
                isExperimentalSection ? "h-6 w-11" : "h-7 w-14"
              } ${isPanelDark ? "bg-pine" : "bg-line"}`}>
                <span className={`flex items-center justify-center rounded-full bg-card text-ink shadow-sm transition-transform ${
                  isExperimentalSection
                    ? `h-5 w-5 ${isPanelDark ? "translate-x-5" : ""}`
                    : `h-6 w-6 ${isPanelDark ? "translate-x-7" : ""}`
                }`}>
                  {isPanelDark ? <MoonMiniIcon className="h-3.5 w-3.5" /> : <SunMiniIcon className="h-3.5 w-3.5" />}
                </span>
              </span>
              <span aria-hidden="true" className="hidden sm:inline">{isPanelDark ? "Escuro" : "Claro"}</span>
            </button>
          </div>
          <nav
            className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 lg:hidden"
            aria-label="Seções do painel"
          >
            {SIDEBAR_GROUPS.flatMap((group) => group.items).map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => openSection(section.id)}
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
          {logoutError ? (
            <p role="alert" className="border-t border-line px-3 py-2 text-xs text-danger sm:px-7">
              {logoutError}
            </p>
          ) : null}
        </header>

        <div
          className={`grid min-h-0 flex-1 ${
            !hasSideMobilePreview
              ? "grid-cols-1 overflow-y-auto"
              : sidePreviewCollapsed
                ? "grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_48px] lg:overflow-hidden"
                : "grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_380px]"
          }`}
        >
          <main
            className={`min-w-0 p-4 sm:p-6 lg:min-h-0 lg:p-8 ${
              isSongSection && !editing && !isExperimentalSection
                ? "flex min-h-0 flex-col overflow-hidden lg:overflow-hidden"
                : "lg:overflow-y-auto"
            }`}
          >
            {isAccessSection ? (
              accessPanel
            ) : isUserAccountSection ? (
              <UserProfileMenu
                user={user}
                inline
                activeTab={activeUserAccountSection}
                onTabChange={setActiveUserAccountSection}
              />
            ) : isRegistrySection ? (
              <AdminRegistriesSection
                key={activeRegistryTab}
                activeTab={activeRegistryTab}
                songs={visibleSongs}
                onDirtyChange={setRegistryDirty}
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
                className={`mx-auto w-full max-w-7xl ${
                  isSongSection && !editing && !isExperimentalSection
                    ? "flex min-h-0 flex-1 flex-col"
                    : isCompleteChooser
                      ? "flex min-h-full flex-col space-y-5"
                      : "space-y-5"
                }`}
              >
                {isExperimentalSection && !isWizard ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 pb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">
                        {selectedSong ? `Música: ${form.titulo || selectedSong.titulo}` : "Escolha uma música para editar"}
                      </h3>
                      <p className="mt-1 text-xs text-ink-soft">
                        Alterne entre as abas para editar a música selecionada.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setExperimentalPickerOpen((open) => !open)}
                        aria-expanded={experimentalPickerOpen}
                        disabled={saving}
                        className="inline-flex h-10 items-center rounded-[3px] border border-line bg-card px-4 text-xs font-semibold text-pine hover:border-pine hover:bg-paper disabled:opacity-50"
                      >
                        {experimentalPickerOpen ? "Fechar catálogo" : "Escolher música"}
                      </button>
                      <button
                        type="button"
                        onClick={startNewSong}
                        disabled={saving}
                        className="inline-flex h-10 items-center gap-1.5 rounded-[3px] bg-pine px-4 text-xs font-semibold text-white hover:bg-pine-dark disabled:opacity-50"
                      >
                        <span aria-hidden="true" className="text-sm leading-none">+</span>
                        Nova música
                      </button>
                    </div>
                  </div>
                ) : null}
                {editing && !isWizard ? (
                  <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-line/80 bg-paper py-3">
                    <p className="text-xs text-ink-soft" aria-live="polite">
                      {dirty ? "Alterações não salvas" : "Sem alterações pendentes"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {!isExperimentalSection ? (
                        <button
                          type="button"
                          onClick={backToSongList}
                          className="inline-flex h-10 items-center gap-1.5 rounded-[3px] border border-line bg-card px-4 text-xs font-medium text-ink transition-colors hover:bg-paper"
                        >
                          <svg
                            viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0"
                            fill="none" stroke="currentColor" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round"
                          >
                            <path d="M19 12H5m7-7-7 7 7 7" />
                          </svg>
                          Voltar à listagem
                        </button>
                      ) : null}
                      {dirty ? (
                        <button
                          type="button"
                          onClick={discardChanges}
                          className="inline-flex h-10 items-center gap-1.5 rounded-[3px] border border-line bg-card px-4 text-xs font-medium text-ink hover:bg-paper"
                        >
                          <svg
                            viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0"
                            fill="none" stroke="currentColor" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round"
                          >
                            <path d="M3 7v5h5M4 12a8 8 0 1 1 2.4 5.7" />
                          </svg>
                          Descartar
                        </button>
                      ) : null}
                      {selectedId ? (
                        <button
                          type="button"
                          onClick={() => selectedSong && removeSong(selectedSong)}
                          className="inline-flex h-10 items-center gap-1.5 rounded-[3px] border border-danger/30 bg-card px-4 text-xs font-medium text-danger hover:bg-danger-soft"
                        >
                          <svg
                            viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0"
                            fill="none" stroke="currentColor" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round"
                          >
                            <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
                          </svg>
                          Excluir
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={saveSong}
                        disabled={saving || !dirty}
                        className="inline-flex h-10 items-center gap-1.5 rounded-[3px] bg-pine px-5 text-xs font-semibold text-white hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg
                          viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0"
                          fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"
                        >
                          <path d="M5 3h12l3 3v15H4V3h1Zm3 0v6h8V3M8 21v-8h8v8" />
                        </svg>
                        {saving ? "Salvando…" : isExperimentalSection ? "Salvar música" : "Salvar"}
                      </button>
                    </div>
                  </div>
                ) : null}
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
                {isWizard ? (
                  <div className="space-y-4 border-b border-line/80 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-ink">Cadastro de nova música</h3>
                        <p className="mt-1 text-xs text-ink-soft">
                          Etapa {wizardStep + 1} de {NEW_SONG_STEPS.length}. A música será salva ao concluir.
                        </p>
                        <p className="mt-1 text-xs text-ink-soft">
                          <span className="font-semibold text-danger" aria-hidden="true">*</span> Campos obrigatórios
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={backToSongList}
                        disabled={saving}
                        className="inline-flex h-10 items-center rounded-[3px] border border-line bg-card px-4 text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
                      >
                        Cancelar cadastro
                      </button>
                    </div>
                    <ol aria-label="Etapas do cadastro" className="grid gap-2 sm:grid-cols-4">
                      {NEW_SONG_STEPS.map((step, index) => (
                        <li
                          key={step.id}
                          aria-current={wizardStep === index ? "step" : undefined}
                          className={`rounded-[3px] border px-3 py-2 text-xs ${
                            wizardStep === index
                              ? "border-pine bg-pine/10 font-semibold text-pine"
                              : "border-line text-ink-soft"
                          }`}
                        >
                          {index + 1}. {step.label}{step.optional ? " (opcional)" : ""}
                        </li>
                      ))}
                    </ol>
                    {NEW_SONG_STEPS[wizardStep].optional ? (
                      <p className="text-xs text-ink-soft">
                        Esta etapa é opcional. Você pode continuar sem preencher e editar depois.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {isExperimentalSection && !isWizard && !experimentalPickerOpen ? (
                  <nav className="flex flex-wrap gap-2 border-b border-line/80 pb-4" aria-label="Abas de edição da música">
                    {EXPERIMENTAL_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setExperimentalTab(tab.id)}
                        disabled={!editing}
                        aria-pressed={experimentalTab === tab.id}
                        className={`min-h-10 rounded-[3px] border px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pine disabled:cursor-not-allowed disabled:opacity-50 ${
                          experimentalTab === tab.id
                            ? "border-pine bg-pine text-white"
                            : "border-line bg-card text-ink hover:border-pine hover:text-pine"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                ) : isCompleteChooser ? (
                  <nav
                    className="flex flex-1 items-center justify-center py-8"
                    aria-label="Opções de edição da música"
                  >
                    <div className="w-full">
                      <h3 className="text-center text-lg font-semibold text-ink">
                        Escolha o que deseja editar
                      </h3>
                      <p className="mt-1 text-center text-sm text-ink-soft">
                        Selecione uma opção para começar.
                      </p>
                      <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        {EDITOR_OPTIONS.map(({ id, icon: Icon }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setCompleteTab(id)}
                            className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-md border border-line bg-card px-5 py-6 text-center transition-colors hover:border-pine hover:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                          >
                            <Icon className="h-9 w-9" />
                            <span className="text-sm font-semibold">{SECTION_TITLES[id]}</span>
                            <span className="text-xs leading-relaxed text-ink-soft">{EDITOR_DESCRIPTIONS[id]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </nav>
                ) : editing && isCompleteSection && !isWizard ? (
                  <nav
                    className="space-y-2 border-b border-line/80 pb-4"
                    aria-label="Opções de edição da música"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">Escolha o que deseja editar</p>
                      <button
                        type="button"
                        onClick={() => setCompleteTab(null)}
                        className="text-xs font-semibold text-pine hover:underline"
                      >
                        Voltar às opções
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {EDITOR_SECTIONS.map((section) => (
                        <button
                          key={section}
                          type="button"
                          onClick={() => setCompleteTab(section)}
                          aria-pressed={completeTab === section}
                          className={`min-h-10 rounded-[3px] border px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pine ${
                            completeTab === section
                              ? "border-pine bg-pine text-white"
                              : "border-line bg-card text-ink hover:border-pine hover:text-pine"
                          }`}
                        >
                          {SECTION_TITLES[section]}
                        </button>
                      ))}
                    </div>
                  </nav>
                ) : null}
                {isExperimentalSection && !isWizard ? (
                  experimentalPickerOpen ? (
                    <div id="experimental-song-picker">
                      <SongPickerSection
                        songs={catalogSongs}
                        totalSongs={songs.length}
                        loading={loadingSongs}
                        search={search}
                        onSearch={setSearch}
                        pendingOnly={pendingOnly}
                        onPendingOnlyChange={setPendingOnly}
                        contentFilters={contentFilters}
                        onContentFiltersChange={setContentFilters}
                        hasContentFilters={hasContentFilters}
                        onCreate={startNewSong}
                        selectedId={selectedId}
                        onSelect={selectSong}
                        section="completa"
                      />
                    </div>
                  ) : editing && experimentalTab !== "slides" ? (
                    <SongEditorSection
                      key={`${selectedId}-${editorSection}-${editorRevision}`}
                      section={editorSection}
                      form={form}
                      songs={songs}
                      onUpdate={updateForm}
                      onAudioChange={handleAudioChange}
                      onClearAudio={clearAudio}
                      onOpenSection={openSection}
                      invalidFields={invalidFields}
                      requireBaseLyrics={!form.letraVozes.trim()}
                    />
                  ) : null
                ) : !editing ? (
                    <SongPickerSection
                      songs={catalogSongs}
                      totalSongs={songs.length}
                      loading={loadingSongs}
                      search={search}
                      onSearch={setSearch}
                      pendingOnly={pendingOnly}
                      onPendingOnlyChange={setPendingOnly}
                      contentFilters={contentFilters}
                      onContentFiltersChange={setContentFilters}
                      hasContentFilters={hasContentFilters}
                      onCreate={startNewSong}
                      selectedId={selectedId}
                      onSelect={selectSong}
                      fillHeight
                      section={activeSection}
                    />
                ) : editorSection ? (
                  <fieldset disabled={isWizard && saving} className="min-w-0">
                    <SongEditorSection
                      key={`${selectedId}-${editorSection}-${editorRevision}`}
                      section={editorSection}
                      form={form}
                      songs={songs}
                      onUpdate={updateForm}
                      onAudioChange={handleAudioChange}
                      onClearAudio={clearAudio}
                      onOpenSection={openSection}
                      invalidFields={invalidFields}
                      requireBaseLyrics={isWizard || !form.letraVozes.trim()}
                    />
                  </fieldset>
                ) : null}
                {isExperimentalSection && editing && !isWizard && selectedSong ? (
                  <div hidden={experimentalTab !== "slides" || experimentalPickerOpen}>
                    <p className="mb-4 text-xs text-ink-soft">
                      As alterações na projeção são temporárias e serão perdidas ao trocar de música ou sair deste menu. Use “Restaurar da letra” para atualizar os slides após editar a letra.
                    </p>
                    <AdminSlidesEditorSection
                      key={selectedId}
                      songs={[{ ...selectedSong, ...form, numero: number }]}
                      singleSong
                    />
                  </div>
                ) : null}
                {isWizard ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/80 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setWizardStep((step) => step - 1);
                      }}
                      disabled={wizardStep === 0 || saving}
                      className="h-10 rounded-[3px] border border-line bg-card px-4 text-xs font-medium text-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Etapa anterior
                    </button>
                    <div className="flex flex-wrap gap-2">
                      {wizardStep === 2 && !songHasVoices(form) ? (
                        <button
                          type="button"
                          onClick={nextWizardStep}
                          disabled={saving}
                          className="h-10 rounded-[3px] border border-line bg-card px-4 text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
                        >
                          Pular vozes
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={wizardStep === NEW_SONG_STEPS.length - 1 ? saveSong : nextWizardStep}
                        disabled={saving}
                        className="h-10 rounded-[3px] bg-pine px-5 text-xs font-semibold text-white hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "Salvando…" : wizardStep === NEW_SONG_STEPS.length - 1 ? "Concluir cadastro" : "Próxima etapa"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </main>

          {hasSideMobilePreview ? (
            sidePreviewCollapsed ? (
              <aside className="flex items-center justify-between border-t border-line bg-card px-4 py-2.5 lg:flex-col lg:justify-start lg:border-l lg:border-t-0 lg:px-1.5 lg:py-4">
                <button
                  type="button"
                  onClick={() => setSidePreviewCollapsed(false)}
                  aria-label="Expandir prévia ao vivo"
                  title="Expandir prévia ao vivo"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-paper text-ink-soft transition-colors hover:border-ink-soft/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                >
                  <PreviewCollapseIcon collapsed className="h-4 w-4" />
                </button>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft lg:mt-4 lg:[writing-mode:vertical-rl]">
                  Prévia ao vivo
                </span>
              </aside>
            ) : (
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
                  onCollapse={() => setSidePreviewCollapsed(true)}
                  editing={editing}
                  orientation="portrait"
                />
              </aside>
            )
          ) : null}
        </div>
      </section>
      {previewOpen && hasSideMobilePreview ? (
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
      {songToDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          onClick={() => !deletingSong && setSongToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-song-modal-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-card text-ink shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <h3 id="delete-song-modal-title" className="text-base font-semibold text-ink">
                Excluir música do catálogo
              </h3>
              <button
                type="button"
                disabled={deletingSong}
                onClick={() => setSongToDelete(null)}
                aria-label="Fechar modal"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-paper text-base text-ink-soft hover:text-ink disabled:opacity-50"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 p-5 sm:p-6">
              <p className="text-sm leading-relaxed text-ink">
                Tem certeza que deseja excluir a música{" "}
                <strong className="font-semibold">“{songToDelete.titulo}”</strong> do catálogo?
              </p>
              <p className="text-xs leading-relaxed text-ink-soft">
                Esta ação remove a música permanentemente e não pode ser desfeita.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper/40 px-5 py-4 sm:px-6">
              <button
                type="button"
                disabled={deletingSong}
                onClick={() => setSongToDelete(null)}
                className="h-10 rounded-lg border border-line bg-card px-5 text-sm font-medium hover:bg-paper disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingSong}
                onClick={confirmRemoveSong}
                className="h-10 rounded-lg bg-danger px-5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
              >
                {deletingSong ? "Excluindo…" : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AccountOptionsMenu({ activeSection, onSelect, onLogout, compact = false }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="admin-account-options"
        className={`inline-flex items-center gap-2 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine ${
          compact
            ? `h-9 px-1 ${open || activeSection ? "text-pine" : "text-ink-soft hover:text-ink"}`
            : `h-11 border px-3 sm:px-4 ${
                open || activeSection
                  ? "border-pine bg-pine/10 text-pine"
                  : "border-line bg-paper text-ink-soft hover:border-ink-soft/40 hover:text-ink"
              }`
        }`}
      >
        <UserAccountIcon className="h-4 w-4 shrink-0" />
        Minha Conta
        <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open ? (
        <nav
          id="admin-account-options"
          aria-label="Opções da minha conta"
          className="absolute right-[-4.5rem] top-full z-30 mt-2 max-h-[calc(100dvh-6rem)] w-64 max-w-[calc(100vw-4.5rem)] overflow-y-auto rounded-md border border-line bg-card p-1.5 shadow-xl sm:right-0"
        >
          {USER_ACCOUNT_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onSelect(id);
                setOpen(false);
                buttonRef.current?.focus();
              }}
              aria-current={activeSection === id ? "page" : undefined}
              className={`flex w-full items-center gap-2.5 rounded px-3 py-2.5 text-left text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine ${
                activeSection === id ? "bg-pine/10 text-pine" : "text-ink hover:bg-paper"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
          {onLogout ? (
            <div className="mt-1 border-t border-line pt-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2.5 rounded px-3 py-2.5 text-left text-xs font-medium text-danger hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 17v3H4V4h6v3m5 1 4 4-4 4m4-4H9" />
                </svg>
                Sair
              </button>
            </div>
          ) : null}
        </nav>
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

function PreviewCollapseIcon({ collapsed, className }) {
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
      <path d="M15 4v16" />
      {collapsed ? (
        <path d="m11 9-3 3 3 3" />
      ) : (
        <path d="m9 9 3 3-3 3" />
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
  pendingOnly,
  onPendingOnlyChange,
  contentFilters,
  onContentFiltersChange,
  hasContentFilters,
  onCreate,
  selectedId,
  onSelect,
  fillHeight,
  section,
}) {
  const isComplete = section === "completa";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = isComplete
    ? EDITOR_SECTIONS.filter((filterSection) => contentFilters[filterSection] !== "all").length
    : Number(pendingOnly);
  const filtersActive = Boolean(search) || (isComplete ? hasContentFilters : pendingOnly);

  useEffect(() => {
    setFiltersOpen(false);
  }, [section]);

  return (
    <section
      className={`${
        fillHeight ? "flex min-h-0 flex-1 flex-col" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-ink">Catálogo de músicas</h3>
            {!loading ? (
              <span className="inline-flex items-center rounded-[3px] border border-line bg-card px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums text-ink-soft">
                {filtersActive ? `${songs.length} / ${totalSongs}` : totalSongs}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-ink-soft">
            {isComplete
              ? "Selecione uma música para escolher o que editar."
              : `Selecione uma música para trabalhar em ${SECTION_TITLES[section].toLocaleLowerCase("pt-BR")}.`}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {totalSongs ? (
            <>
              <div className="relative flex w-full items-center sm:w-64">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-ink-soft"
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
                  placeholder="Filtrar por número, título ou letra…"
                  aria-label="Buscar músicas"
                  className="h-9 w-full rounded-[3px] border border-line bg-card pl-8 pr-7 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => onSearch("")}
                    aria-label="Limpar busca"
                    className="absolute right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-[2px] text-ink-soft hover:text-ink"
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                aria-expanded={filtersOpen}
                aria-controls="song-catalog-filters"
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[3px] border px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine ${
                  filtersOpen || activeFilterCount
                    ? "border-pine bg-pine/10 text-pine"
                    : "border-line bg-card text-ink hover:border-pine hover:text-pine"
                }`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5Z" />
                </svg>
                Filtros
                {activeFilterCount ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pine px-1 text-[10px] text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </>
          ) : null}
          {section === "letra" || isComplete ? (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[3px] bg-pine px-4 text-xs font-semibold text-white transition-colors hover:bg-pine-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pine"
            >
              <span aria-hidden className="text-sm leading-none">+</span>
              Nova música
            </button>
          ) : null}
        </div>
      </div>

      {totalSongs && filtersOpen ? (
        <div id="song-catalog-filters" className="space-y-4 border-b border-line/80 bg-card/60 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Filtrar músicas</p>
            {activeFilterCount ? (
              <button
                type="button"
                onClick={() => {
                  if (isComplete) onContentFiltersChange(EMPTY_CONTENT_FILTERS);
                  else onPendingOnlyChange(false);
                }}
                className="text-xs font-semibold text-pine hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {(isComplete ? EDITOR_SECTIONS : [section]).map((filterSection) => {
              const label = CONTENT_LABELS[filterSection];
              const selected = isComplete
                ? contentFilters[filterSection]
                : pendingOnly ? "missing" : "all";
              const options = [
                { value: "all", label: "Todos" },
                ...(isComplete ? [{ value: "present", label: `Com ${label}` }] : []),
                { value: "missing", label: `Sem ${label}` },
              ];
              return (
                <div key={filterSection} className="space-y-2">
                  <p className="text-xs font-semibold capitalize text-ink-soft">{label}</p>
                  <div role="group" aria-label={`Filtrar por ${label}`} className="flex flex-wrap gap-1.5">
                    {options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected === option.value}
                        onClick={() => {
                          if (isComplete) {
                            onContentFiltersChange((current) => ({
                              ...current,
                              [filterSection]: option.value,
                            }));
                          } else {
                            onPendingOnlyChange(option.value === "missing");
                          }
                        }}
                        className={`min-h-9 rounded-[3px] border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine ${
                          selected === option.value
                            ? "border-pine bg-pine text-white"
                            : "border-line bg-card text-ink hover:border-pine hover:text-pine"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="py-6 text-sm text-ink-soft">Carregando catálogo…</p>
      ) : songs.length ? (
        <ul
          className={`divide-y divide-line/80 border-b border-line/80 overflow-y-auto ${
            fillHeight ? "min-h-0 flex-1" : "max-h-60"
          }`}
        >
          {songs.map((song) => {
            const isSelected = selectedId === song.id;
            const hasContent = !isComplete && hasSectionContent(song, section);
            const needsCreation = !isComplete && section !== "letra" && !hasContent;
            const contentStatus = isComplete
              ? ""
              : `${hasContent ? "Com" : "Sem"} ${CONTENT_LABELS[section]}`;
            return (
              <li key={song.id}>
                <button
                  type="button"
                  onClick={() => onSelect(song)}
                  aria-current={isSelected ? "true" : undefined}
                  className={`group relative flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-pine ${
                    isSelected
                      ? "bg-card before:absolute before:bottom-0 before:left-0 before:top-0 before:w-0.5 before:bg-pine"
                      : "hover:bg-card/65"
                  }`}
                >
                  <span
                    className={`inline-flex w-10 shrink-0 items-center justify-center rounded-[2px] border py-0.5 font-mono text-xs font-medium tabular-nums ${
                      isSelected
                        ? "border-pine/40 bg-pine/10 text-ink"
                        : "border-line bg-card text-ink-soft group-hover:text-ink"
                    }`}
                  >
                    {String(song.numero).padStart(3, "0")}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[13px] ${
                        isSelected ? "font-semibold text-ink" : "font-medium text-ink"
                      }`}
                    >
                      {song.titulo}
                    </span>
                    {isComplete ? (
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-soft">
                        {EDITOR_SECTIONS.map((statusSection) => (
                          <span key={statusSection}>
                            {hasSectionContent(song, statusSection) ? "Com" : "Sem"}{" "}
                            {CONTENT_LABELS[statusSection]}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>

                  {!isComplete ? (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 text-[11px] ${
                        hasContent ? "font-medium text-ink-soft" : "text-ink-soft/70"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`h-1.5 w-1.5 rounded-full ${hasContent ? "bg-emerald-500" : "bg-ink-soft/30"}`}
                      />
                      {contentStatus}
                    </span>
                  ) : null}

                  <span className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[3px] px-3 text-xs font-semibold transition-colors ${
                    needsCreation && !isSelected
                      ? "bg-pine text-white group-hover:bg-pine-dark"
                      : "border border-line bg-card text-pine group-hover:border-pine group-hover:bg-paper"
                  }`}>
                    {needsCreation ? (
                      <span aria-hidden="true" className="text-base leading-none">+</span>
                    ) : (
                      <EditIcon className="h-4 w-4 shrink-0" />
                    )}
                    <span>{isSelected ? "Editando" : needsCreation ? "Criar" : "Editar"}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-sm text-ink-soft">
          {filtersActive
            ? "Nenhuma música encontrada para os filtros selecionados."
            : "O catálogo ainda está vazio."}
        </p>
      )}
    </section>
  );
}

function SongEditorSection({
  section,
  form,
  songs = [],
  onUpdate,
  onAudioChange,
  onClearAudio,
  onOpenSection,
  invalidFields,
  requireBaseLyrics,
}) {
  const { themes } = useSongThemes();
  const { mergedEntries: infoEntries } = useSongInfoRegistry(songs);

  const themeOptions = useMemo(() => {
    const names = themes.map((item) => item.name.trim()).filter(Boolean);
    const currentTema = String(form.tema ?? "").trim();
    if (currentTema && !names.some((n) => n.toLocaleLowerCase("pt-BR") === currentTema.toLocaleLowerCase("pt-BR"))) {
      names.push(currentTema);
    }
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [themes, form.tema]);

  const relatedInfo = useMemo(
    () => getRelatedSongInfoOptions(infoEntries, form.compositor, form.album),
    [infoEntries, form.compositor, form.album],
  );

  const handleComposerChange = (event) => {
    const nextCompositor = event.target.value;
    onUpdate(buildUpdatesForComposerSelection(infoEntries, nextCompositor, form));
  };

  const handleAlbumChange = (event) => {
    const nextAlbum = event.target.value;
    onUpdate(
      buildUpdatesForAlbumSelection(infoEntries, form.compositor, nextAlbum, form),
    );
  };

  if (section === "letra" || section === "informacoes" || section === "letra-base") {
    const bandOptions =
      form.banda && !relatedInfo.bands.includes(form.banda)
        ? [form.banda, ...relatedInfo.bands]
        : relatedInfo.bands;
    const albumOptions =
      form.album && !relatedInfo.albums.includes(form.album)
        ? [form.album, ...relatedInfo.albums]
        : relatedInfo.albums;
    const yearOptions =
      form.anoLancamento && !relatedInfo.years.includes(form.anoLancamento)
        ? [form.anoLancamento, ...relatedInfo.years]
        : relatedInfo.years;
    const noteOptions =
      form.adicionais && !relatedInfo.additionalNotes.includes(form.adicionais)
        ? [form.adicionais, ...relatedInfo.additionalNotes]
        : relatedInfo.additionalNotes;

    const desktopFieldClass =
      "h-9 w-full rounded-[3px] border border-line bg-card px-2.5 text-[13px] text-ink transition-colors outline-none focus:border-pine focus:ring-1 focus:ring-pine disabled:cursor-not-allowed disabled:bg-paper/60 disabled:text-ink-soft/70";
    const desktopLabelClass = "text-xs font-medium text-ink-soft";

    return (
      <div className="divide-y divide-line/80">
        {section !== "letra-base" ? (
        <>
        <section className="pb-7">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-ink">
              Informações da música
            </h3>
            {onOpenSection ? (
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => onOpenSection("temas-musicas")}
                  className="font-medium text-ink-soft transition-colors hover:text-pine hover:underline"
                >
                  Gerenciar temas
                </button>
                <span aria-hidden className="text-line">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => onOpenSection("ficha-tecnica")}
                  className="font-medium text-ink-soft transition-colors hover:text-pine hover:underline"
                >
                  Gerenciar compositores
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-12">
            {/* Linha 1: Título, Tema e Autor/Compositor */}
            <label className="block space-y-1.5 sm:col-span-2 lg:col-span-5">
              <span className={`text-xs font-semibold ${invalidFields.titulo ? "text-danger" : "text-ink"}`}>
                Título da música <span className="text-danger" aria-hidden="true">*</span>
              </span>
              <input
                id="admin-song-title"
                value={form.titulo}
                onChange={(event) => onUpdate({ titulo: event.target.value })}
                maxLength={200}
                placeholder="Informe o título da música"
                required
                aria-invalid={invalidFields.titulo || undefined}
                aria-describedby={invalidFields.titulo ? "admin-song-title-required" : undefined}
                className={`${desktopFieldClass} h-11 text-sm font-semibold ${
                  invalidFields.titulo ? "!border-danger bg-danger-soft/30 focus:!border-danger focus:!ring-danger" : ""
                }`}
              />
              {invalidFields.titulo ? (
                <span id="admin-song-title-required" className="sr-only">Campo obrigatório.</span>
              ) : null}
            </label>

            <label className="block space-y-1.5 lg:col-span-3">
              <span className={desktopLabelClass}>Tema</span>
              <select
                id="song-editor-tema"
                value={form.tema}
                onChange={(event) => onUpdate({ tema: event.target.value })}
                className={desktopFieldClass}
              >
                <option value="">Selecionar tema…</option>
                {themeOptions.map((themeName) => (
                  <option key={themeName} value={themeName}>
                    {themeName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5 lg:col-span-4">
              <span className={desktopLabelClass}>Autor / Compositor</span>
              <select
                value={form.compositor}
                onChange={handleComposerChange}
                className={desktopFieldClass}
              >
                <option value="">Selecionar autor / compositor…</option>
                {relatedInfo.composers.map((composer) => (
                  <option key={composer} value={composer}>
                    {composer}
                  </option>
                ))}
              </select>
            </label>

            {/* Linha 2: Campos Dependentes (Álbum, Ano, Banda/Intérprete, Observações) */}
            <label className="block space-y-1.5 lg:col-span-3">
              <span className={desktopLabelClass}>Álbum</span>
              <select
                value={form.album}
                onChange={handleAlbumChange}
                disabled={!relatedInfo.hasSelectedComposer}
                className={desktopFieldClass}
              >
                <option value="">
                  {!relatedInfo.hasSelectedComposer
                    ? "—"
                    : albumOptions.length === 0
                      ? "Sem álbuns vinculados"
                      : "Selecionar álbum…"}
                </option>
                {albumOptions.map((album) => (
                  <option key={album} value={album}>
                    {album}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5 lg:col-span-2">
              <span className={desktopLabelClass}>Ano de lançamento</span>
              <select
                value={form.anoLancamento}
                onChange={(event) => onUpdate({ anoLancamento: event.target.value })}
                disabled={!relatedInfo.hasSelectedComposer}
                className={desktopFieldClass}
              >
                <option value="">
                  {!relatedInfo.hasSelectedComposer
                    ? "—"
                    : yearOptions.length === 0
                      ? "Sem ano"
                      : "Selecionar…"}
                </option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5 lg:col-span-3">
              <span className={desktopLabelClass}>Banda / Intérprete</span>
              <select
                value={form.banda}
                onChange={(event) => onUpdate({ banda: event.target.value })}
                disabled={!relatedInfo.hasSelectedComposer}
                className={desktopFieldClass}
              >
                <option value="">
                  {!relatedInfo.hasSelectedComposer
                    ? "—"
                    : bandOptions.length === 0
                      ? "Sem banda vinculada"
                      : "Selecionar intérprete…"}
                </option>
                {bandOptions.map((band) => (
                  <option key={band} value={band}>
                    {band}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5 sm:col-span-2 lg:col-span-4">
              <span className={desktopLabelClass}>Observações</span>
              <select
                value={form.adicionais}
                onChange={(event) => onUpdate({ adicionais: event.target.value })}
                disabled={!relatedInfo.hasSelectedComposer}
                className={desktopFieldClass}
              >
                <option value="">
                  {!relatedInfo.hasSelectedComposer
                    ? "—"
                    : noteOptions.length === 0
                      ? "Sem observações"
                      : "Selecionar observação…"}
                </option>
                {noteOptions.map((note) => (
                  <option key={note} value={note}>
                    {note}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="py-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-ink">
                Demonstração de áudio
              </h3>
              <p className="mt-0.5 text-xs text-ink-soft">
                Arquivo de referência (MP3, WAV, M4A, OGG ou FLAC).
              </p>
            </div>

            {!(form.audioDataUrl || (form.audioArquivo && !form.removeAudio)) ? (
              <label className="inline-flex h-8.5 cursor-pointer items-center gap-2 self-start rounded-[3px] border border-line bg-card px-3.5 text-xs font-medium text-ink transition-colors hover:bg-paper sm:self-auto">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-3.5 w-3.5 text-ink-soft"
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
                <span>Selecionar arquivo de áudio…</span>
                <input
                  type="file"
                  accept="audio/*,.mp1,.mp2,.mp3,.mpeg,.wav,.m4a,.ogg,.aac,.flac"
                  className="sr-only"
                  onChange={onAudioChange}
                />
              </label>
            ) : null}
          </div>

          {form.audioDataUrl || (form.audioArquivo && !form.removeAudio) ? (
            <div className="mt-4 flex flex-col gap-3 border-l-2 border-pine pl-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate font-mono text-xs text-ink">
                  {form.audioNome || form.audioArquivo}
                </p>
                <audio
                  controls
                  preload="metadata"
                  src={form.audioDataUrl || getAudioUrl(form.audioArquivo)}
                  className="h-8 w-full max-w-md"
                />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label className="inline-flex h-10 cursor-pointer items-center rounded-[3px] border border-line bg-card px-4 text-xs font-medium text-ink hover:bg-paper">
                  Substituir
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
                  className="h-10 rounded-[3px] border border-danger/30 bg-card px-4 text-xs font-medium text-danger hover:bg-danger-soft"
                >
                  Remover
                </button>
              </div>
            </div>
          ) : null}
        </section>

        </>
        ) : null}
        {section !== "informacoes" ? (
        <section className="space-y-5 pt-7">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-ink">Letra e refrão</h3>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="space-y-1.5 lg:col-span-7">
              <span className={invalidFields.letra ? "text-xs font-medium text-danger" : desktopLabelClass}>
                Letra {requireBaseLyrics ? <span className="text-danger" aria-hidden="true">*</span> : null}
              </span>
              <LyricEditor
                id="admin-song-lyrics"
                label="Letra"
                required={requireBaseLyrics}
                invalid={Boolean(invalidFields.letra)}
                describedBy={invalidFields.letra ? "admin-song-lyrics-required" : undefined}
                text={form.letra}
                marks={[]}
                showVoiceTools={false}
                placeholder={"Primeira estrofe\n\nSegunda estrofe"}
                minClass="min-h-[260px]"
                editorClassName="rounded-[3px] bg-card px-3.5 py-2.5 text-left text-[13px] text-ink focus:border-pine focus:ring-1 focus:ring-pine"
                onChange={({ text }) => onUpdate({ letra: text })}
              />
              {invalidFields.letra ? (
                <span id="admin-song-lyrics-required" className="sr-only">Campo obrigatório.</span>
              ) : null}
            </div>

            <div className="space-y-4 lg:col-span-5">
              <div className="space-y-1.5">
                <label className={desktopLabelClass}>Refrão</label>
                <LyricEditor
                  label="Refrão"
                  text={form.refrao}
                  marks={[]}
                  showVoiceTools={false}
                  placeholder="Texto do refrão (opcional)"
                  italic
                  minClass="min-h-[140px]"
                  editorClassName="rounded-[3px] bg-card px-3.5 py-2.5 text-left text-[13px] text-ink focus:border-pine focus:ring-1 focus:ring-pine"
                  onChange={({ text }) => onUpdate({ refrao: text })}
                />
              </div>

              {form.refrao.trim() ? (
                <div className="space-y-2.5 border-t border-line/70 pt-3.5">
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
            </div>
          </div>
        </section>
        ) : null}
      </div>
    );
  }

  if (section === "vozes") {
    return (
      <section className="space-y-5">
        <div className="border-b border-line/80 pb-4">
          <h3 className="text-sm font-semibold tracking-tight text-ink">Arranjo de vozes</h3>
          <p className="mt-1 text-xs text-ink-soft">
            Selecione trechos do texto para marcar cada voz. A prévia atualiza em tempo real.
          </p>
        </div>
        <VocalArrangementEditor
          text={form.letraVozes}
          marks={form.vozesArranjo}
          letra={form.letra}
          refrao={form.refrao}
          cronologica={form.cronologica}
          refraoPrimeiro={form.refraoPrimeiro}
          somenteVozes={form.somenteVozes}
          onChange={({ text, marks }) => onUpdate({ letraVozes: text, vozesArranjo: marks })}
          onSomenteVozesChange={(somenteVozes) => onUpdate({ somenteVozes })}
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-line/80 pb-4">
        <h3 className="text-sm font-semibold tracking-tight text-ink">Cifras</h3>
        <p className="mt-1 text-xs text-ink-soft">
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
    <label className="flex cursor-pointer items-start gap-2.5 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 rounded-[2px] accent-pine"
      />
      <span className="text-xs leading-snug">
        <span className="font-medium text-ink">{title}</span>
        {description ? <span className="text-ink-soft"> — {description}</span> : null}
      </span>
    </label>
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
  onCollapse,
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
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-medium text-ink-soft">
            {orientation === "landscape" ? "Paisagem" : "Retrato"} · {isPreviewDark ? "Escuro" : "Claro"}
          </span>
          {!modal && onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Recolher prévia ao vivo"
              title="Recolher prévia ao vivo"
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-line bg-card text-ink-soft transition-colors hover:border-ink-soft/50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
            >
              <PreviewCollapseIcon collapsed={false} className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
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
              aria-label="Abrir prévia ampliada"
              aria-haspopup="dialog"
              title="Expandir simulador (Retrato / Paisagem)"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-paper px-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink-soft/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
            >
              <ExpandMiniIcon className="h-3.5 w-3.5" />
              <span>Prévia</span>
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
