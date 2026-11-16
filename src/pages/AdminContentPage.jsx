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
import VocalArrangementEditor from "@/components/VocalArrangementEditor.jsx";
import { emptySongForm, fieldsFromSong, payloadFromSongForm } from "@/lib/songEditor.js";
import { filterSongs, withNumbers } from "@/lib/songs.js";
import { songHasVoices } from "@/lib/voices.js";
import { getAppSettings } from "@/lib/appSettings.js";
import AdminPersonalizationSection from "@/pages/AdminPersonalizationSection.jsx";

const EDIT_SECTIONS = [
  { id: "home", label: "Home", shortLabel: "H" },
  { id: "letra", label: "Letra", shortLabel: "L" },
  { id: "vozes", label: "Vozes", shortLabel: "V" },
  { id: "cifra", label: "Cifra", shortLabel: "C" },
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
  const [previewMode, setPreviewMode] = useState("letra");
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

  const selectedSong = songs.find((song) => song.id === selectedId) ?? null;
  const visibleSongs = useMemo(() => filterSongs(songs, search), [songs, search]);
  const isAccessSection = activeSection === "acessos";
  const isPersonalizationSection = activeSection === "personalizacao";
  const isUtilitySection = isAccessSection || isPersonalizationSection;
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
              shortLabel={section.shortLabel}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </SidebarButton>
          ))}
          <SidebarButton
            active={isPersonalizationSection}
            shortLabel="P"
            onClick={() => setActiveSection("personalizacao")}
          >
            Personalização
          </SidebarButton>
          {isPersonalizationSection ? (
            <div className="ml-9 space-y-1 border-l border-line pl-3">
              {PERSONALIZATION_SECTIONS.map((section) => (
                <SidebarSubButton
                  key={section.id}
                  active={activePersonalizationSection === section.id}
                  onClick={() => setActivePersonalizationSection(section.id)}
                >
                  {section.label}
                </SidebarSubButton>
              ))}
            </div>
          ) : null}
          <div className="my-4 border-t border-line" />
          <SidebarButton
            active={isAccessSection}
            shortLabel="P"
            onClick={() => setActiveSection("acessos")}
          >
            Pessoas e acessos
          </SidebarButton>
        </nav>
        <div className="border-t border-line p-4">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-ink-soft">{user.email}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 h-9 w-full rounded-lg border border-line text-sm font-medium hover:bg-paper"
          >
            Sair
          </button>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-line bg-card">
          <div className="flex min-h-16 items-center gap-4 px-4 sm:px-7">
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
            ) : activeSection === "home" ? (
              <button
                type="button"
                onClick={startNewSong}
                className="h-10 shrink-0 rounded-lg bg-pine px-4 text-sm font-semibold text-white hover:bg-pine-dark"
              >
                Nova música
              </button>
            ) : null}
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

        {editing && !isUtilitySection ? (
          <div className="flex shrink-0 items-center gap-3 border-b border-line bg-card px-4 py-3 sm:px-7">
            <label htmlFor="admin-song-title" className="shrink-0 text-sm font-medium">
              Título
            </label>
            <input
              id="admin-song-title"
              value={form.titulo}
              onChange={(event) => updateForm({ titulo: event.target.value })}
              maxLength={200}
              placeholder="Título da música"
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
            />
            <span className="hidden whitespace-nowrap text-xs text-ink-soft sm:inline">
              {selectedId ? `Nº ${String(number ?? "—").padStart(3, "0")}` : "Nova música"}
            </span>
          </div>
        ) : null}

        <div
          className={`grid min-h-0 flex-1 ${
            isUtilitySection
              ? "grid-cols-1 overflow-y-auto"
              : "grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px] lg:overflow-hidden"
          }`}
        >
          <main className="min-w-0 p-4 sm:p-6 lg:min-h-0 lg:overflow-y-auto lg:p-8">
            {isAccessSection ? (
              accessPanel
            ) : isPersonalizationSection ? (
              <AdminPersonalizationSection activeTab={activePersonalizationSection} />
            ) : (
              <div className="mx-auto w-full max-w-5xl space-y-5">
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
                    songs={visibleSongs}
                    totalSongs={songs.length}
                    loading={loadingSongs}
                    search={search}
                    onSearch={setSearch}
                    editing={editing}
                    form={form}
                    selectedSong={selectedSong}
                    onSelect={selectSong}
                    onNew={startNewSong}
                    onDelete={removeSong}
                    onAudioChange={handleAudioChange}
                    onClearAudio={clearAudio}
                  />
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
                    hasSongs={songs.length > 0}
                  />
                )}
              </div>
            )}
          </main>

          {!isUtilitySection ? (
            <aside className="border-t border-line bg-[#e9e5dc] p-4 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
              <MobilePreview
                form={form}
                number={number}
                previewMode={previewMode}
                onPreviewMode={setPreviewMode}
                editing={editing}
              />
            </aside>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SidebarButton({ active, shortLabel, onClick, children }) {
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
        aria-hidden
        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold ${
          active ? "bg-white/15 text-white" : "bg-paper text-pine"
        }`}
      >
        {shortLabel}
      </span>
      {children}
    </button>
  );
}

function SidebarSubButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`min-h-9 w-full rounded-lg px-2 text-left text-xs font-medium ${
        active ? "bg-pine/10 text-pine" : "text-ink-soft hover:bg-paper hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function HomeSection({
  songs,
  totalSongs,
  loading,
  search,
  onSearch,
  editing,
  form,
  selectedSong,
  onSelect,
  onNew,
  onDelete,
  onAudioChange,
  onClearAudio,
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard label="Músicas no catálogo" value={totalSongs} />
        <SummaryCard
          label="Estado da edição"
          value={editing ? (selectedSong ? "Editando" : "Nova música") : "Nenhuma selecionada"}
        />
      </div>

      {editing ? (
        <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Informações da música</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Gerencie a demonstração de áudio e confira os dados do catálogo.
              </p>
            </div>
            {selectedSong ? (
              <span className="rounded-full bg-pine/10 px-3 py-1 text-xs font-medium text-pine">
                Nº {String(selectedSong.numero).padStart(3, "0")}
              </span>
            ) : null}
          </div>
          <div className="mt-5 space-y-3">
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
          <div className="mt-5 rounded-xl bg-paper px-4 py-3 text-sm leading-6 text-ink-soft">
            As seções Letra, Vozes e Cifra usam o mesmo registro. Salve para publicar as alterações
            no catálogo.
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Catálogo</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Selecione uma música para editar ou crie um novo registro.
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
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">Músicas</h3>
            <p className="mt-1 text-sm text-ink-soft">
              {songs.length} resultado{songs.length === 1 ? "" : "s"}
            </p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Buscar no catálogo"
            aria-label="Buscar músicas"
            className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine sm:max-w-xs"
          />
        </div>
        {loading ? (
          <p className="px-5 py-8 text-sm text-ink-soft">Carregando catálogo…</p>
        ) : songs.length ? (
          <ul className="divide-y divide-line">
            {songs.map((song) => (
              <li key={song.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-ink-soft">
                  {String(song.numero).padStart(3, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => onSelect(song)}
                  className="min-w-0 flex-1 text-left"
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
                <button
                  type="button"
                  onClick={() => onDelete(song)}
                  aria-label={`Excluir ${song.titulo}`}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-sm text-ink-soft">
            {search ? "Nenhuma música encontrada." : "O catálogo ainda está vazio."}
          </p>
        )}
      </section>
    </div>
  );
}

function SongEditorSection({ section, form, onUpdate }) {
  if (section === "letra") {
    return (
      <section className="space-y-6 rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7">
        <div>
          <h3 className="text-lg font-semibold">Letra e refrão</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Edite o texto que será exibido no aplicativo. As cifras acompanham as linhas da letra.
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

function EmptyEditorSection({ section, onCreate, hasSongs }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-8 text-center shadow-sm sm:p-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-pine">
        {SECTION_TITLES[section]}
      </p>
      <h3 className="mt-2 text-xl font-semibold">Selecione uma música para editar</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink-soft">
        {hasSongs
          ? "Escolha uma música na seção Home ou crie uma nova. As alterações ficam no painel web e aparecem na prévia mobile."
          : "Crie a primeira música pelo botão abaixo. O editor e a prévia mobile ficam lado a lado."}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 h-11 rounded-lg bg-pine px-5 text-sm font-semibold text-white hover:bg-pine-dark"
      >
        Nova música
      </button>
    </section>
  );
}

function MobilePreview({ form, number, previewMode, onPreviewMode, editing }) {
  const { appName } = getAppSettings();
  const hasVoices = songHasVoices(form);
  const effectiveMode =
    form.somenteVozes && hasVoices && previewMode === "letra" ? "vozes" : previewMode;

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-pine">Prévia ao vivo</p>
          <p className="mt-1 text-xs text-ink-soft">Visualização do resultado no app</p>
        </div>
        <span aria-hidden className="text-xs font-semibold text-ink-soft">MOBILE</span>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1">
        {PREVIEW_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onPreviewMode(mode.id)}
            className={`h-8 rounded-lg text-xs font-medium ${
              previewMode === mode.id ? "bg-pine text-white" : "text-ink-soft hover:bg-paper"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-[2rem] border-[7px] border-[#242424] bg-card shadow-xl">
        <div className="flex h-[min(620px,calc(100dvh-225px))] min-h-[430px] flex-col overflow-hidden rounded-[1.55rem] bg-card">
          <div className="flex h-12 shrink-0 items-center gap-3 bg-pine px-4 text-white">
            <span className="text-lg" aria-hidden>‹</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {form.titulo.trim() || (editing ? "Nova música" : "Prévia do catálogo")}
              </p>
              <p className="text-[10px] text-white/70">
                {number ? String(number).padStart(3, "0") : appName}
              </p>
            </div>
            <span className="text-xs font-medium">{PREVIEW_MODES.find((mode) => mode.id === effectiveMode)?.label}</span>
          </div>
          <div className="song-scroll min-h-0 flex-1 overflow-y-auto">
            {editing && (form.letra.trim() || form.refrao.trim() || form.letraVozes.trim()) ? (
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
                showVoices={effectiveMode === "vozes"}
                showChords={effectiveMode === "cifra"}
                fontSize={14}
              />
            ) : (
              <div className="flex h-full min-h-72 items-center justify-center px-8 text-center">
                <p className="text-sm leading-6 text-ink-soft">
                  {editing
                    ? "Adicione a letra, o arranjo ou a cifra para visualizar o resultado."
                    : "Selecione ou crie uma música. A prévia aparece aqui sem abrir o app."}
                </p>
              </div>
            )}
          </div>
          <div className="flex h-12 shrink-0 items-center justify-around border-t border-line bg-card text-[10px] text-ink-soft">
            <span>Catálogo</span>
            <span>Favoritos</span>
            <span>Configurações</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-ink-soft">
        A prévia é somente visualização. As edições são feitas nesta tela web.
      </p>
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
