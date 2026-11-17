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
import AdminPersonalizationSection from "@/pages/AdminPersonalizationSection.jsx";

const EDIT_SECTIONS = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "letra", label: "Letra", icon: LyricIcon },
  { id: "vozes", label: "Vozes", icon: VoicesPartsIcon },
  { id: "cifra", label: "Cifra", icon: ChordIcon },
];

const PERSONALIZATION_SECTIONS = [
  { id: "identidade", label: "Identidade" },
  { id: "temas", label: "Temas" },
  { id: "visualizacao", label: "Visualização" },
  { id: "acoes", label: "Acesso e ações" },
];

const PREVIEW_MODES = [
  { id: "letra", label: "Letra" },
  { id: "vozes", label: "Vozes" },
  { id: "cifra", label: "Cifra" },
];

const SECTION_TITLES = {
  home: "Home",
  letra: "Letra",
  vozes: "Vozes",
  cifra: "Cifra",
  acessos: "Pessoas e acessos",
  personalizacao: "Personalização",
};

export default function AdminContentPage({ user, onLogout, accessPanel }) {
  const { appName } = getAppSettings();
  const [songs, setSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeSection, setActiveSection] = useState("home");
  const [activePersonalizationSection, setActivePersonalizationSection] = useState("identidade");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewOrientation, setPreviewOrientation] = useState("portrait");
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
  const isPersonalizationSection = activeSection === "personalizacao";
  const isUtilitySection = isAccessSection || isPersonalizationSection;
  const isSongSection = ["letra", "vozes", "cifra"].includes(activeSection);
  const previewMode = isSongSection ? activeSection : "letra";
  const number = withNumbers(songs).find((song) => song.id === selectedId)?.numero;

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
      setActiveSection("home");
    }
    setDirty(false);
    setError("");
    setNotice("");
  };

  const saveSong = async () => {
    if (!form.titulo.trim()) {
      setActiveSection("home");
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
        setActiveSection("home");
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

  return (
    <div className="flex h-full min-h-0 w-full bg-paper text-ink">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-card lg:flex">
        <div className="border-b border-line px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">{appName}</p>
          <h1 className="mt-1 text-lg font-semibold">Estúdio de edição</h1>
          <p className="mt-1 text-xs text-ink-soft">Painel administrativo</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Seções do painel">
          {EDIT_SECTIONS.map((section) => (
            <SidebarButton
              key={section.id}
              active={activeSection === section.id}
              icon={section.icon}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </SidebarButton>
          ))}
          <SidebarButton
            active={isPersonalizationSection}
            icon={SettingsIcon}
            onClick={() => setActiveSection("personalizacao")}
          >
            Personalização
          </SidebarButton>
          {isPersonalizationSection ? (
            <div
              className="ml-10 space-y-1 border-l border-line pl-2"
              role="group"
              aria-label="Submenus de personalização"
            >
              {PERSONALIZATION_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActivePersonalizationSection(section.id)}
                  aria-current={activePersonalizationSection === section.id ? "page" : undefined}
                  className={`min-h-9 w-full rounded-lg px-3 text-left text-sm ${
                    activePersonalizationSection === section.id
                      ? "bg-pine/10 font-semibold text-pine"
                      : "text-ink-soft hover:bg-paper hover:text-ink"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="my-4 border-t border-line" />
          <SidebarButton
            active={isAccessSection}
            icon={PeopleIcon}
            onClick={() => setActiveSection("acessos")}
          >
            Pessoas e acessos
          </SidebarButton>
        </nav>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-line bg-card">
          <div className="flex min-h-16 items-center gap-2 px-3 sm:gap-4 sm:px-7">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-soft">Administração / {SECTION_TITLES[activeSection]}</p>
              <h2 className="truncate text-lg font-semibold">
                {editing && !isUtilitySection ? form.titulo || "Nova música" : SECTION_TITLES[activeSection]}
              </h2>
            </div>
            {editing && !isUtilitySection ? (
              <div className="flex shrink-0 items-center gap-2">
                {dirty ? (
                  <button
                    type="button"
                    onClick={discardChanges}
                    className="hidden h-10 rounded-lg border border-line px-4 text-sm font-medium hover:bg-paper sm:inline-flex sm:items-center"
                  >
                    Descartar
                  </button>
                ) : null}
                {selectedId ? (
                  <button
                    type="button"
                    onClick={() => selectedSong && removeSong(selectedSong)}
                    className="hidden h-10 rounded-lg border border-danger/30 px-4 text-sm font-medium text-danger hover:bg-danger-soft sm:inline-flex sm:items-center"
                  >
                    Excluir
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={saveSong}
                  disabled={saving || !dirty}
                  className="h-10 rounded-lg bg-pine px-4 text-sm font-semibold text-white hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-50"
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
                className="h-9 shrink-0 rounded-lg border border-line px-2 text-xs font-medium hover:bg-paper sm:px-3 sm:text-sm"
              >
                Visualizar
              </button>
            ) : null}
            <div className="flex min-w-0 shrink-0 items-center gap-2 border-l border-line pl-2 sm:gap-3 sm:pl-4">
              <div className="min-w-0 max-w-20 text-right sm:max-w-40">
                <p className="truncate text-xs font-medium sm:text-sm">{user.name}</p>
                <p className="hidden truncate text-xs text-ink-soft md:block">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="h-9 shrink-0 rounded-lg border border-line px-2 text-xs font-medium hover:bg-paper sm:px-3 sm:text-sm"
              >
                Sair
              </button>
            </div>
          </div>
          <nav
            className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 lg:hidden"
            aria-label="Seções do painel"
          >
            {[
              ...EDIT_SECTIONS,
              { id: "personalizacao", label: "Personalização", shortLabel: "P" },
              { id: "acessos", label: "Acessos", shortLabel: "A" },
            ].map(
              (section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`shrink-0 rounded-full px-3 py-2 text-sm ${
                    activeSection === section.id
                      ? "bg-pine text-white"
                      : "text-ink-soft hover:bg-paper"
                  }`}
                >
                  {section.label}
                </button>
              ),
            )}
          </nav>
          {isPersonalizationSection ? (
            <nav
              className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 lg:hidden"
              aria-label="Submenus de personalização"
            >
              {PERSONALIZATION_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActivePersonalizationSection(section.id)}
                  aria-current={activePersonalizationSection === section.id ? "page" : undefined}
                  className={`shrink-0 rounded-full px-3 py-2 text-sm ${
                    activePersonalizationSection === section.id
                      ? "bg-pine text-white"
                      : "text-ink-soft hover:bg-paper"
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
              : "grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px] lg:overflow-hidden"
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
            ) : isPersonalizationSection ? (
              <AdminPersonalizationSection activeTab={activePersonalizationSection} />
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
                {activeSection === "home" ? (
                  <HomeSection
                    totalSongs={songs.length}
                    editing={editing}
                    selectedSong={selectedSong}
                    form={form}
                  />
                ) : activeSection === "letra" ? (
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

          {isSongSection ? (
            <aside className="border-t border-line bg-paper p-4 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
              <MobilePreview
                form={form}
                number={number}
                previewMode={previewMode}
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
          editing={editing}
          orientation={previewOrientation}
          onOrientationChange={setPreviewOrientation}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}

function SidebarButton({ active, icon: Icon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors ${
        active ? "bg-pine text-white" : "text-ink-soft hover:bg-paper hover:text-ink"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
          active ? "bg-white/15 text-white" : "bg-paper text-pine"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
      </span>
      {children}
    </button>
  );
}

function HomeIcon({ className }) {
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
      <path d="m3.5 10 8.5-7 8.5 7" />
      <path d="M5.5 9v11h13V9" />
      <path d="M9.5 20v-6h5v6" />
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

function HomeSection({
  totalSongs,
  editing,
  form,
  selectedSong,
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard label="Músicas no catálogo" value={totalSongs} />
        <SummaryCard
          label="Estado da edição"
          value={editing ? (selectedSong ? "Editando música" : "Nova música") : "Nenhuma selecionada"}
        />
      </div>
      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold">Editor de músicas</h3>
        <p className="mt-1 text-sm leading-6 text-ink-soft">
          Gerencie cada música nas seções Letra, Vozes e Cifra. A seleção, o título e o conteúdo
          principal ficam em Letra; as demais seções cuidam do arranjo e dos acordes.
        </p>
        {editing ? (
          <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-sm font-medium">
            Em edição: {form.titulo.trim() || "Nova música"}
          </p>
        ) : null}
      </section>
    </div>
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
      className={`overflow-hidden rounded-2xl border border-line bg-card shadow-sm ${
        fillHeight ? "flex min-h-0 flex-1 flex-col" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h3 className="text-base font-semibold">Música</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Selecione uma música ou crie um novo registro.
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="h-10 rounded-lg bg-pine px-4 text-sm font-semibold text-white hover:bg-pine-dark"
        >
          Nova música
        </button>
      </div>
      {totalSongs ? (
        <div className="border-b border-line p-4">
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Buscar no catálogo"
            aria-label="Buscar músicas"
            className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
          />
        </div>
      ) : null}
      {loading ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Carregando catálogo…</p>
      ) : songs.length ? (
        <ul
          className={`divide-y divide-line overflow-y-auto ${
            fillHeight ? "min-h-0 flex-1" : "max-h-64"
          }`}
        >
          {songs.map((song) => (
            <li key={song.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-ink-soft">
                {String(song.numero).padStart(3, "0")}
              </span>
              <button
                type="button"
                onClick={() => onSelect(song)}
                aria-current={selectedId === song.id ? "true" : undefined}
                className={`min-w-0 flex-1 rounded-lg px-2 py-1 text-left ${
                  selectedId === song.id ? "bg-pine/10 text-pine" : "hover:bg-paper"
                }`}
              >
                <span className="block truncate text-sm font-medium">{song.titulo}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {song.audioArquivo ? "Com demonstração" : "Sem demonstração"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSelect(song)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-pine hover:bg-pine/5"
              >
                Editar
              </button>
            </li>
          ))}
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
        <section className="space-y-5 rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7">
          <div>
            <h3 className="text-lg font-semibold">Informações da música</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Defina o título e a demonstração de áudio junto com o conteúdo principal.
            </p>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Título</span>
            <input
              value={form.titulo}
              onChange={(event) => onUpdate({ titulo: event.target.value })}
              maxLength={200}
              placeholder="Título da música"
              className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
            />
          </label>
          <div className="space-y-3">
            <span className="block text-sm font-medium">Demonstração de áudio</span>
            {form.audioDataUrl || (form.audioArquivo && !form.removeAudio) ? (
              <div className="space-y-3 rounded-xl border border-line bg-paper p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {form.audioNome || form.audioArquivo}
                  </span>
                  <div className="flex gap-2">
                    <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-line bg-card px-3 text-sm hover:bg-paper">
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
                      className="h-9 rounded-lg border border-danger/30 px-3 text-sm text-danger hover:bg-danger-soft"
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <audio
                  controls
                  preload="metadata"
                  src={form.audioDataUrl || getAudioUrl(form.audioArquivo)}
                  className="h-10 w-full"
                />
              </div>
            ) : (
              <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-paper px-4 py-5 text-center text-sm text-ink-soft hover:border-pine/50">
                <span className="font-medium text-ink">Adicionar demonstração</span>
                <span className="mt-1">MP3, WAV, M4A, OGG e outros formatos de áudio</span>
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
        <section className="space-y-6 rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7">
          <div>
            <h3 className="text-lg font-semibold">Letra e refrão</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Edite o texto que será exibido no aplicativo.
            </p>
          </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Letra</label>
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
          <label className="text-sm font-medium">Refrão</label>
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
      <section className="space-y-5 rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7">
        <div>
          <h3 className="text-lg font-semibold">Arranjo de vozes</h3>
          <p className="mt-1 text-sm text-ink-soft">
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
    <section className="space-y-6 rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7">
      <div>
        <h3 className="text-lg font-semibold">Cifras</h3>
        <p className="mt-1 text-sm text-ink-soft">
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
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 hover:bg-paper/60">
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
    <section className="rounded-2xl border border-line bg-card p-8 text-center shadow-sm sm:p-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-pine">
        {SECTION_TITLES[section]}
      </p>
      <h3 className="mt-2 text-xl font-semibold">Selecione uma música para editar</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink-soft">
        {hasSongs
          ? "Escolha uma música na aba Letra para editar o arranjo ou as cifras."
          : "Crie a primeira música pela aba Letra. O editor e a prévia mobile ficam lado a lado."}
      </p>
      <button
        type="button"
        onClick={hasSongs ? onGoToLyrics : onCreate}
        className="mt-6 h-11 rounded-lg bg-pine px-5 text-sm font-semibold text-white hover:bg-pine-dark"
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
  editing,
  orientation = "portrait",
  modal = false,
}) {
  const { appName } = getAppSettings();
  const previewLabel = PREVIEW_MODES.find((mode) => mode.id === previewMode)?.label || "Letra";
  const deviceHeight =
    orientation === "landscape"
      ? "h-[min(420px,calc(100dvh-180px))] min-h-[260px]"
      : modal
        ? "h-[min(620px,calc(100dvh-180px))] min-h-[300px]"
        : "h-[min(620px,calc(100dvh-225px))] min-h-[430px]";
  const barHeight = orientation === "landscape" ? "h-11" : "h-14";
  const hasAudio = Boolean(form.audioDataUrl || (form.audioArquivo && !form.removeAudio));
  const hasContent = Boolean(
    form.letra.trim() || form.refrao.trim() || form.letraVozes.trim(),
  );

  return (
    <div
      className={`mx-auto w-full ${
        orientation === "landscape" ? "max-w-[760px]" : "max-w-[340px]"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-pine">Prévia ao vivo</p>
          <p className="mt-1 text-xs text-ink-soft">
            {previewLabel} · {orientation === "landscape" ? "Paisagem" : "Retrato"}
          </p>
        </div>
        <span aria-hidden className="text-xs font-semibold text-ink-soft">
          {orientation === "landscape" ? "PAISAGEM" : "MOBILE"}
        </span>
      </div>
      <div className="mx-auto w-full overflow-hidden rounded-[2.2rem] border-[6px] border-neutral-800 bg-neutral-900 p-1.5 shadow-xl ring-1 ring-black/20">
        <div
          className={`flex ${deviceHeight} flex-col overflow-hidden rounded-[1.8rem] bg-paper text-ink`}
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
              className="grid grid-cols-2"
            >
              <div
                role="status"
                aria-label={`Visualização atual: ${previewLabel}`}
                className={`flex items-center justify-center text-pine ${
                  orientation === "landscape"
                    ? "h-9 flex-row gap-1.5 text-[11px]"
                    : "h-12 flex-col gap-0.5 text-[11px]"
                } font-medium`}
              >
                {previewMode === "letra" ? (
                  <LyricIcon className="h-4 w-4 shrink-0" />
                ) : previewMode === "vozes" ? (
                  <VoicesPartsIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <ChordIcon className="h-4 w-4 shrink-0" />
                )}
                {previewLabel}
              </div>
              <div
                className={`flex items-center justify-center text-ink-soft ${
                  orientation === "landscape"
                    ? "h-9 flex-row gap-1.5 text-[11px]"
                    : "h-12 flex-col gap-0.5 text-[11px]"
                } font-medium`}
              >
                <SettingsIcon className="h-4 w-4 shrink-0" />
                Configuração
              </div>
            </nav>
            <div aria-hidden className="flex justify-center pb-1.5 pt-0.5">
              <span className="h-1 w-24 rounded-full bg-ink/20" />
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-ink-soft">
        A prévia é somente visualização. As edições são feitas nesta tela web.
      </p>
    </div>
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
            editing={editing}
            orientation={orientation}
            modal
          />
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold">{value}</p>
    </div>
  );
}
