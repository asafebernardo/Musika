import { useEffect, useMemo, useState } from "react";
import { messageForSongError, updateSong } from "@/api/songs.js";
import MarqueeText from "@/components/MarqueeText.jsx";
import SongScroll from "@/components/SongScroll.jsx";
import { DEFAULT_THEMES } from "@/data/themes.js";
import { getAppSettings } from "@/lib/appSettings.js";
import { fieldsFromSong, payloadFromSongForm } from "@/lib/songEditor.js";
import { filterSongs } from "@/lib/songs.js";
import { useSongThemes } from "@/lib/songThemes.js";

const REGISTRY_TABS = [
  { id: "temas", label: "Temas das músicas" },
  { id: "informacoes", label: "Informações da música" },
];

const emptyInfoForm = {
  banda: "",
  compositor: "",
  album: "",
  anoLancamento: "",
  tema: "",
  adicionais: "",
};

export default function AdminRegistriesSection({
  activeTab = "temas",
  onTabChange,
  songs = [],
  loadingSongs = false,
  onSongSaved,
}) {
  const { appName } = getAppSettings();
  const {
    themes,
    error: themeError,
    createTheme,
    updateTheme,
    deleteTheme,
  } = useSongThemes();

  // Estado do CRUD de Temas das músicas
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [themeForm, setThemeForm] = useState({ name: "", description: "", songIds: [] });
  const [themeSongSearch, setThemeSongSearch] = useState("");
  const [themeNotice, setThemeNotice] = useState("");
  const [selectedPreviewThemeId, setSelectedPreviewThemeId] = useState(null);

  // Estado do CRUD de Informações da música
  const [songSearch, setSongSearch] = useState("");
  const [selectedSongId, setSelectedSongId] = useState(songs[0]?.id ?? null);
  const [infoForm, setInfoForm] = useState(emptyInfoForm);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState("");
  const [infoNotice, setInfoNotice] = useState("");

  useEffect(() => {
    if (!selectedSongId && songs.length > 0) {
      setSelectedSongId(songs[0].id);
    }
  }, [songs, selectedSongId]);

  const selectedSong = useMemo(
    () => songs.find((song) => song.id === selectedSongId) ?? null,
    [songs, selectedSongId],
  );

  useEffect(() => {
    if (selectedSong) {
      setInfoForm({
        banda: selectedSong.banda || "",
        compositor: selectedSong.compositor || "",
        album: selectedSong.album || "",
        anoLancamento: selectedSong.anoLancamento || "",
        tema: selectedSong.tema || "",
        adicionais: selectedSong.adicionais || "",
      });
    } else {
      setInfoForm(emptyInfoForm);
    }
    setInfoError("");
  }, [selectedSong]);

  const filteredSongsForTheme = useMemo(
    () => filterSongs(songs, themeSongSearch),
    [songs, themeSongSearch],
  );

  const filteredSongsForInfo = useMemo(
    () => filterSongs(songs, songSearch),
    [songs, songSearch],
  );

  const existingBands = useMemo(
    () =>
      [...new Set(songs.map((song) => String(song.banda ?? "").trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [songs],
  );

  const existingComposers = useMemo(
    () =>
      [
        ...new Set(songs.map((song) => String(song.compositor ?? "").trim()).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [songs],
  );

  const availableThemeNames = useMemo(() => {
    const names = new Set([
      ...themes.map((item) => item.name),
      ...DEFAULT_THEMES.map((item) => item.label),
      ...songs.map((song) => String(song.tema ?? "").trim()).filter(Boolean),
    ]);
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [themes, songs]);

  const startNewTheme = () => {
    setEditingThemeId(null);
    setThemeForm({ name: "", description: "", songIds: [] });
    setThemeNotice("");
  };

  const startEditTheme = (theme) => {
    setEditingThemeId(theme.id);
    setSelectedPreviewThemeId(theme.id);
    setThemeForm({
      name: theme.name,
      description: theme.description || "",
      songIds: [...theme.songIds],
    });
    setThemeNotice("");
  };

  const toggleSongInThemeForm = (songId) => {
    const numericId = Number(songId);
    setThemeForm((current) => {
      const exists = current.songIds.includes(numericId);
      return {
        ...current,
        songIds: exists
          ? current.songIds.filter((id) => id !== numericId)
          : [...current.songIds, numericId],
      };
    });
  };

  const submitThemeForm = (event) => {
    event.preventDefault();
    setThemeNotice("");
    if (editingThemeId) {
      const ok = updateTheme(editingThemeId, themeForm);
      if (ok) {
        setThemeNotice("Tema atualizado com sucesso.");
        setEditingThemeId(null);
        setThemeForm({ name: "", description: "", songIds: [] });
      }
    } else {
      const ok = createTheme(themeForm.name, {
        description: themeForm.description,
        songIds: themeForm.songIds,
      });
      if (ok) {
        setThemeNotice("Tema cadastrado com sucesso.");
        setThemeForm({ name: "", description: "", songIds: [] });
      }
    }
  };

  const handleDeleteTheme = (theme) => {
    if (!window.confirm(`Excluir o tema “${theme.name}”?`)) return;
    if (deleteTheme(theme.id)) {
      if (editingThemeId === theme.id) {
        startNewTheme();
      }
      if (selectedPreviewThemeId === theme.id) {
        setSelectedPreviewThemeId(null);
      }
      setThemeNotice("Tema removido.");
    }
  };

  const loadSuggestedThemes = () => {
    let added = 0;
    const existingLower = new Set(themes.map((item) => item.name.toLocaleLowerCase("pt-BR")));
    for (const item of DEFAULT_THEMES) {
      if (!existingLower.has(item.label.toLocaleLowerCase("pt-BR"))) {
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

  const saveSongInfo = async (event) => {
    event.preventDefault();
    if (!selectedSong) return;
    setSavingInfo(true);
    setInfoError("");
    setInfoNotice("");
    try {
      const fullForm = {
        ...fieldsFromSong(selectedSong),
        banda: infoForm.banda,
        compositor: infoForm.compositor,
        album: infoForm.album,
        anoLancamento: infoForm.anoLancamento,
        tema: infoForm.tema,
        adicionais: infoForm.adicionais,
      };
      const result = await updateSong(selectedSong.id, payloadFromSongForm(fullForm));
      const saved = result.song ?? result;
      if (onSongSaved) onSongSaved(saved);
      setInfoNotice("Informações da música salvas com sucesso.");
    } catch (err) {
      setInfoError(messageForSongError(err));
    } finally {
      setSavingInfo(false);
    }
  };

  const clearSongInfo = async () => {
    if (!selectedSong) return;
    if (
      !window.confirm(
        `Limpar todas as informações técnicas (banda, compositor, álbum, ano, tema e adicionais) de “${selectedSong.titulo}”?`,
      )
    ) {
      return;
    }
    setSavingInfo(true);
    setInfoError("");
    setInfoNotice("");
    try {
      const fullForm = {
        ...fieldsFromSong(selectedSong),
        ...emptyInfoForm,
      };
      const result = await updateSong(selectedSong.id, payloadFromSongForm(fullForm));
      const saved = result.song ?? result;
      setInfoForm(emptyInfoForm);
      if (onSongSaved) onSongSaved(saved);
      setInfoNotice("Ficha técnica da música limpa.");
    } catch (err) {
      setInfoError(messageForSongError(err));
    } finally {
      setSavingInfo(false);
    }
  };

  const previewTheme = useMemo(() => {
    if (editingThemeId || themeForm.name.trim()) {
      return {
        id: editingThemeId || "draft",
        name: themeForm.name.trim() || "Novo tema",
        description: themeForm.description.trim(),
        songIds: themeForm.songIds,
      };
    }
    return (
      themes.find((item) => item.id === selectedPreviewThemeId) ||
      themes[0] ||
      null
    );
  }, [editingThemeId, themeForm, themes, selectedPreviewThemeId]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2 xl:col-span-2">
        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="Abas de cadastros">
          {REGISTRY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange?.(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? "bg-pine text-white"
                  : "text-ink-soft hover:bg-card hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-w-0 space-y-6">
        {activeTab === "temas" ? (
          <>
            <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">
                    {editingThemeId ? "Editar tema de músicas" : "Novo tema de músicas"}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    Crie, edite ou exclua temas e vincule as músicas que fazem parte de cada lista.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadSuggestedThemes}
                  className="h-9 rounded-full border border-line px-3.5 text-xs font-medium hover:bg-paper"
                >
                  Carregar temas sugeridos
                </button>
              </div>

              <form onSubmit={submitThemeForm} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Nome do tema</span>
                    <input
                      value={themeForm.name}
                      onChange={(event) =>
                        setThemeForm((current) => ({ ...current, name: event.target.value }))
                      }
                      maxLength={80}
                      placeholder="Ex.: Adoração, Ceia, Jovens, Gratidão…"
                      required
                      className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Descrição (opcional)</span>
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
                      className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      Músicas vinculadas ({themeForm.songIds.length})
                    </span>
                    <input
                      type="search"
                      value={themeSongSearch}
                      onChange={(event) => setThemeSongSearch(event.target.value)}
                      placeholder="Filtrar músicas para o tema…"
                      className="h-9 w-full rounded-lg border border-line bg-paper px-3 text-xs outline-none focus:ring-2 focus:ring-pine sm:w-64"
                    />
                  </div>
                  <div className="max-h-52 divide-y divide-line overflow-y-auto rounded-xl border border-line bg-paper">
                    {loadingSongs ? (
                      <p className="px-4 py-4 text-xs text-ink-soft">Carregando músicas…</p>
                    ) : filteredSongsForTheme.length === 0 ? (
                      <p className="px-4 py-4 text-xs text-ink-soft">Nenhuma música encontrada.</p>
                    ) : (
                      filteredSongsForTheme.map((song) => {
                        const checked = themeForm.songIds.includes(Number(song.id));
                        return (
                          <label
                            key={song.id}
                            className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-card"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSongInThemeForm(song.id)}
                              className="h-4 w-4 shrink-0 accent-pine"
                            />
                            <span className="w-9 shrink-0 font-mono text-xs tabular-nums text-ink-soft">
                              {String(song.numero).padStart(3, "0")}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {song.titulo}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {themeError ? (
                  <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-danger">
                    {themeError}
                  </p>
                ) : null}
                {themeNotice ? (
                  <p role="status" className="rounded-xl border border-pine/20 bg-pine/5 px-4 py-2.5 text-sm text-pine">
                    {themeNotice}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  {editingThemeId ? (
                    <button
                      type="button"
                      onClick={startNewTheme}
                      className="h-10 rounded-lg border border-line px-4 text-sm font-medium hover:bg-paper"
                    >
                      Cancelar edição
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    className="h-10 rounded-lg bg-pine px-5 text-sm font-semibold text-white hover:bg-pine-dark"
                  >
                    {editingThemeId ? "Salvar alterações" : "Cadastrar tema"}
                  </button>
                </div>
              </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <h3 className="text-base font-semibold">Temas cadastrados ({themes.length})</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  Clique em um tema para visualizar na prévia mobile ou editar suas músicas.
                </p>
              </div>
              {themes.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-soft">
                  Nenhum tema cadastrado ainda. Crie um tema acima ou carregue os temas sugeridos.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {themes.map((theme) => {
                    const isSelected = previewTheme?.id === theme.id;
                    return (
                      <li
                        key={theme.id}
                        className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6 ${
                          isSelected ? "bg-pine/5" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedPreviewThemeId(theme.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-semibold text-ink">{theme.name}</p>
                          <p className="mt-0.5 truncate text-xs text-ink-soft">
                            {theme.description
                              ? `${theme.description} · `
                              : ""}
                            {theme.songIds.length}{" "}
                            {theme.songIds.length === 1 ? "música vinculada" : "músicas vinculadas"}
                          </p>
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditTheme(theme)}
                            className="h-8 rounded-lg border border-line px-3 text-xs font-medium hover:bg-paper"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTheme(theme)}
                            className="h-8 rounded-lg border border-danger/30 px-3 text-xs font-medium text-danger hover:bg-danger-soft"
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
            <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <h3 className="text-base font-semibold">Selecionar música do catálogo</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  Escolha uma música para cadastrar ou atualizar Banda, Compositor(es), Álbum, Ano de lançamento, Tema e Observações.
                </p>
              </div>
              <div className="border-b border-line p-4">
                <input
                  type="search"
                  value={songSearch}
                  onChange={(event) => setSongSearch(event.target.value)}
                  placeholder="Buscar música por número ou título…"
                  className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                />
              </div>
              <ul className="max-h-56 divide-y divide-line overflow-y-auto">
                {loadingSongs ? (
                  <li className="px-5 py-4 text-sm text-ink-soft">Carregando catálogo…</li>
                ) : filteredSongsForInfo.length === 0 ? (
                  <li className="px-5 py-4 text-sm text-ink-soft">Nenhuma música encontrada.</li>
                ) : (
                  filteredSongsForInfo.map((song) => {
                    const active = song.id === selectedSongId;
                    const summaryParts = [
                      song.banda,
                      song.compositor,
                      song.anoLancamento,
                      song.tema,
                    ].filter(Boolean);
                    return (
                      <li key={song.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSongId(song.id);
                            setInfoNotice("");
                          }}
                          className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${
                            active ? "bg-pine/10 text-pine" : "hover:bg-paper"
                          }`}
                        >
                          <span className="w-10 shrink-0 font-mono text-xs tabular-nums text-ink-soft">
                            {String(song.numero).padStart(3, "0")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">
                              {song.titulo}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-ink-soft">
                              {summaryParts.length > 0
                                ? summaryParts.join(" · ")
                                : "Sem ficha técnica cadastrada"}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-medium text-pine">
                            {active ? "Selecionada" : "Editar ficha"}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>

            {selectedSong ? (
              <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                      Música #{String(selectedSong.numero).padStart(3, "0")}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{selectedSong.titulo}</h3>
                    <p className="mt-1 text-sm text-ink-soft">
                      Preencha as informações técnicas exibidas na tela de Informações da música.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearSongInfo}
                    disabled={savingInfo}
                    className="h-9 rounded-lg border border-danger/30 px-3 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
                  >
                    Limpar informações
                  </button>
                </div>

                <form onSubmit={saveSongInfo} className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium">Banda / Intérprete</span>
                      <input
                        list="admin-bands-list"
                        value={infoForm.banda}
                        onChange={(event) =>
                          setInfoForm((current) => ({ ...current, banda: event.target.value }))
                        }
                        maxLength={200}
                        placeholder="Ex.: Diante do Trono, Coral, Ministério…"
                        className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                      />
                      <datalist id="admin-bands-list">
                        {existingBands.map((band) => (
                          <option key={band} value={band} />
                        ))}
                      </datalist>
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium">Compositor(es)</span>
                      <input
                        list="admin-composers-list"
                        value={infoForm.compositor}
                        onChange={(event) =>
                          setInfoForm((current) => ({
                            ...current,
                            compositor: event.target.value,
                          }))
                        }
                        maxLength={200}
                        placeholder="Ex.: Asaph Borba, Ana Paula Valadão…"
                        className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                      />
                      <datalist id="admin-composers-list">
                        {existingComposers.map((composer) => (
                          <option key={composer} value={composer} />
                        ))}
                      </datalist>
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium">Álbum</span>
                      <input
                        value={infoForm.album}
                        onChange={(event) =>
                          setInfoForm((current) => ({ ...current, album: event.target.value }))
                        }
                        maxLength={200}
                        placeholder="Nome do álbum ou coletânea"
                        className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                      />
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium">Ano de lançamento</span>
                      <input
                        value={infoForm.anoLancamento}
                        onChange={(event) =>
                          setInfoForm((current) => ({
                            ...current,
                            anoLancamento: event.target.value,
                          }))
                        }
                        maxLength={20}
                        placeholder="Ex.: 1998, 2015…"
                        className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Tema da música</span>
                    <input
                      list="admin-song-themes-list"
                      value={infoForm.tema}
                      onChange={(event) =>
                        setInfoForm((current) => ({ ...current, tema: event.target.value }))
                      }
                      maxLength={300}
                      placeholder="Ex.: Louvor, Adoração, Gratidão…"
                      className="h-10 w-full rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                    />
                    <datalist id="admin-song-themes-list">
                      {availableThemeNames.map((themeName) => (
                        <option key={themeName} value={themeName} />
                      ))}
                    </datalist>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Informações adicionais / Observações</span>
                    <textarea
                      rows={3}
                      value={infoForm.adicionais}
                      onChange={(event) =>
                        setInfoForm((current) => ({ ...current, adicionais: event.target.value }))
                      }
                      maxLength={2000}
                      placeholder="Referência bíblica, andamento, compasso, versão ou notas históricas…"
                      className="w-full rounded-lg border border-line bg-paper p-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                    />
                  </label>

                  {infoError ? (
                    <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-danger">
                      {infoError}
                    </p>
                  ) : null}
                  {infoNotice ? (
                    <p role="status" className="rounded-xl border border-pine/20 bg-pine/5 px-4 py-2.5 text-sm text-pine">
                      {infoNotice}
                    </p>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingInfo}
                      className="h-10 rounded-lg bg-pine px-5 text-sm font-semibold text-white hover:bg-pine-dark disabled:opacity-50"
                    >
                      {savingInfo ? "Salvando…" : "Salvar informações da música"}
                    </button>
                  </div>
                </form>
              </section>
            ) : null}
          </>
        )}
      </div>

      <aside className="xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold">Prévia mobile</h3>
            <p className="mt-1 text-xs text-ink-soft">
              {activeTab === "temas"
                ? "Visualização da tela de Temas das músicas no aplicativo."
                : "Visualização da ficha de Informações da música no aplicativo."}
            </p>
          </div>

          <div className="mx-auto mt-4 max-w-[340px] rounded-[2.4rem] border-[6px] border-neutral-800 bg-neutral-900 p-1.5 shadow-xl ring-1 ring-black/20">
            <div className="flex h-[min(600px,calc(100dvh-230px))] min-h-[450px] flex-col overflow-hidden rounded-[2rem] bg-paper text-ink">
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
                      {previewTheme ? previewTheme.name : "Temas"}
                    </p>
                  ) : selectedSong ? (
                    <h4 className="flex min-h-5 min-w-0 items-stretch gap-2.5 text-white">
                      <span className="flex w-[3ch] shrink-0 items-center justify-end text-sm font-semibold tabular-nums">
                        {String(selectedSong.numero).padStart(3, "0")}
                      </span>
                      <span aria-hidden className="w-px shrink-0 self-stretch bg-white/35" />
                      <span className="flex min-w-0 flex-1 items-center">
                        <MarqueeText
                          text={selectedSong.titulo}
                          className="text-sm font-semibold leading-tight"
                        />
                      </span>
                    </h4>
                  ) : (
                    <p className="truncate text-sm font-semibold">{appName}</p>
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
                        {previewTheme.songIds.length === 0 ? (
                          <p className="py-12 text-center text-xs text-ink-soft">
                            Marque músicas no formulário para visualizar a lista deste tema.
                          </p>
                        ) : (
                          <ul className="divide-y divide-line rounded-xl border border-line bg-card">
                            {songs
                              .filter((song) => previewTheme.songIds.includes(Number(song.id)))
                              .map((song) => (
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
                ) : selectedSong ? (
                  <div className="space-y-3 p-3.5">
                    <p className="text-xs font-semibold text-ink-soft">Informações da música</p>
                    <dl className="divide-y divide-line rounded-2xl border border-line bg-card">
                      {[
                        { label: "Título", value: selectedSong.titulo },
                        { label: "Banda / Intérprete", value: infoForm.banda },
                        { label: "Compositor(es)", value: infoForm.compositor },
                        { label: "Álbum", value: infoForm.album },
                        { label: "Ano de lançamento", value: infoForm.anoLancamento },
                        { label: "Tema", value: infoForm.tema },
                        { label: "Informações adicionais", value: infoForm.adicionais, multiline: true },
                      ].map(({ label, value, multiline }) => {
                        const text = String(value ?? "").trim();
                        return (
                          <div key={label} className="px-3.5 py-2.5">
                            <dt className="text-[11px] font-medium text-ink-soft">{label}</dt>
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
                  </div>
                ) : (
                  <p className="p-6 text-center text-xs text-ink-soft">
                    Selecione uma música para ver a prévia das informações.
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
        </div>
      </aside>
    </div>
  );
}
