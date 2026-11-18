import { useEffect, useMemo, useRef, useState } from "react";
import Lyrics, { splitLyrics, stripRefrainLabel } from "@/components/Lyrics.jsx";
import { filterSongs } from "@/lib/songs.js";

const FALLBACK_SONGS = [
  {
    id: "demo-1",
    numero: 1,
    titulo: "Horizonte de Luz (Exemplo)",
    banda: "Banda Horizonte",
    compositor: "Lucas Andrade",
    tema: "Abertura / Início",
    letra:
      "Quando o som começa a ecoar\nCada acorde encontra o seu lugar\nNossa voz se espalha pelo ar\nNa melodia que nos faz cantar.\n\nNosso ritmo guia cada passo\nNa harmonia desse compasso\nOnde a música une cada coração.",
    refrao: "A música nos move do início ao fim!\nEm cada nota, a nossa canção.",
    cronologica: true,
    refraoPrimeiro: false,
  },
];

const SLIDE_THEMES = [
  {
    id: "dark",
    label: "Escuro Telão",
    bgClass: "bg-neutral-950 text-white",
    accentClass: "text-emerald-400",
    mutedClass: "text-white/60",
    swatch: "bg-neutral-950 border-neutral-700",
  },
  {
    id: "pine",
    label: "Verde Estúdio",
    bgClass: "bg-pine text-white",
    accentClass: "text-emerald-200",
    mutedClass: "text-white/70",
    swatch: "bg-pine border-pine-dark",
  },
  {
    id: "midnight",
    label: "Azul Noite",
    bgClass: "bg-slate-900 text-slate-50",
    accentClass: "text-sky-300",
    mutedClass: "text-slate-300/70",
    swatch: "bg-slate-900 border-slate-700",
  },
  {
    id: "warm",
    label: "Âmbar Suave",
    bgClass: "bg-stone-900 text-amber-50",
    accentClass: "text-amber-300",
    mutedClass: "text-amber-100/60",
    swatch: "bg-stone-900 border-amber-700",
  },
  {
    id: "light",
    label: "Claro",
    bgClass: "bg-white text-neutral-900",
    accentClass: "text-pine",
    mutedClass: "text-neutral-500",
    swatch: "bg-white border-neutral-300",
  },
];

const FONT_SIZES = [
  { id: "sm", label: "Pequeno", previewClass: "text-base sm:text-lg", fullscreenClass: "text-2xl sm:text-4xl" },
  { id: "md", label: "Médio", previewClass: "text-lg sm:text-xl", fullscreenClass: "text-3xl sm:text-5xl" },
  { id: "lg", label: "Grande", previewClass: "text-xl sm:text-2xl", fullscreenClass: "text-4xl sm:text-6xl" },
  { id: "xl", label: "Extra", previewClass: "text-2xl sm:text-3xl", fullscreenClass: "text-5xl sm:text-7xl" },
];

function extractSongParts(song) {
  if (!song) return { verses: [], refrao: "" };
  const embedded = splitLyrics(song.letra || "");
  const storedRefrao = stripRefrainLabel(song.refrao || "");
  const refrao = storedRefrao || stripRefrainLabel(embedded.refrao || "");
  const baseLetra = storedRefrao ? String(song.letra || "").trim() : embedded.letra;
  const fallbackLetra = baseLetra || String(song.letraVozes || "").trim();

  const verses = fallbackLetra
    ? fallbackLetra
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}/)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
    : [];

  return { verses, refrao };
}

function splitChunkByLines(text, maxLines) {
  const clean = String(text ?? "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (!maxLines || maxLines <= 0) return [clean];
  const lines = clean.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length <= maxLines) return [clean];
  const chunks = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    chunks.push(lines.slice(i, i + maxLines).join("\n"));
  }
  return chunks;
}

function buildSlidesFromSong(song, options) {
  if (!song) return [];
  const { includeTitleSlide, repeatChorus, maxLinesPerSlide } = options;
  const { verses, refrao } = extractSongParts(song);
  const slides = [];
  let nextId = 1;

  if (includeTitleSlide) {
    slides.push({
      id: `slide-${nextId++}`,
      kind: "capa",
      label: "Capa",
      text: song.titulo || "Sem título",
      subtitle: [song.banda, song.compositor].filter(Boolean).join(" · "),
    });
  }

  const pushRefraoSlides = () => {
    if (!refrao) return;
    const parts = splitChunkByLines(refrao, maxLinesPerSlide);
    parts.forEach((part, index) => {
      slides.push({
        id: `slide-${nextId++}`,
        kind: "refrao",
        label: parts.length > 1 ? `Refrão (${index + 1}/${parts.length})` : "Refrão",
        text: part,
      });
    });
  };

  if (song.refraoPrimeiro && refrao) {
    pushRefraoSlides();
  }

  verses.forEach((verse, verseIndex) => {
    const parts = splitChunkByLines(verse, maxLinesPerSlide);
    parts.forEach((part, partIndex) => {
      const suffix = parts.length > 1 ? ` (${partIndex + 1}/${parts.length})` : "";
      slides.push({
        id: `slide-${nextId++}`,
        kind: "estrofe",
        label: `Estrofe ${verseIndex + 1}${suffix}`,
        text: part,
      });
    });

    if (repeatChorus && refrao) {
      pushRefraoSlides();
    } else if (!repeatChorus && !song.refraoPrimeiro && verseIndex === 0 && refrao) {
      pushRefraoSlides();
    }
  });

  if (verses.length === 0 && refrao && !song.refraoPrimeiro) {
    pushRefraoSlides();
  }

  if (slides.length === 0) {
    slides.push({
      id: `slide-${nextId++}`,
      kind: "estrofe",
      label: "Slide 1",
      text: song.titulo || "Adicione texto para este slide",
    });
  }

  return slides;
}

export default function AdminSlidesEditorSection({ songs = [], loadingSongs = false }) {
  const catalog = songs.length > 0 ? songs : FALLBACK_SONGS;
  const [search, setSearch] = useState("");
  const [selectedSongId, setSelectedSongId] = useState(() => catalog[0]?.id ?? null);
  const [lyricViewMode, setLyricViewMode] = useState("completa");

  // Opções de geração automática
  const [includeTitleSlide, setIncludeTitleSlide] = useState(true);
  const [repeatChorus, setRepeatChorus] = useState(true);
  const [maxLinesPerSlide, setMaxLinesPerSlide] = useState(0);

  // Aparência dos slides
  const [themeId, setThemeId] = useState("dark");
  const [fontSizeId, setFontSizeId] = useState("md");
  const [align, setAlign] = useState("center");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [showFooter, setShowFooter] = useState(true);

  // Slides da música atual (somente em memória / protótipo)
  const [slides, setSlides] = useState([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Formulário simples de novo slide
  const [newSlideLabel, setNewSlideLabel] = useState("Estrofe");
  const [newSlideText, setNewSlideText] = useState("");

  // Tela cheia demonstrativa
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const fullscreenContainerRef = useRef(null);

  const filteredSongs = useMemo(() => filterSongs(catalog, search), [catalog, search]);

  const selectedSong = useMemo(
    () => catalog.find((item) => String(item.id) === String(selectedSongId)) ?? catalog[0] ?? null,
    [catalog, selectedSongId],
  );

  const songParts = useMemo(() => extractSongParts(selectedSong), [selectedSong]);

  useEffect(() => {
    if (!selectedSong) return;
    const defaultRepeat = Boolean(selectedSong.cronologica ?? true);
    setRepeatChorus(defaultRepeat);
    const generated = buildSlidesFromSong(selectedSong, {
      includeTitleSlide,
      repeatChorus: defaultRepeat,
      maxLinesPerSlide,
    });
    setSlides(generated);
    setActiveSlideIndex(0);
  }, [selectedSong?.id]);

  const regenerateSlides = (customOptions = {}) => {
    if (!selectedSong) return;
    const nextOptions = {
      includeTitleSlide,
      repeatChorus,
      maxLinesPerSlide,
      ...customOptions,
    };
    const generated = buildSlidesFromSong(selectedSong, nextOptions);
    setSlides(generated);
    setActiveSlideIndex(0);
  };

  const activeSlide = slides[activeSlideIndex] ?? slides[0] ?? null;
  const activeTheme = SLIDE_THEMES.find((item) => item.id === themeId) ?? SLIDE_THEMES[0];
  const activeFontSize = FONT_SIZES.find((item) => item.id === fontSizeId) ?? FONT_SIZES[1];

  const handleAddSlide = (event) => {
    event.preventDefault();
    const trimmed = newSlideText.trim();
    if (!trimmed) return;
    const created = {
      id: `slide-custom-${Date.now()}`,
      kind: newSlideLabel.toLowerCase().includes("refr") ? "refrao" : "estrofe",
      label: newSlideLabel.trim() || `Slide ${slides.length + 1}`,
      text: trimmed,
    };
    setSlides((current) => {
      const next = [...current, created];
      setActiveSlideIndex(next.length - 1);
      return next;
    });
    setNewSlideText("");
  };

  const handleQuickAddChunk = (label, text, kind = "estrofe") => {
    const trimmed = String(text ?? "").trim();
    if (!trimmed) return;
    const created = {
      id: `slide-chunk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind,
      label,
      text: trimmed,
    };
    setSlides((current) => {
      const next = [...current, created];
      setActiveSlideIndex(next.length - 1);
      return next;
    });
  };

  const handleUpdateActiveSlideText = (text) => {
    setSlides((current) =>
      current.map((slide, index) => (index === activeSlideIndex ? { ...slide, text } : slide)),
    );
  };

  const handleRemoveSlide = (indexToRemove) => {
    setSlides((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((_, index) => index !== indexToRemove);
      setActiveSlideIndex((prev) => Math.min(prev, next.length - 1));
      return next;
    });
  };

  const handleMoveSlide = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    setSlides((current) => {
      const copy = [...current];
      const [moved] = copy.splice(index, 1);
      copy.splice(target, 0, moved);
      return copy;
    });
    setActiveSlideIndex(target);
  };

  const openFullscreenDemo = async () => {
    setFullscreenOpen(true);
    setTimeout(() => {
      const el = fullscreenContainerRef.current;
      if (el && el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          // Mantém o modal em tela cheia caso o navegador bloqueie a API nativa
        });
      }
    }, 20);
  };

  const closeFullscreenDemo = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setFullscreenOpen(false);
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && fullscreenOpen) {
        // Permite continuar ou fechar suavemente
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [fullscreenOpen]);

  useEffect(() => {
    if (!fullscreenOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeFullscreenDemo();
      } else if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        setActiveSlideIndex((prev) => Math.min(prev + 1, Math.max(0, slides.length - 1)));
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setActiveSlideIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Home") {
        event.preventDefault();
        setActiveSlideIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setActiveSlideIndex(Math.max(0, slides.length - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenOpen, slides.length]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Cabeçalho e seletor de música */}
      <section className="border-b border-line/80 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">Editor de slides das músicas</h3>
              <span className="rounded-[2px] border border-line bg-card px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                Projeção
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-soft">
              Escolha uma música para visualizar a letra à esquerda e organizar ou projetar os slides à direita.
            </p>
          </div>
          <button
            type="button"
            onClick={openFullscreenDemo}
            disabled={!activeSlide}
            className="inline-flex h-8.5 items-center gap-2 rounded-[3px] bg-pine px-3.5 text-xs font-semibold text-white hover:bg-pine-dark disabled:opacity-50"
          >
            <FullscreenIcon className="h-3.5 w-3.5" />
            Apresentar em tela cheia
          </button>
        </div>

        {/* Barra de seleção da música */}
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink-soft">Filtrar música</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por número, título ou trecho…"
              className="h-9 w-full rounded-[3px] border border-line bg-card px-2.5 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink-soft">
              Selecionar música ({filteredSongs.length} {filteredSongs.length === 1 ? "disponível" : "disponíveis"})
            </span>
            <select
              value={selectedSong?.id ?? ""}
              onChange={(event) => setSelectedSongId(event.target.value)}
              disabled={loadingSongs}
              aria-label="Escolher música para os slides"
              className="h-9 w-full rounded-[3px] border border-line bg-card px-2.5 text-[13px] font-medium text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
            >
              {filteredSongs.length === 0 ? (
                <option value="">Nenhuma música encontrada para "{search}"</option>
              ) : (
                filteredSongs.map((song, idx) => {
                  const num = String(song.numero || idx + 1).padStart(3, "0");
                  return (
                    <option key={song.id} value={song.id}>
                      #{num} — {song.titulo}
                      {song.banda ? ` (${song.banda})` : ""}
                    </option>
                  );
                })
              )}
            </select>
          </label>
        </div>
      </section>

      {/* Corpo principal: Esquerda (Toda a letra) | Direita (Configurações simples + Prévia/Tela cheia) */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
        {/* COLUNA ESQUERDA: Toda a letra da música selecionada */}
        <section className="flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 pb-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-[2px] border border-line bg-card px-1.5 py-0.5 font-mono text-xs font-medium text-ink-soft">
                  #{String(selectedSong?.numero || 1).padStart(3, "0")}
                </span>
                <h4 className="truncate text-sm font-semibold text-ink">
                  {selectedSong?.titulo || "Selecione uma música"}
                </h4>
              </div>
              <p className="mt-0.5 text-xs text-ink-soft">
                {[selectedSong?.banda, selectedSong?.compositor, selectedSong?.tema]
                  .filter(Boolean)
                  .join(" · ") || "Letra completa da música selecionada"}
              </p>
            </div>

            <div
              role="group"
              aria-label="Modo de exibição da letra"
              className="inline-flex rounded-[3px] border border-line bg-card p-0.5"
            >
              <button
                type="button"
                onClick={() => setLyricViewMode("completa")}
                className={`h-7.5 rounded-[2px] px-2.5 text-xs font-medium transition-colors ${
                  lyricViewMode === "completa"
                    ? "bg-pine text-white"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Letra inteira
              </button>
              <button
                type="button"
                onClick={() => setLyricViewMode("blocos")}
                className={`h-7.5 rounded-[2px] px-2.5 text-xs font-medium transition-colors ${
                  lyricViewMode === "blocos"
                    ? "bg-pine text-white"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Estrofes (+ Slide)
              </button>
            </div>
          </div>

          {selectedSong ? (
            <div className="space-y-6 pt-5">
              {lyricViewMode === "completa" ? (
                <div className="border-b border-line/80 pb-6">
                  <Lyrics
                    letra={selectedSong.letra || ""}
                    refrao={selectedSong.refrao || ""}
                    vozesLetra={selectedSong.vozesLetra || []}
                    vozesRefrao={selectedSong.vozesRefrao || []}
                    letraVozes={selectedSong.letraVozes || ""}
                    vozesArranjo={selectedSong.vozesArranjo || []}
                    cifraLetra={[]}
                    cifraRefrao={[]}
                    cronologica={Boolean(selectedSong.cronologica)}
                    refraoPrimeiro={Boolean(selectedSong.refraoPrimeiro)}
                    showVoices={false}
                    showChords={false}
                    fontSize={16}
                  />
                </div>
              ) : null}

              {/* Blocos da letra para envio rápido ou leitura estruturada */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-xs font-semibold text-ink-soft">
                    {lyricViewMode === "completa"
                      ? "Partes da letra (clique para criar um slide rapidamente)"
                      : "Estrofes e refrão da música"}
                  </h5>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAddChunk(
                        "Capa",
                        selectedSong.titulo,
                        "capa",
                      )
                    }
                    className="h-7.5 rounded-[3px] border border-line bg-card px-2.5 text-xs font-medium text-ink hover:border-pine hover:text-pine"
                  >
                    + Slide de título
                  </button>
                </div>

                {songParts.refrao ? (
                  <div className="border-l-2 border-pine pl-3.5">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-pine">
                        Refrão
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuickAddChunk("Refrão", songParts.refrao, "refrao")}
                        className="inline-flex h-7 items-center rounded-[3px] bg-pine px-2.5 text-xs font-semibold text-white hover:bg-pine-dark"
                      >
                        + Adicionar slide
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap font-lyric text-[13px] italic leading-relaxed text-ink">
                      {songParts.refrao}
                    </p>
                  </div>
                ) : null}

                {songParts.verses.length > 0 ? (
                  <div className="divide-y divide-line/80 border-t border-line/80">
                    {songParts.verses.map((verse, idx) => (
                      <div key={idx} className="py-3.5">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-ink-soft">
                            Estrofe {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickAddChunk(`Estrofe ${idx + 1}`, verse, "estrofe")
                            }
                            className="inline-flex h-7 items-center rounded-[3px] border border-line bg-card px-2.5 text-xs font-medium text-pine hover:border-pine"
                          >
                            + Adicionar slide
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap font-lyric text-[13px] leading-relaxed text-ink">
                          {verse}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-xs text-ink-soft">
                    Esta música ainda não possui estrofes cadastradas.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="py-6 text-sm text-ink-soft">Nenhuma música selecionada.</p>
          )}
        </section>

        {/* COLUNA DIREITA: Prévia + Tela cheia demonstrativo + Configurações simples de criar slides */}
        <aside className="divide-y divide-line/80 border-t border-line/80 pt-6 lg:sticky lg:top-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          {/* Bloco 1: Prévia ao vivo do Slide + Botão Tela Cheia */}
          <section className="pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-ink">
                  Demonstração do slide
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Slide {slides.length ? activeSlideIndex + 1 : 0} de {slides.length} ·{" "}
                  {aspectRatio}
                </p>
              </div>
              <button
                type="button"
                onClick={openFullscreenDemo}
                disabled={!activeSlide}
                className="inline-flex h-8 items-center gap-1.5 rounded-[3px] bg-pine px-3 text-xs font-semibold text-white hover:bg-pine-dark disabled:opacity-50"
              >
                <FullscreenIcon className="h-3.5 w-3.5" />
                Tela cheia
              </button>
            </div>

            {/* Palco de prévia do slide */}
            <div
              className={`relative mt-3 flex w-full flex-col justify-between overflow-hidden rounded-[3px] border border-line p-5 transition-colors ${
                aspectRatio === "4:3" ? "aspect-[4/3]" : "aspect-video"
              } ${activeTheme.bgClass}`}
            >
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className={`font-semibold uppercase tracking-wider ${activeTheme.accentClass}`}>
                  {activeSlide?.label || "Slide"}
                </span>
                {showFooter ? (
                  <span className={`font-mono ${activeTheme.mutedClass}`}>
                    {slides.length ? `${activeSlideIndex + 1}/${slides.length}` : ""}
                  </span>
                ) : null}
              </div>

              <div
                className={`my-auto flex flex-col justify-center overflow-y-auto py-2 ${
                  align === "center" ? "items-center text-center" : "items-start text-left"
                }`}
              >
                {activeSlide ? (
                  <>
                    <p
                      className={`whitespace-pre-wrap font-lyric leading-snug ${
                        activeSlide.kind === "capa"
                          ? "text-2xl font-bold sm:text-3xl"
                          : activeSlide.kind === "refrao"
                            ? `${activeFontSize.previewClass} italic font-medium`
                            : activeFontSize.previewClass
                      }`}
                    >
                      {activeSlide.text}
                    </p>
                    {activeSlide.subtitle ? (
                      <p className={`mt-2 text-xs sm:text-sm ${activeTheme.mutedClass}`}>
                        {activeSlide.subtitle}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className={`text-sm ${activeTheme.mutedClass}`}>
                    Nenhum slide criado.
                  </p>
                )}
              </div>

              {showFooter ? (
                <div className={`flex items-center justify-between gap-2 border-t border-current/10 pt-2 text-[10px] ${activeTheme.mutedClass}`}>
                  <span className="truncate">{selectedSong?.titulo || ""}</span>
                  <span>Projeção demonstrativa</span>
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* Controles Anterior / Próximo */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActiveSlideIndex((prev) => Math.max(prev - 1, 0))}
                disabled={activeSlideIndex <= 0}
                className="h-8.5 flex-1 rounded-[3px] border border-line bg-card px-3 text-xs font-medium hover:bg-paper disabled:opacity-40"
              >
                ‹ Slide anterior
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveSlideIndex((prev) => Math.min(prev + 1, Math.max(0, slides.length - 1)))
                }
                disabled={activeSlideIndex >= slides.length - 1}
                className="h-8.5 flex-1 rounded-[3px] border border-line bg-card px-3 text-xs font-medium hover:bg-paper disabled:opacity-40"
              >
                Próximo slide ›
              </button>
            </div>
          </section>

          {/* Bloco 2: Configurações simples de criar novos slides */}
          <section className="space-y-5 pt-6">
            <div>
              <h4 className="text-sm font-semibold text-ink">Configurações de slides</h4>
              <p className="mt-0.5 text-xs text-ink-soft">
                Gere slides automaticamente da letra ou adicione novos slides personalizados.
              </p>
            </div>

            {/* Divisão automática da letra */}
            <div className="space-y-2.5 border-t border-line/80 pt-3.5">
              <p className="text-xs font-semibold text-ink">Gerar a partir da letra</p>
              <label className="flex cursor-pointer items-center gap-2.5 text-xs">
                <input
                  type="checkbox"
                  checked={includeTitleSlide}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setIncludeTitleSlide(checked);
                    regenerateSlides({ includeTitleSlide: checked });
                  }}
                  className="h-3.5 w-3.5 rounded-[2px] accent-pine"
                />
                <span>Criar slide de capa com o título da música</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-xs">
                <input
                  type="checkbox"
                  checked={repeatChorus}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setRepeatChorus(checked);
                    regenerateSlides({ repeatChorus: checked });
                  }}
                  className="h-3.5 w-3.5 rounded-[2px] accent-pine"
                />
                <span>Repetir o refrão após cada estrofe</span>
              </label>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-ink-soft">Linhas por slide:</span>
                <div className="inline-flex rounded-[3px] border border-line bg-card p-0.5">
                  {[
                    { value: 0, label: "Estrofe" },
                    { value: 2, label: "2 linhas" },
                    { value: 4, label: "4 linhas" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setMaxLinesPerSlide(option.value);
                        regenerateSlides({ maxLinesPerSlide: option.value });
                      }}
                      className={`h-7 rounded-[2px] px-2.5 text-[11px] font-medium ${
                        maxLinesPerSlide === option.value
                          ? "bg-pine text-white"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Criar novo slide manual */}
            <form onSubmit={handleAddSlide} className="space-y-2.5 border-t border-line/80 pt-3.5">
              <p className="text-xs font-semibold text-ink">Criar novo slide</p>
              <div className="flex gap-2">
                <select
                  value={newSlideLabel}
                  onChange={(event) => setNewSlideLabel(event.target.value)}
                  aria-label="Tipo do novo slide"
                  className="h-8.5 rounded-[3px] border border-line bg-card px-2.5 text-xs font-medium text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                >
                  <option value="Estrofe">Estrofe</option>
                  <option value="Refrão">Refrão</option>
                  <option value="Ponte">Ponte</option>
                  <option value="Final">Final</option>
                  <option value="Aviso">Aviso</option>
                </select>
                <button
                  type="submit"
                  disabled={!newSlideText.trim()}
                  className="h-8.5 flex-1 rounded-[3px] bg-pine px-3 text-xs font-semibold text-white hover:bg-pine-dark disabled:opacity-50"
                >
                  + Adicionar slide
                </button>
              </div>
              <textarea
                rows={3}
                value={newSlideText}
                onChange={(event) => setNewSlideText(event.target.value)}
                placeholder="Digite ou cole o trecho da letra para o novo slide…"
                className="w-full rounded-[3px] border border-line bg-card p-2.5 text-xs leading-relaxed text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
              />
            </form>

            {/* Aparência simples do slide */}
            <div className="space-y-3 border-t border-line/80 pt-3.5">
              <p className="text-xs font-semibold text-ink">Aparência da projeção</p>

              <div className="space-y-1.5">
                <span className="block text-[11px] text-ink-soft">Cor de fundo</span>
                <div className="flex flex-wrap gap-1.5">
                  {SLIDE_THEMES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setThemeId(item.id)}
                      className={`inline-flex h-7.5 items-center gap-1.5 rounded-[3px] border px-2.5 text-xs font-medium transition-colors ${
                        themeId === item.id
                          ? "border-pine bg-pine/10 text-pine"
                          : "border-line bg-card text-ink-soft hover:text-ink"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-[2px] border ${item.swatch}`} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="mb-1 block text-[11px] text-ink-soft">Tamanho do texto</span>
                  <div className="inline-flex w-full rounded-[3px] border border-line bg-card p-0.5">
                    {FONT_SIZES.map((size) => (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => setFontSizeId(size.id)}
                        className={`h-7 flex-1 rounded-[2px] text-[11px] font-medium ${
                          fontSizeId === size.id
                            ? "bg-pine text-white"
                            : "text-ink-soft hover:text-ink"
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="mb-1 block text-[11px] text-ink-soft">Alinhamento e tela</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setAlign((prev) => (prev === "center" ? "left" : "center"))}
                      className="h-8 flex-1 rounded-[3px] border border-line bg-card px-2 text-[11px] font-medium text-ink hover:bg-paper"
                    >
                      {align === "center" ? "Centralizado" : "À esquerda"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio((prev) => (prev === "16:9" ? "4:3" : "16:9"))}
                      className="h-8 rounded-[3px] border border-line bg-card px-2.5 text-[11px] font-semibold text-pine hover:bg-paper"
                    >
                      {aspectRatio}
                    </button>
                  </div>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={showFooter}
                  onChange={(event) => setShowFooter(event.target.checked)}
                  className="h-3.5 w-3.5 rounded-[2px] accent-pine"
                />
                <span>Exibir título da música e contador no slide</span>
              </label>
            </div>

            {/* Lista rápida dos slides criados + edição rápida do slide ativo */}
            <div className="space-y-2.5 border-t border-line/80 pt-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">
                  Ordem dos slides ({slides.length})
                </span>
                <button
                  type="button"
                  onClick={() => regenerateSlides()}
                  className="text-[11px] font-medium text-pine hover:underline"
                >
                  Restaurar da letra
                </button>
              </div>

              {activeSlide ? (
                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-ink-soft">
                    Editar texto do slide selecionado ({activeSlide.label})
                  </span>
                  <textarea
                    rows={2}
                    value={activeSlide.text}
                    onChange={(event) => handleUpdateActiveSlideText(event.target.value)}
                    className="w-full rounded-[3px] border border-line bg-card p-2 text-xs text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                  />
                </label>
              ) : null}

              <ul className="max-h-56 divide-y divide-line/80 overflow-y-auto border-y border-line/80">
                {slides.map((slide, index) => {
                  const isCurrent = index === activeSlideIndex;
                  return (
                    <li
                      key={slide.id}
                      className={`flex items-center gap-2 px-2 py-2 text-xs ${
                        isCurrent ? "bg-card" : "hover:bg-card/60"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSlideIndex(index)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold text-pine">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="font-semibold text-ink">{slide.label}</span>
                        </div>
                        <p className="truncate text-[11px] text-ink-soft">{slide.text}</p>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveSlide(index, -1)}
                          disabled={index === 0}
                          aria-label="Mover slide para cima"
                          className="h-6 w-6 rounded-[2px] border border-line bg-card text-[11px] disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSlide(index, 1)}
                          disabled={index === slides.length - 1}
                          aria-label="Mover slide para baixo"
                          className="h-6 w-6 rounded-[2px] border border-line bg-card text-[11px] disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSlide(index)}
                          disabled={slides.length <= 1}
                          aria-label="Remover slide"
                          className="h-6 w-6 rounded-[2px] border border-danger/30 bg-card text-[11px] text-danger hover:bg-danger-soft disabled:opacity-30"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </aside>
      </div>

      {/* Modal / Tela Cheia Demonstrativo */}
      {fullscreenOpen && activeSlide ? (
        <div
          ref={fullscreenContainerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Demonstração de slides em tela cheia"
          className={`fixed inset-0 z-[80] flex flex-col justify-between p-6 sm:p-12 select-none ${activeTheme.bgClass}`}
        >
          {/* Barra superior discreta */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`rounded-full border border-current/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest ${activeTheme.accentClass}`}>
                {activeSlide.label}
              </span>
              <span className={`text-sm ${activeTheme.mutedClass}`}>
                {selectedSong?.titulo}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`hidden text-xs sm:inline ${activeTheme.mutedClass}`}>
                Use as setas ← → ou Espaço para avançar · Esc para sair
              </span>
              <button
                type="button"
                onClick={closeFullscreenDemo}
                className="rounded-xl border border-current/25 bg-black/25 px-4 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-black/40"
              >
                Sair da tela cheia (Esc)
              </button>
            </div>
          </div>

          {/* Conteúdo central do slide em tela cheia */}
          <div
            onClick={() =>
              setActiveSlideIndex((prev) =>
                prev < slides.length - 1 ? prev + 1 : prev,
              )
            }
            className={`my-auto mx-auto flex w-full max-w-5xl flex-1 cursor-pointer flex-col justify-center py-8 ${
              align === "center" ? "items-center text-center" : "items-start text-left"
            }`}
          >
            <p
              className={`whitespace-pre-wrap font-lyric leading-tight ${
                activeSlide.kind === "capa"
                  ? "text-4xl font-bold sm:text-6xl md:text-7xl"
                  : activeSlide.kind === "refrao"
                    ? `${activeFontSize.fullscreenClass} italic font-medium`
                    : activeFontSize.fullscreenClass
              }`}
            >
              {activeSlide.text}
            </p>
            {activeSlide.subtitle ? (
              <p className={`mt-5 text-lg sm:text-2xl ${activeTheme.mutedClass}`}>
                {activeSlide.subtitle}
              </p>
            ) : null}
          </div>

          {/* Rodapé e controles de navegação da apresentação */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-current/15 pt-4">
            <div className={`text-xs sm:text-sm ${activeTheme.mutedClass}`}>
              {showFooter ? (
                <span>
                  #{String(selectedSong?.numero || 1).padStart(3, "0")} · {selectedSong?.titulo}
                </span>
              ) : (
                <span>Modo de demonstração em tela cheia</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSlideIndex((prev) => Math.max(prev - 1, 0))}
                disabled={activeSlideIndex <= 0}
                className="h-10 rounded-xl border border-current/25 bg-black/20 px-4 text-xs font-semibold text-white backdrop-blur hover:bg-black/35 disabled:opacity-35"
              >
                ← Anterior
              </button>
              <span className="min-w-20 text-center font-mono text-sm font-semibold">
                {activeSlideIndex + 1} / {slides.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setActiveSlideIndex((prev) => Math.min(prev + 1, Math.max(0, slides.length - 1)))
                }
                disabled={activeSlideIndex >= slides.length - 1}
                className="h-10 rounded-xl border border-current/25 bg-black/20 px-4 text-xs font-semibold text-white backdrop-blur hover:bg-black/35 disabled:opacity-35"
              >
                Próximo →
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FullscreenIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
