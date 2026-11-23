import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import EditIcon from "@/components/EditIcon.jsx";
import SongScroll from "@/components/SongScroll.jsx";
import { DEFAULT_THEMES } from "@/data/themes.js";
import {
  DEFAULT_SONG_INFO_REGISTRY,
  useSongInfoRegistry,
} from "@/lib/songInfoRegistry.js";
import { useSongThemes } from "@/lib/songThemes.js";
import { ACCENT_OPTIONS, useAccent, useTheme } from "@/lib/theme.js";

function createEmptyInfoItem() {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    banda: "",
    album: "",
    anoLancamento: "",
    adicionais: "",
  };
}

function normalizeStr(value) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

export default function AdminRegistriesSection({
  activeTab = "temas",
  songs = [],
  onDirtyChange,
}) {
  const currentTheme = useTheme();
  const currentAccentId = useAccent();
  const accentOption =
    ACCENT_OPTIONS.find((option) => option.id === currentAccentId) || ACCENT_OPTIONS[0];
  const isPreviewDark = currentTheme === "dark";
  const appPreviewVars = {
    "--paper": isPreviewDark ? accentOption.darkPaper : accentOption.paper,
    "--card": isPreviewDark ? accentOption.darkCard : accentOption.card,
    "--ink": isPreviewDark ? accentOption.darkInk : accentOption.ink,
    "--ink-soft": isPreviewDark ? accentOption.darkInkSoft : accentOption.inkSoft,
    "--line": isPreviewDark ? accentOption.darkLine : accentOption.line,
    "--pine": isPreviewDark ? accentOption.darkPine : accentOption.pine,
    "--pine-dark": isPreviewDark ? accentOption.darkPineDark : accentOption.pineDark,
  };

  const {
    themes,
    error: themeError,
    createTheme,
    updateTheme,
    deleteTheme,
  } = useSongThemes();

  const {
    entries: infoEntries,
    error: infoRegistryError,
    createEntry: createInfoEntry,
    updateEntry: updateInfoEntry,
    deleteEntry: deleteInfoEntry,
  } = useSongInfoRegistry(songs);

  const [themeEditorOpen, setThemeEditorOpen] = useState(false);
  const [previewContainer, setPreviewContainer] = useState(null);
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [themeForm, setThemeForm] = useState({ name: "", description: "" });
  const [themeNotice, setThemeNotice] = useState("");
  const [themeToDelete, setThemeToDelete] = useState(null);

  const [infoEditorOpen, setInfoEditorOpen] = useState(false);
  const [editingInfoId, setEditingInfoId] = useState(null);
  const [infoComposer, setInfoComposer] = useState("");
  const [infoItems, setInfoItems] = useState(() => [createEmptyInfoItem()]);
  const [infoSearch, setInfoSearch] = useState("");
  const [infoNotice, setInfoNotice] = useState("");
  const [infoEntryToDelete, setInfoEntryToDelete] = useState(null);
  const initialDraft = useRef("");
  const editorDirty = themeEditorOpen
    ? JSON.stringify(themeForm) !== initialDraft.current
    : infoEditorOpen
      ? JSON.stringify({ compositor: infoComposer, items: infoItems }) !== initialDraft.current
      : false;

  useEffect(() => {
    onDirtyChange?.(editorDirty);
  }, [editorDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  useEffect(() => {
    if (!themeToDelete && !infoEntryToDelete) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setThemeToDelete(null);
        setInfoEntryToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [themeToDelete, infoEntryToDelete]);

  const getSongsForTheme = (theme) => {
    if (!theme) return [];
    const targetName = normalizeStr(theme.name);
    const idSet = new Set((theme.songIds || []).map(Number));
    return songs.filter(
      (song) =>
        (targetName && normalizeStr(song.tema) === targetName) ||
        idSet.has(Number(song.id)),
    );
  };

  const openNewThemeEditor = () => {
    initialDraft.current = JSON.stringify({ name: "", description: "" });
    setEditingThemeId(null);
    setThemeForm({ name: "", description: "" });
    setThemeNotice("");
    setThemeEditorOpen(true);
  };

  const openEditThemeEditor = (theme) => {
    initialDraft.current = JSON.stringify({
      name: theme.name,
      description: theme.description || "",
    });
    setEditingThemeId(theme.id);
    setThemeForm({
      name: theme.name,
      description: theme.description || "",
    });
    setThemeNotice("");
    setThemeEditorOpen(true);
  };

  const closeThemeEditor = () => {
    setThemeEditorOpen(false);
    setEditingThemeId(null);
    setThemeForm({ name: "", description: "" });
  };

  const cancelThemeEditor = () => {
    if (editorDirty && !window.confirm("Descartar as alterações não salvas?")) return;
    closeThemeEditor();
  };

  const submitThemeForm = (event) => {
    event.preventDefault();
    setThemeNotice("");
    if (editingThemeId) {
      const currentThemeObj = themes.find((item) => item.id === editingThemeId);
      const ok = updateTheme(editingThemeId, {
        name: themeForm.name,
        description: themeForm.description,
        songIds: currentThemeObj?.songIds || [],
      });
      if (ok) {
        setThemeNotice(
          "Tema atualizado com sucesso. Ele já está disponível na caixa de opções ao editar uma música.",
        );
        closeThemeEditor();
      }
    } else {
      const ok = createTheme(themeForm.name, {
        description: themeForm.description,
        songIds: [],
      });
      if (ok) {
        setThemeNotice(
          "Tema cadastrado com sucesso. Na edição da música, clique no campo Tema para selecioná-lo.",
        );
        closeThemeEditor();
      }
    }
  };

  const handleDeleteTheme = (theme) => {
    setThemeNotice("");
    setThemeToDelete(theme);
  };

  const confirmDeleteTheme = () => {
    if (!themeToDelete) return;
    if (deleteTheme(themeToDelete.id)) {
      if (editingThemeId === themeToDelete.id) {
        closeThemeEditor();
      }
      setThemeNotice(`Tema “${themeToDelete.name}” removido do cadastro.`);
    }
    setThemeToDelete(null);
  };

  const loadSuggestedThemes = () => {
    let added = 0;
    const existingLower = new Set(themes.map((item) => normalizeStr(item.name)));
    for (const item of DEFAULT_THEMES) {
      if (!existingLower.has(normalizeStr(item.label))) {
        if (createTheme(item.label, { description: item.description, songIds: [] })) {
          added += 1;
        }
      }
    }
    setThemeNotice(
      added > 0
        ? `${added} ${added === 1 ? "tema sugerido adicionado" : "temas sugeridos adicionados"}.`
        : "Todos os temas sugeridos já estão cadastrados.",
    );
  };

  const openNewInfoEditor = () => {
    const items = [createEmptyInfoItem()];
    initialDraft.current = JSON.stringify({ compositor: "", items });
    setEditingInfoId(null);
    setInfoComposer("");
    setInfoItems(items);
    setInfoNotice("");
    setInfoEditorOpen(true);
  };

  const openEditInfoEditor = (entry, addBlankRow = false) => {
    setEditingInfoId(entry.id);
    setInfoComposer(entry.compositor);
    const baseItems =
      entry.items && entry.items.length > 0
        ? entry.items.map((item) => ({ ...item }))
        : [createEmptyInfoItem()];
    const items = addBlankRow ? [...baseItems, createEmptyInfoItem()] : baseItems;
    initialDraft.current = JSON.stringify({ compositor: entry.compositor, items });
    setInfoItems(items);
    setInfoNotice("");
    setInfoEditorOpen(true);
  };

  const closeInfoEditor = () => {
    setInfoEditorOpen(false);
    setEditingInfoId(null);
    setInfoComposer("");
    setInfoItems([createEmptyInfoItem()]);
  };

  const cancelInfoEditor = () => {
    if (editorDirty && !window.confirm("Descartar as alterações não salvas?")) return;
    closeInfoEditor();
  };

  const updateInfoItemField = (index, field, value) => {
    setInfoItems((current) =>
      current.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  const addInfoItemRow = () => {
    setInfoItems((current) => [...current, createEmptyInfoItem()]);
  };

  const removeInfoItemRow = (index) => {
    setInfoItems((current) =>
      current.length <= 1 ? [createEmptyInfoItem()] : current.filter((_, idx) => idx !== index),
    );
  };

  const submitInfoRegistryForm = (event) => {
    event.preventDefault();
    setInfoNotice("");
    if (editingInfoId) {
      const ok = updateInfoEntry(editingInfoId, {
        compositor: infoComposer,
        items: infoItems,
      });
      if (ok) {
        setInfoNotice(
          "Cadastro de informações atualizado. As opções vinculadas a este compositor já estão atualizadas na edição da música.",
        );
        closeInfoEditor();
      }
    } else {
      const ok = createInfoEntry({
        compositor: infoComposer,
        items: infoItems,
      });
      if (ok) {
        setInfoNotice(
          "Informações vinculadas ao compositor cadastradas com sucesso. Na edição da música, selecione o compositor para ver essas opções.",
        );
        closeInfoEditor();
      }
    }
  };

  const handleDeleteInfoEntry = (entry) => {
    setInfoNotice("");
    setInfoEntryToDelete(entry);
  };

  const confirmDeleteInfoEntry = () => {
    if (!infoEntryToDelete) return;
    if (deleteInfoEntry(infoEntryToDelete.id)) {
      if (editingInfoId === infoEntryToDelete.id) {
        closeInfoEditor();
      }
      setInfoNotice(`Cadastro de “${infoEntryToDelete.compositor}” removido.`);
    }
    setInfoEntryToDelete(null);
  };

  const loadSuggestedInfoEntries = () => {
    let added = 0;
    const existingLower = new Set(infoEntries.map((item) => normalizeStr(item.compositor)));
    for (const preset of DEFAULT_SONG_INFO_REGISTRY) {
      if (!existingLower.has(normalizeStr(preset.compositor))) {
        if (createInfoEntry({ compositor: preset.compositor, items: preset.items })) {
          added += 1;
        }
      }
    }
    setInfoNotice(
      added > 0
        ? `${added} ${added === 1 ? "autor/compositor sugerido adicionado" : "autores/compositores sugeridos adicionados"}.`
        : "Todos os cadastros sugeridos já estão registrados.",
    );
  };

  const filteredInfoEntries = useMemo(() => {
    const q = normalizeStr(infoSearch);
    if (!q) return infoEntries;
    return infoEntries.filter((entry) => {
      if (normalizeStr(entry.compositor).includes(q)) return true;
      return (entry.items || []).some(
        (item) =>
          normalizeStr(item.banda).includes(q) ||
          normalizeStr(item.album).includes(q) ||
          normalizeStr(item.anoLancamento).includes(q) ||
          normalizeStr(item.adicionais).includes(q),
      );
    });
  }, [infoEntries, infoSearch]);

  const previewTheme = useMemo(() => {
    if (themeEditorOpen) {
      const existing = themes.find((item) => item.id === editingThemeId);
      return {
        id: editingThemeId || "draft",
        name: themeForm.name.trim(),
        description: themeForm.description.trim(),
        songIds: existing?.songIds || [],
      };
    }
    return null;
  }, [themeEditorOpen, editingThemeId, themeForm, themes]);

  const previewThemeSongs = useMemo(
    () => getSongsForTheme(previewTheme),
    [previewTheme, songs],
  );

  const previewInfoEntry = useMemo(() => {
    if (infoEditorOpen) {
      return {
        id: editingInfoId || "draft-info",
        compositor: infoComposer.trim() || "Novo Autor / Compositor",
        items: infoItems.filter(
          (item) =>
            item.banda.trim() ||
            item.album.trim() ||
            item.anoLancamento.trim() ||
            item.adicionais.trim(),
        ),
      };
    }
    return null;
  }, [infoEditorOpen, editingInfoId, infoComposer, infoItems]);

  return (
    <div>
      {!themeEditorOpen && !infoEditorOpen ? (
      <div className="min-w-0 space-y-5">
        {activeTab === "temas" ? (
          <>
            {themeNotice ? (
              <p
                role="status"
                className="rounded-[3px] border border-pine/30 bg-pine/5 px-3.5 py-2.5 text-xs text-pine"
              >
                {themeNotice}
              </p>
            ) : null}
            {themeError && !themeEditorOpen ? (
              <p
                role="alert"
                className="rounded-[3px] border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-xs text-danger"
              >
                {themeError}
              </p>
            ) : null}

            <section>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Temas definidos no cadastro ({themes.length})
                  </h3>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Opções exibidas na caixa de seleção ao criar ou editar uma música (1 tema por música).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={loadSuggestedThemes}
                    className="h-10 rounded-[3px] border border-line bg-card px-4 text-xs font-medium text-ink hover:bg-paper"
                  >
                    Carregar sugeridos
                  </button>
                  <button
                    type="button"
                    onClick={openNewThemeEditor}
                    className="inline-flex h-10 items-center gap-1.5 rounded-[3px] bg-pine px-4 text-xs font-semibold text-white hover:bg-pine-dark"
                  >
                    <span aria-hidden className="text-sm leading-none">+</span>
                    Novo tema
                  </button>
                </div>
              </div>

              {themes.length === 0 ? (
                <div className="py-10">
                  <p className="text-xs text-ink-soft">
                    Nenhum tema cadastrado ainda. Clique em <strong>+ Novo tema</strong> para adicionar.
                  </p>
                  <button
                    type="button"
                    onClick={openNewThemeEditor}
                    className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-[3px] bg-pine px-4 text-xs font-semibold text-white hover:bg-pine-dark"
                  >
                    + Cadastrar primeiro tema
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-line/80 border-b border-line/80">
                  {themes.map((theme) => {
                    const linkedSongs = getSongsForTheme(theme);
                    return (
                      <li
                        key={theme.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-2 py-3 hover:bg-card/60"
                      >
                        <button
                          type="button"
                          onClick={() => openEditThemeEditor(theme)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-[13px] font-semibold text-ink">{theme.name}</p>
                          <p className="mt-0.5 truncate text-xs text-ink-soft">
                            {theme.description ? `${theme.description} · ` : ""}
                            {linkedSongs.length}{" "}
                            {linkedSongs.length === 1
                              ? "música vinculada"
                              : "músicas vinculadas"}
                          </p>
                        </button>
                        <div className="flex max-w-full flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditThemeEditor(theme)}
                            className="inline-flex h-10 items-center gap-1.5 rounded-[3px] border border-line bg-card px-4 text-xs font-semibold text-pine transition-colors hover:border-pine hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                          >
                            <EditIcon className="h-4 w-4 shrink-0" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTheme(theme)}
                            className="h-10 rounded-[3px] border border-danger/30 bg-card px-4 text-xs font-medium text-danger hover:bg-danger-soft"
                          >
                            Excluir
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        ) : (
          <>
            {infoNotice ? (
              <p
                role="status"
                className="rounded-[3px] border border-pine/30 bg-pine/5 px-3.5 py-2.5 text-xs text-pine"
              >
                {infoNotice}
              </p>
            ) : null}
            {infoRegistryError && !infoEditorOpen ? (
              <p
                role="alert"
                className="rounded-[3px] border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-xs text-danger"
              >
                {infoRegistryError}
              </p>
            ) : null}

            <section>
              <div className="border-b border-line/80 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Autores / Compositores e Informações ({infoEntries.length})
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Álbuns, anos de lançamento e bandas vinculados a cada compositor para seleção na edição da música.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={loadSuggestedInfoEntries}
                      className="h-10 rounded-[3px] border border-line bg-card px-4 text-xs font-medium text-ink hover:bg-paper"
                    >
                      Carregar sugeridos
                    </button>
                    <button
                      type="button"
                      onClick={openNewInfoEditor}
                      className="inline-flex h-10 items-center gap-1.5 rounded-[3px] bg-pine px-4 text-xs font-semibold text-white hover:bg-pine-dark"
                    >
                      <span aria-hidden className="text-sm leading-none">+</span>
                      Cadastrar informações
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <input
                    type="search"
                    value={infoSearch}
                    onChange={(event) => setInfoSearch(event.target.value)}
                    placeholder="Filtrar por compositor, banda, álbum ou ano de lançamento…"
                    className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine sm:max-w-md"
                  />
                </div>
              </div>

              {filteredInfoEntries.length === 0 ? (
                <div className="py-10">
                  <p className="text-xs text-ink-soft">
                    Nenhum cadastro encontrado. Clique em <strong>+ Cadastrar informações</strong> para adicionar.
                  </p>
                  <button
                    type="button"
                    onClick={openNewInfoEditor}
                    className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-[3px] bg-pine px-4 text-xs font-semibold text-white hover:bg-pine-dark"
                  >
                    + Novo cadastro de informações
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-line/80 border-b border-line/80">
                  {filteredInfoEntries.map((entry) => {
                    const albums = [
                      ...new Set(entry.items.map((i) => i.album).filter(Boolean)),
                    ];
                    const years = [
                      ...new Set(entry.items.map((i) => i.anoLancamento).filter(Boolean)),
                    ];
                    const bands = [
                      ...new Set(entry.items.map((i) => i.banda).filter(Boolean)),
                    ];
                    return (
                      <li
                        key={entry.id}
                        className="flex flex-wrap items-start justify-between gap-3 px-2 py-3.5 hover:bg-card/60"
                      >
                        <button
                          type="button"
                          onClick={() => openEditInfoEditor(entry)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-[13px] font-semibold text-ink">
                            {entry.compositor}
                          </p>
                          <p className="mt-1 text-xs text-ink-soft">
                            {[
                              bands.length > 0 ? `Banda(s): ${bands.join(", ")}` : null,
                              albums.length > 0 ? `Álbum(ns): ${albums.join(", ")}` : null,
                              years.length > 0 ? `Ano(s): ${years.join(", ")}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "Sem vínculos adicionais"}
                          </p>
                        </button>
                        <div className="flex max-w-full flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditInfoEditor(entry, true)}
                            className="h-10 rounded-[3px] border border-line bg-card px-4 text-xs font-medium text-pine hover:bg-paper"
                          >
                            + Álbum / Ano
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditInfoEditor(entry, false)}
                            className="inline-flex h-10 items-center gap-1.5 rounded-[3px] border border-line bg-card px-4 text-xs font-semibold text-pine transition-colors hover:border-pine hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                          >
                            <EditIcon className="h-4 w-4 shrink-0" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInfoEntry(entry)}
                            className="h-10 rounded-[3px] border border-danger/30 bg-card px-4 text-xs font-medium text-danger hover:bg-danger-soft"
                          >
                            Excluir
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
      ) : null}

      {(themeEditorOpen || infoEditorOpen) && previewContainer ? createPortal(
      <aside aria-label="Prévia ao vivo" className="border-t border-line/80 p-4 lg:border-l lg:border-t-0">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            Prévia ao vivo
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {activeTab === "temas"
              ? "Músicas com o tema selecionado."
              : "Opções vinculadas ao compositor."}
          </p>
        </div>

        <div className="mx-auto mt-3.5 max-w-[340px] rounded-[2.4rem] border-[6px] border-neutral-800 bg-neutral-900 p-1.5 shadow-xl ring-1 ring-black/20">
            <div
              style={appPreviewVars}
              className="flex h-[min(600px,calc(100dvh-230px))] min-h-[450px] flex-col overflow-hidden rounded-[2rem] bg-paper text-ink"
            >
              <div
                aria-hidden
                className="flex h-7 shrink-0 items-center justify-between bg-pine px-4 pt-1 text-[11px] font-semibold tracking-tight text-white select-none"
              >
                <span className="tabular-nums">09:41</span>
                <span className="h-3 w-14 rounded-full bg-black/45" />
                <span className="text-[10px]">5G · 100%</span>
              </div>

              <header className="flex h-12 shrink-0 items-center gap-2 border-b border-pine-dark bg-pine px-3 text-white shadow-sm">
                <span
                  aria-hidden
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none text-white/85"
                >
                  ‹
                </span>
                <div className="min-w-0 flex-1">
                  {activeTab === "temas" ? (
                    <p className="truncate text-sm font-semibold">
                      {previewTheme?.name || "Novo tema"}
                    </p>
                  ) : (
                    <p className="truncate text-sm font-semibold">
                      {previewInfoEntry ? previewInfoEntry.compositor : "Informações"}
                    </p>
                  )}
                </div>
              </header>

              <SongScroll>
                {activeTab === "temas" ? (
                  <div className="p-3.5">
                    {previewTheme ? (
                      <>
                        {previewTheme.description ? (
                          <p className="mb-3 rounded-xl border border-line bg-card px-3 py-2 text-xs text-ink-soft">
                            {previewTheme.description}
                          </p>
                        ) : null}
                        {previewThemeSongs.length === 0 ? (
                          <p className="py-12 text-center text-xs text-ink-soft">
                            {previewTheme.name
                              ? `Nenhuma música está com o tema “${previewTheme.name}” selecionado no momento. Na edição da música, escolha este tema na caixa de opções.`
                              : "Informe o nome do tema para visualizar as músicas vinculadas."}
                          </p>
                        ) : (
                          <ul className="divide-y divide-line rounded-xl border border-line bg-card">
                            {previewThemeSongs.map((song) => (
                              <li
                                key={song.id}
                                className="flex items-center gap-2.5 px-3 py-2.5 text-xs"
                              >
                                <span className="w-7 shrink-0 font-mono text-[11px] tabular-nums text-pine">
                                  {String(song.numero).padStart(3, "0")}
                                </span>
                                <span className="min-w-0 flex-1 truncate font-medium text-ink">
                                  {song.titulo}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <p className="py-12 text-center text-xs text-ink-soft">
                        Cadastre ou selecione um tema para visualizar no celular.
                      </p>
                    )}
                  </div>
                ) : previewInfoEntry ? (
                  <div className="space-y-3 p-3.5">
                    <div className="rounded-xl border border-line bg-card px-3.5 py-2.5">
                      <p className="text-[11px] font-medium text-ink-soft">
                        Autor / Compositor / Banda
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-ink">
                        {previewInfoEntry.compositor}
                      </p>
                    </div>

                    <p className="text-xs font-semibold text-ink-soft">
                      Opções vinculadas para escolha na edição da música ({previewInfoEntry.items.length})
                    </p>

                    {previewInfoEntry.items.length === 0 ? (
                      <p className="rounded-xl border border-line bg-card p-4 text-center text-xs text-ink-soft">
                        Preencha álbum, ano de lançamento ou banda para visualizar os vínculos deste compositor.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {previewInfoEntry.items.map((item, idx) => (
                          <dl
                            key={item.id || idx}
                            className="divide-y divide-line rounded-2xl border border-line bg-card"
                          >
                            {[
                              { label: "Banda / Intérprete", value: item.banda },
                              { label: "Nome do Álbum", value: item.album },
                              { label: "Ano de lançamento", value: item.anoLancamento },
                              {
                                label: "Informações adicionais",
                                value: item.adicionais,
                                multiline: true,
                              },
                            ].map(({ label, value, multiline }) => {
                              const text = String(value ?? "").trim();
                              return (
                                <div key={label} className="px-3.5 py-2">
                                  <dt className="text-[11px] font-medium text-ink-soft">
                                    {label}
                                  </dt>
                                  <dd
                                    className={`mt-0.5 text-xs ${
                                      text ? "text-ink" : "italic text-ink-soft/65"
                                    } ${multiline ? "whitespace-pre-wrap leading-relaxed" : "break-words"}`}
                                  >
                                    {text || "Não informado"}
                                  </dd>
                                </div>
                              );
                            })}
                          </dl>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="p-6 text-center text-xs text-ink-soft">
                    Cadastre ou selecione um autor/compositor para ver suas opções vinculadas.
                  </p>
                )}
              </SongScroll>

              <div className="shrink-0 border-t border-line bg-card py-2">
                <div aria-hidden className="flex justify-center">
                  <span className="h-1 w-24 rounded-full bg-ink/20" />
                </div>
              </div>
            </div>
          </div>
      </aside>, previewContainer) : null}

      {themeEditorOpen ? (
        <section
          aria-labelledby="theme-editor-title"
          className="mx-auto flex w-full max-w-5xl flex-col text-ink lg:flex-row"
        >
            <div className="min-w-0 lg:flex-1">
            <div className="flex items-center justify-between gap-3 border-b border-line py-3.5">
              <div>
                <h3 id="theme-editor-title" className="text-sm font-semibold">
                  {editingThemeId ? "Editar tema de músicas" : "Novo tema de músicas"}
                </h3>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Este tema aparecerá na caixa de opções ao editar uma música.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelThemeEditor}
                className="inline-flex h-10 shrink-0 items-center rounded-[3px] border border-line bg-card px-4 text-xs font-medium text-ink hover:bg-paper"
              >
                Voltar à listagem
              </button>
            </div>

            <form onSubmit={submitThemeForm} className="space-y-4 py-5">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-ink-soft">Nome do tema</span>
                <input
                  autoFocus
                  value={themeForm.name}
                  onChange={(event) =>
                    setThemeForm((current) => ({ ...current, name: event.target.value }))
                  }
                  maxLength={80}
                  placeholder="Ex.: Abertura, Acústico, Animadas, Repertório Show…"
                  required
                  className="h-9 w-full rounded-[3px] border border-line bg-card px-2.5 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-ink-soft">Descrição (opcional)</span>
                <input
                  value={themeForm.description}
                  onChange={(event) =>
                    setThemeForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  maxLength={240}
                  placeholder="Breve descrição da finalidade do tema"
                  className="h-9 w-full rounded-[3px] border border-line bg-card px-2.5 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                />
              </label>

              {themeError ? (
                <p
                  role="alert"
                  className="rounded-[3px] border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
                >
                  {themeError}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={cancelThemeEditor}
                  className="h-10 rounded-[3px] border border-line bg-card px-4 text-xs font-medium hover:bg-paper"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-[3px] bg-pine px-5 text-xs font-semibold text-white hover:bg-pine-dark"
                >
                  {editingThemeId ? "Salvar alterações" : "Cadastrar tema"}
                </button>
              </div>
            </form>
            </div>
            <div ref={setPreviewContainer} className="shrink-0 lg:w-[360px]" />
        </section>
      ) : null}

      {infoEditorOpen ? (
        <section
          aria-labelledby="info-editor-title"
          className="mx-auto flex w-full max-w-5xl flex-col text-ink lg:flex-row"
        >
            <div className="min-w-0 lg:flex-1">
            <div className="flex items-center justify-between gap-3 border-b border-line py-3.5">
              <div>
                <h3 id="info-editor-title" className="text-sm font-semibold">
                  {editingInfoId
                    ? "Editar Autor / Compositor e vínculos"
                    : "Cadastrar Autor / Compositor e vínculos"}
                </h3>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Álbuns, anos de lançamento e bandas vinculados a este autor/compositor.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelInfoEditor}
                className="inline-flex h-10 shrink-0 items-center rounded-[3px] border border-line bg-card px-4 text-xs font-medium text-ink hover:bg-paper"
              >
                Voltar à listagem
              </button>
            </div>

            <form onSubmit={submitInfoRegistryForm}>
              <div className="space-y-5 py-5">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-ink-soft">
                    Autor / Compositor / Banda (chave principal)
                  </span>
                  <input
                    autoFocus
                    list="registry-composers-datalist"
                    value={infoComposer}
                    onChange={(event) => setInfoComposer(event.target.value)}
                    maxLength={200}
                    placeholder="Ex.: Banda Horizonte, Lucas Andrade, Coletivo Harmonia…"
                    required
                    className="h-9 w-full rounded-[3px] border border-line bg-card px-2.5 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                  />
                  <datalist id="registry-composers-datalist">
                    {infoEntries.map((entry) => (
                      <option key={entry.id} value={entry.compositor} />
                    ))}
                  </datalist>
                </label>

                <div className="space-y-3 border-t border-line/80 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-ink">
                        Álbuns e lançamentos vinculados ({infoItems.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={addInfoItemRow}
                      className="inline-flex h-10 items-center gap-1 rounded-[3px] border border-line bg-card px-4 text-xs font-medium text-pine hover:bg-paper"
                    >
                      <span aria-hidden className="text-sm leading-none">+</span>
                      Adicionar vínculo
                    </button>
                  </div>

                  <div className="divide-y divide-line/80 border-t border-line/80">
                    {infoItems.map((item, index) => (
                      <div key={item.id || index} className="space-y-3 py-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-ink-soft">
                            Vínculo #{index + 1}
                          </span>
                          {infoItems.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeInfoItemRow(index)}
                              className="text-xs font-medium text-danger hover:underline"
                            >
                              Remover
                            </button>
                          ) : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="block space-y-1">
                            <span className="text-xs font-medium text-ink-soft">
                              Banda / Intérprete
                            </span>
                            <input
                              value={item.banda}
                              onChange={(event) =>
                                updateInfoItemField(index, "banda", event.target.value)
                              }
                              maxLength={200}
                              placeholder="Ex.: Banda Horizonte, Trio Acústico…"
                              className="h-9 w-full rounded-[3px] border border-line bg-card px-2.5 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                            />
                          </label>

                          <label className="block space-y-1">
                            <span className="text-xs font-medium text-ink-soft">
                              Nome do Álbum
                            </span>
                            <input
                              value={item.album}
                              onChange={(event) =>
                                updateInfoItemField(index, "album", event.target.value)
                              }
                              maxLength={200}
                              placeholder="Ex.: Sessão Acústica, Ao Vivo…"
                              className="h-9 w-full rounded-[3px] border border-line bg-card px-2.5 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                            />
                          </label>

                          <label className="block space-y-1">
                            <span className="text-xs font-medium text-ink-soft">
                              Ano de lançamento
                            </span>
                            <input
                              value={item.anoLancamento}
                              onChange={(event) =>
                                updateInfoItemField(index, "anoLancamento", event.target.value)
                              }
                              maxLength={20}
                              placeholder="Ex.: 2021, 2024…"
                              className="h-9 w-full rounded-[3px] border border-line bg-card px-2.5 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                            />
                          </label>
                        </div>

                        <label className="block space-y-1">
                          <span className="text-xs font-medium text-ink-soft">
                            Observações (opcional)
                          </span>
                          <input
                            value={item.adicionais}
                            onChange={(event) =>
                              updateInfoItemField(index, "adicionais", event.target.value)
                            }
                            maxLength={2000}
                            placeholder="Andamento (BPM), compasso, versão, gravadora ou notas de palco…"
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-2.5 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {infoRegistryError ? (
                  <p
                    role="alert"
                    className="rounded-[3px] border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
                  >
                    {infoRegistryError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-line py-3.5">
                <button
                  type="button"
                  onClick={cancelInfoEditor}
                  className="h-10 rounded-[3px] border border-line bg-card px-4 text-xs font-medium hover:bg-paper"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-10 rounded-[3px] bg-pine px-5 py-2 text-xs font-semibold text-white hover:bg-pine-dark"
                >
                  {editingInfoId
                    ? "Salvar alterações"
                    : "Cadastrar informações do compositor"}
                </button>
              </div>
            </form>
            </div>
            <div ref={setPreviewContainer} className="shrink-0 lg:w-[360px]" />
        </section>
      ) : null}

      {/* Modal Flutuante de Confirmação de Exclusão de Tema */}
      {themeToDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          onClick={() => setThemeToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-theme-modal-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-[4px] border border-line bg-card text-ink shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <h3 id="delete-theme-modal-title" className="text-sm font-semibold text-ink">
                Excluir tema
              </h3>
              <button
                type="button"
                onClick={() => setThemeToDelete(null)}
                aria-label="Fechar modal"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-line bg-paper text-sm text-ink-soft hover:text-ink"
              >
                ×
              </button>
            </div>
            <div className="space-y-2.5 p-5">
              <p className="text-[13px] leading-relaxed text-ink">
                Tem certeza que deseja excluir o tema{" "}
                <strong className="font-semibold">“{themeToDelete.name}”</strong> do cadastro?
              </p>
              <p className="text-xs leading-relaxed text-ink-soft">
                Esta ação remove o tema da lista de opções disponíveis. As músicas do catálogo não serão apagadas.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">
              <button
                type="button"
                onClick={() => setThemeToDelete(null)}
                className="h-10 rounded-[3px] border border-line bg-card px-4 text-xs font-medium hover:bg-paper"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteTheme}
                className="h-10 rounded-[3px] bg-danger px-5 text-xs font-semibold text-white hover:brightness-95"
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal Flutuante de Confirmação de Exclusão de Informações (Autor/Compositor) */}
      {infoEntryToDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          onClick={() => setInfoEntryToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-info-modal-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-[4px] border border-line bg-card text-ink shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <h3 id="delete-info-modal-title" className="text-sm font-semibold text-ink">
                Excluir cadastro de informações
              </h3>
              <button
                type="button"
                onClick={() => setInfoEntryToDelete(null)}
                aria-label="Fechar modal"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-line bg-paper text-sm text-ink-soft hover:text-ink"
              >
                ×
              </button>
            </div>
            <div className="space-y-2.5 p-5">
              <p className="text-[13px] leading-relaxed text-ink">
                Tem certeza que deseja excluir o cadastro de{" "}
                <strong className="font-semibold">“{infoEntryToDelete.compositor}”</strong> e todos os seus álbuns, anos de lançamento e bandas vinculados?
              </p>
              <p className="text-xs leading-relaxed text-ink-soft">
                Esta ação remove estas opções do cadastro de informações. As músicas já salvas no catálogo não serão apagadas.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">
              <button
                type="button"
                onClick={() => setInfoEntryToDelete(null)}
                className="h-10 rounded-[3px] border border-line bg-card px-4 text-xs font-medium hover:bg-paper"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteInfoEntry}
                className="h-10 rounded-[3px] bg-danger px-5 text-xs font-semibold text-white hover:brightness-95"
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
