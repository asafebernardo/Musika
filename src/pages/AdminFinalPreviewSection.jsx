import { useMemo, useState } from "react";
import Lyrics from "@/components/Lyrics.jsx";
import MarqueeText from "@/components/MarqueeText.jsx";
import SongScroll from "@/components/SongScroll.jsx";
import { getAppIconImage, getAppSettings } from "@/lib/appSettings.js";
import { filterSongs } from "@/lib/songs.js";
import { useSongThemes } from "@/lib/songThemes.js";
import { ACCENT_OPTIONS, useAccent, useTheme } from "@/lib/theme.js";

const VIEWPORT_MODES = [
  { id: "portrait", label: "Retrato" },
  { id: "landscape", label: "Paisagem" },
  { id: "web", label: "Web" },
];

const JOURNEY_STEPS = [
  { id: "inicio", label: "1. Início" },
  { id: "catalogo", label: "2. Louvor (Catálogo)" },
  { id: "musica", label: "3. Música" },
  { id: "info", label: "4. Ficha técnica" },
  { id: "mais", label: "5. Menu Mais+" },
];

const FALLBACK_SONGS = [
  {
    id: 1,
    numero: 1,
    titulo: "Cantai ao Senhor",
    banda: "Ministério de Louvor",
    compositor: "Domínio Público",
    album: "Coletânea Cristã",
    anoLancamento: "2020",
    tema: "Louvor",
    adicionais: "Canção de abertura e celebração.",
    letra:
      "Cantai ao Senhor um cântico novo\nCantai ao Senhor, cantai ao Senhor.\n\nPorque Ele fez, Ele faz maravilhas\nCantai ao Senhor, cantai ao Senhor.",
    refrao: "Jesus é o Senhor, amém, aleluia!",
    cronologica: true,
    refraoPrimeiro: false,
    vozesLetra: [],
    vozesRefrao: [],
    letraVozes: "",
    vozesArranjo: [],
    cifraLetra: ["C                G", "F          C", "", "C                G", "F          C"],
    cifraRefrao: ["F          G          C"],
  },
];

export default function AdminFinalPreviewSection({ songs = [] }) {
  const settings = getAppSettings();
  const { appName } = settings;
  const theme = useTheme();
  const currentAccentId = useAccent();
  const accentOption =
    ACCENT_OPTIONS.find((option) => option.id === currentAccentId) || ACCENT_OPTIONS[0];
  const isPreviewDark = theme === "dark";
  const appPreviewVars = {
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
  const { themes } = useSongThemes();
  const iconSrc =
    getAppIconImage(settings, theme) || `${import.meta.env.BASE_URL || "/"}icon.png`;

  const [viewport, setViewport] = useState("portrait");
  const [screen, setScreen] = useState("inicio");
  const [moreSubScreen, setMoreSubScreen] = useState(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [songMode, setSongMode] = useState(settings.defaultSongView || "letra");
  const [previewFavorites, setPreviewFavorites] = useState([1, 3]);

  const demoSongs = useMemo(() => {
    const source = songs.length > 0 ? songs : FALLBACK_SONGS;
    return filterSongs(source, search).slice(0, 8);
  }, [songs, search]);

  const [selectedSongId, setSelectedSongId] = useState(null);

  const activeSong = useMemo(() => {
    const source = songs.length > 0 ? songs : FALLBACK_SONGS;
    return (
      source.find((item) => item.id === selectedSongId) ||
      source[0] ||
      FALLBACK_SONGS[0]
    );
  }, [songs, selectedSongId]);

  const togglePreviewFavorite = (id) => {
    const numeric = Number(id);
    setPreviewFavorites((current) =>
      current.includes(numeric)
        ? current.filter((item) => item !== numeric)
        : [...current, numeric],
    );
  };

  const openSong = (song) => {
    setSelectedSongId(song.id);
    setSongMode(settings.defaultSongView || "letra");
    setScreen("musica");
  };

  const resetJourney = () => {
    setScreen("inicio");
    setMoreSubScreen(null);
    setShowSearch(false);
    setSearch("");
  };

  const isCompactBar = viewport === "landscape";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">Prévia final interativa</h3>
              <span className="rounded-full bg-pine/10 px-2.5 py-0.5 text-xs font-semibold text-pine">
                Modo demonstração limitado
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              Navegue pelo aplicativo do início ao fim mexendo nos menus em modo Retrato, Paisagem ou Web.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Modo de visualização da prévia final"
              className="inline-flex rounded-xl border border-line bg-paper p-1"
            >
              {VIEWPORT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={viewport === mode.id}
                  onClick={() => setViewport(mode.id)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    viewport === mode.id
                      ? "bg-pine text-white shadow-sm"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={resetJourney}
              className="h-10 rounded-xl border border-line px-3.5 text-xs font-medium hover:bg-paper"
            >
              Reiniciar do início
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-4">
          <span className="mr-1 text-xs font-medium text-ink-soft">Etapas rápidas:</span>
          {JOURNEY_STEPS.map((step) => {
            const active = screen === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setMoreSubScreen(null);
                  setScreen(step.id);
                }}
                className={`h-8 rounded-full px-3 text-xs font-medium transition-colors ${
                  active
                    ? "bg-pine/15 font-semibold text-pine"
                    : "bg-paper text-ink-soft hover:text-ink"
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </div>
      </section>

      <div
        style={appPreviewVars}
        className={`mx-auto w-full transition-all ${
          viewport === "web"
            ? "max-w-5xl"
            : viewport === "landscape"
              ? "max-w-[820px]"
              : "max-w-[380px]"
        }`}
      >
        <div
          className={
            viewport === "web"
              ? "overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
              : "overflow-hidden rounded-[2.4rem] border-[6px] border-neutral-800 bg-neutral-900 p-1.5 shadow-2xl ring-1 ring-black/20"
          }
        >
          {viewport === "web" ? (
            <div className="flex h-10 items-center justify-between border-b border-line bg-paper px-4 text-xs text-ink-soft">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex h-6 items-center rounded-md border border-line bg-card px-3 font-mono text-[11px] text-ink-soft">
                {appName.toLowerCase().replace(/\s+/g, "")}.app/
                {screen === "inicio" ? "" : screen}
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-pine">
                Versão Web
              </span>
            </div>
          ) : (
            <div
              aria-hidden
              className="flex h-6 shrink-0 items-center justify-between rounded-t-[1.9rem] bg-pine px-4 pt-0.5 text-[10px] font-semibold tracking-tight text-white select-none"
            >
              <span className="tabular-nums">09:41</span>
              {viewport === "portrait" ? (
                <span className="h-2.5 w-14 rounded-full bg-black/45" />
              ) : null}
              <span className="text-[10px]">5G · 100%</span>
            </div>
          )}

          <div
            className={`flex flex-col overflow-hidden bg-paper text-ink ${
              viewport === "web"
                ? "h-[min(640px,calc(100dvh-220px))] min-h-[460px]"
                : viewport === "landscape"
                  ? "h-[min(430px,calc(100dvh-210px))] min-h-[300px] rounded-b-[1.9rem]"
                  : "h-[min(630px,calc(100dvh-220px))] min-h-[460px] rounded-b-[1.9rem]"
            }`}
          >
            {screen === "inicio" ? (
              <div className="flex flex-1 flex-col justify-between overflow-y-auto p-6">
                <div className="my-auto mx-auto max-w-md text-center">
                  <img
                    src={iconSrc}
                    alt=""
                    className="mx-auto h-16 w-16 rounded-2xl border border-line bg-card object-contain p-1 shadow-sm"
                  />
                  <span className="mt-4 inline-flex rounded-full bg-pine/10 px-3 py-1 text-[11px] font-semibold text-pine">
                    Coletânea digital · App + Web
                  </span>
                  <h4 className="mt-3 text-2xl font-bold tracking-tight text-ink">{appName}</h4>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft sm:text-sm">
                    Explore letras, arranjos de vozes, cifras e temas de músicas em uma prévia navegável do início ao fim.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setScreen("catalogo")}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-pine px-6 text-xs font-semibold text-white shadow-sm hover:bg-pine-dark sm:text-sm"
                    >
                      Entrar no aplicativo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreSubScreen(null);
                        setScreen("mais");
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-card px-5 text-xs font-semibold text-ink hover:bg-paper sm:text-sm"
                    >
                      Ver menu Mais+
                    </button>
                  </div>
                </div>
                <p className="text-center text-[11px] text-ink-soft">
                  Demonstração limitada · {songs.length || 1} músicas disponíveis no catálogo
                </p>
              </div>
            ) : (
              <div
                className={
                  viewport === "web"
                    ? "mx-auto flex h-full min-h-0 w-full max-w-3xl flex-1 flex-col border-x border-line bg-card"
                    : "flex h-full min-h-0 flex-1 flex-col bg-card"
                }
              >
                {/* Cabeçalho interno do app */}
                <header
                  className={`flex shrink-0 items-center gap-2 border-b border-pine-dark bg-pine px-3 text-white shadow-sm ${
                    isCompactBar ? "h-11" : "h-13 py-2"
                  }`}
                >
                  {screen !== "catalogo" || moreSubScreen ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (screen === "info") {
                          setScreen("musica");
                        } else if (moreSubScreen) {
                          setMoreSubScreen(null);
                        } else {
                          setScreen("catalogo");
                        }
                      }}
                      aria-label="Voltar"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl leading-none text-white/90 hover:bg-white/15"
                    >
                      ‹
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setScreen("inicio")}
                      title="Voltar à tela inicial"
                      className="inline-flex items-center gap-2 text-left"
                    >
                      <img src={iconSrc} alt="" className="h-7 w-7 rounded-lg object-contain" />
                    </button>
                  )}

                  <div className="min-w-0 flex-1">
                    {screen === "catalogo" ? (
                      <p className="truncate text-sm font-semibold">{appName}</p>
                    ) : screen === "musica" || screen === "info" ? (
                      <div className="flex min-h-5 min-w-0 items-stretch gap-2 text-white">
                        <span className="flex w-[3ch] shrink-0 items-center justify-end text-xs font-semibold tabular-nums">
                          {String(activeSong.numero || 1).padStart(3, "0")}
                        </span>
                        <span aria-hidden className="w-px shrink-0 self-stretch bg-white/35" />
                        <span className="flex min-w-0 flex-1 items-center">
                          <MarqueeText
                            text={activeSong.titulo}
                            className="text-sm font-semibold leading-tight"
                          />
                        </span>
                      </div>
                    ) : (
                      <p className="truncate text-sm font-semibold">
                        {moreSubScreen === "favoritos"
                          ? "Favoritos"
                          : moreSubScreen === "temas"
                            ? "Temas"
                            : moreSubScreen === "sobre"
                              ? "Informações do app"
                              : moreSubScreen === "configuracoes"
                                ? "Configurações"
                                : "Mais+"}
                      </p>
                    )}
                  </div>

                  {screen === "catalogo" ? (
                    <button
                      type="button"
                      onClick={() => setShowSearch((current) => !current)}
                      aria-label="Buscar na prévia"
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                        showSearch ? "bg-white text-pine" : "text-white/90 hover:bg-white/15"
                      }`}
                    >
                      🔍
                    </button>
                  ) : null}

                  {screen === "musica" ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => togglePreviewFavorite(activeSong.id)}
                        aria-label="Favoritar na prévia"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm text-white/90 hover:bg-white/15"
                      >
                        {previewFavorites.includes(Number(activeSong.id)) ? "♥" : "♡"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setScreen("info")}
                        title="Informações da música"
                        className="inline-flex h-7 items-center rounded-full bg-white/15 px-2.5 text-[11px] font-semibold text-white hover:bg-white/25"
                      >
                        Info
                      </button>
                    </div>
                  ) : null}
                </header>

                {screen === "catalogo" && showSearch ? (
                  <div className="border-b border-line bg-card px-3 py-2">
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Filtrar amostra de músicas…"
                      className="h-8 w-full rounded-lg border border-line bg-paper px-2.5 text-xs outline-none focus:ring-2 focus:ring-pine"
                    />
                  </div>
                ) : null}

                {/* Corpo da tela */}
                <SongScroll>
                  {screen === "catalogo" ? (
                    <div>
                      <div className="border-b border-line bg-paper/70 px-3.5 py-2 text-[11px] text-ink-soft">
                        Prévia limitada às primeiras {demoSongs.length} músicas · Toque para abrir
                      </div>
                      <ul className="divide-y divide-line">
                        {demoSongs.map((song) => {
                          const fav = previewFavorites.includes(Number(song.id));
                          return (
                            <li key={song.id} className="flex items-center px-2">
                              <button
                                type="button"
                                onClick={() => openSong(song)}
                                className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left hover:bg-paper"
                              >
                                <span className="w-7 shrink-0 text-right font-mono text-xs font-medium tabular-nums text-pine">
                                  {String(song.numero || 1).padStart(3, "0")}
                                </span>
                                <span aria-hidden className="h-5 w-px shrink-0 bg-line" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-medium text-ink sm:text-sm">
                                    {song.titulo}
                                  </span>
                                  {song.banda || song.tema ? (
                                    <span className="block truncate text-[10px] text-ink-soft">
                                      {[song.banda, song.tema].filter(Boolean).join(" · ")}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePreviewFavorite(song.id)}
                                aria-label="Alternar favorito"
                                className={`h-9 w-9 shrink-0 rounded-full text-sm ${
                                  fav ? "text-pine" : "text-ink-soft hover:text-ink"
                                }`}
                              >
                                {fav ? "♥" : "♡"}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : screen === "musica" ? (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/60 px-3.5 py-2">
                        <div className="inline-flex rounded-lg border border-line bg-card p-0.5">
                          {[
                            { id: "letra", label: "Letra" },
                            { id: "vozes", label: "Vozes" },
                            { id: "cifra", label: "Cifra" },
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setSongMode(mode.id)}
                              className={`h-7 rounded-md px-2.5 text-[11px] font-medium ${
                                songMode === mode.id
                                  ? "bg-pine text-white"
                                  : "text-ink-soft hover:text-ink"
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setScreen("info")}
                          className="text-[11px] font-medium text-pine hover:underline"
                        >
                          Ver ficha técnica →
                        </button>
                      </div>
                      <Lyrics
                        letra={activeSong.letra}
                        refrao={activeSong.refrao}
                        vozesLetra={activeSong.vozesLetra}
                        vozesRefrao={activeSong.vozesRefrao}
                        letraVozes={activeSong.letraVozes}
                        vozesArranjo={activeSong.vozesArranjo}
                        cifraLetra={activeSong.cifraLetra}
                        cifraRefrao={activeSong.cifraRefrao}
                        cronologica={Boolean(activeSong.cronologica)}
                        refraoPrimeiro={Boolean(activeSong.refraoPrimeiro)}
                        showVoices={songMode === "vozes"}
                        showChords={songMode === "cifra"}
                        fontSize={15}
                      />
                    </div>
                  ) : screen === "info" ? (
                    <div className="space-y-3 p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                          Informações da música
                        </h4>
                        <button
                          type="button"
                          onClick={() => setScreen("musica")}
                          className="text-xs font-medium text-pine hover:underline"
                        >
                          Voltar para a letra
                        </button>
                      </div>
                      <dl className="divide-y divide-line rounded-2xl border border-line bg-paper/60">
                        {[
                          { label: "Título", value: activeSong.titulo },
                          { label: "Banda / Intérprete", value: activeSong.banda },
                          { label: "Compositor(es)", value: activeSong.compositor },
                          { label: "Álbum", value: activeSong.album },
                          { label: "Ano de lançamento", value: activeSong.anoLancamento },
                          { label: "Tema", value: activeSong.tema },
                          { label: "Adicionais", value: activeSong.adicionais, multiline: true },
                        ].map(({ label, value, multiline }) => {
                          const text = String(value ?? "").trim();
                          return (
                            <div key={label} className="px-3.5 py-2.5">
                              <dt className="text-[11px] font-medium text-ink-soft">{label}</dt>
                              <dd
                                className={`mt-0.5 text-xs ${
                                  text ? "text-ink" : "italic text-ink-soft/65"
                                } ${multiline ? "whitespace-pre-wrap" : ""}`}
                              >
                                {text || "Não informado"}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  ) : moreSubScreen === "favoritos" ? (
                    <div className="p-3.5">
                      <p className="mb-2 text-xs text-ink-soft">
                        Músicas marcadas como favoritas nesta demonstração:
                      </p>
                      <ul className="divide-y divide-line rounded-xl border border-line bg-paper/50">
                        {demoSongs.filter((song) => previewFavorites.includes(Number(song.id)))
                          .length === 0 ? (
                          <li className="p-6 text-center text-xs text-ink-soft">
                            Nenhuma música favoritada na prévia.
                          </li>
                        ) : (
                          demoSongs
                            .filter((song) => previewFavorites.includes(Number(song.id)))
                            .map((song) => (
                              <li key={song.id}>
                                <button
                                  type="button"
                                  onClick={() => openSong(song)}
                                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs hover:bg-card"
                                >
                                  <span className="font-mono text-pine">
                                    {String(song.numero || 1).padStart(3, "0")}
                                  </span>
                                  <span className="truncate font-medium">{song.titulo}</span>
                                </button>
                              </li>
                            ))
                        )}
                      </ul>
                    </div>
                  ) : moreSubScreen === "temas" ? (
                    <div className="space-y-2 p-3.5">
                      <p className="text-xs text-ink-soft">
                        Temas disponíveis no app ({themes.length}):
                      </p>
                      {themes.length === 0 ? (
                        <p className="rounded-xl border border-line bg-paper p-5 text-center text-xs text-ink-soft">
                          Nenhum tema cadastrado ainda. Use o menu Cadastros para criar temas.
                        </p>
                      ) : (
                        <ul className="divide-y divide-line rounded-xl border border-line bg-paper/50">
                          {themes.slice(0, 6).map((item) => (
                            <li key={item.id} className="px-3.5 py-2.5">
                              <p className="text-xs font-semibold text-ink">{item.name}</p>
                              <p className="text-[11px] text-ink-soft">
                                {item.songIds.length}{" "}
                                {item.songIds.length === 1 ? "música" : "músicas"}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : moreSubScreen === "sobre" ? (
                    <div className="space-y-3 p-4">
                      <div className="rounded-xl border border-line bg-paper p-4">
                        <p className="text-sm font-semibold">{appName}</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                          Coletânea digital de músicas, letras, vozes e cifras configurada pelo painel administrativo.
                        </p>
                      </div>
                    </div>
                  ) : moreSubScreen === "configuracoes" ? (
                    <div className="space-y-3 p-4">
                      <div className="rounded-xl border border-line bg-paper p-3.5 text-xs">
                        <p className="font-semibold text-ink">Preferências padrão ativas</p>
                        <p className="mt-1 text-ink-soft">
                          Visualização inicial: <strong className="text-ink">{settings.defaultSongView}</strong> · Fonte:{" "}
                          <strong className="text-ink">{settings.fontSize}px</strong>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ul className="divide-y divide-line">
                      {[
                        {
                          id: "favoritos",
                          label: "Favoritos",
                          description: "Músicas marcadas como favoritas",
                        },
                        {
                          id: "temas",
                          label: "Temas",
                          description: "Listas e temas das músicas cadastradas",
                        },
                        {
                          id: "configuracoes",
                          label: "Configurações",
                          description: "Tamanho da letra, tema e leitura",
                        },
                        {
                          id: "sobre",
                          label: "Informações",
                          description: "Sobre a coletânea e o aplicativo",
                        },
                      ].map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setMoreSubScreen(item.id)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-paper"
                          >
                            <div>
                              <p className="text-xs font-semibold text-ink sm:text-sm">
                                {item.label}
                              </p>
                              <p className="mt-0.5 text-[11px] text-ink-soft">
                                {item.description}
                              </p>
                            </div>
                            <span aria-hidden className="text-base text-ink-soft">
                              ›
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </SongScroll>

                {/* Barra de navegação inferior interativa */}
                <div className="shrink-0 border-t border-line bg-card">
                  <nav
                    aria-label="Navegação da prévia final"
                    className="grid grid-cols-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMoreSubScreen(null);
                        setScreen("catalogo");
                      }}
                      className={`flex items-center justify-center font-medium ${
                        isCompactBar
                          ? "h-9 flex-row gap-1.5 text-[11px]"
                          : "h-12 flex-col gap-0.5 text-[11px]"
                      } ${
                        screen === "catalogo" || screen === "musica" || screen === "info"
                          ? "font-semibold text-pine"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      <span>♪</span>
                      <span>Louvor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreSubScreen(null);
                        setScreen("mais");
                      }}
                      className={`flex items-center justify-center font-medium ${
                        isCompactBar
                          ? "h-9 flex-row gap-1.5 text-[11px]"
                          : "h-12 flex-col gap-0.5 text-[11px]"
                      } ${
                        screen === "mais"
                          ? "font-semibold text-pine"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      <span>⊞</span>
                      <span>Mais+</span>
                    </button>
                  </nav>
                  {viewport !== "web" ? (
                    <div aria-hidden className="flex justify-center pb-1.5 pt-0.5">
                      <span className="h-1 w-24 rounded-full bg-ink/20" />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
