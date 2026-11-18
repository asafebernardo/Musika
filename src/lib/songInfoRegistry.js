import { useCallback, useEffect, useMemo, useState } from "react";

const SONG_INFO_REGISTRY_KEY = "coletanea-song-info-registry";
const SONG_INFO_REGISTRY_EVENT = "coletanea-song-info-registry-changed";

export const DEFAULT_SONG_INFO_REGISTRY = [
  {
    id: "default-info-1",
    compositor: "Banda Horizonte",
    items: [
      {
        id: "default-info-1-item-1",
        banda: "Banda Horizonte",
        album: "Sessão Acústica",
        anoLancamento: "2021",
        adicionais: "Arranjo original acústico em estúdio.",
      },
      {
        id: "default-info-1-item-2",
        banda: "Banda Horizonte",
        album: "Ao Vivo na Turnê",
        anoLancamento: "2024",
        adicionais: "Versão estendida para abertura de show.",
      },
    ],
  },
  {
    id: "default-info-2",
    compositor: "Coletivo Harmonia",
    items: [
      {
        id: "default-info-2-item-1",
        banda: "Grupo Vocal Harmonia",
        album: "Vozes & Acordes",
        anoLancamento: "2020",
        adicionais: "Arranjo vocal a três vozes.",
      },
      {
        id: "default-info-2-item-2",
        banda: "Coletivo Harmonia",
        album: "Ensaio Aberto",
        anoLancamento: "2023",
        adicionais: "",
      },
    ],
  },
  {
    id: "default-info-3",
    compositor: "Lucas Andrade",
    items: [
      {
        id: "default-info-3-item-1",
        banda: "Lucas Andrade & Banda",
        album: "Novos Caminhos",
        anoLancamento: "2019",
        adicionais: "Andamento moderado (92 BPM).",
      },
      {
        id: "default-info-3-item-2",
        banda: "Lucas Andrade (Solo)",
        album: "Voz e Violão",
        anoLancamento: "2022",
        adicionais: "Capotraste na 2ª casa.",
      },
    ],
  },
  {
    id: "default-info-4",
    compositor: "Marina Costa",
    items: [
      {
        id: "default-info-4-item-1",
        banda: "Trio Acústico",
        album: "Noite de Estúdio",
        anoLancamento: "2021",
        adicionais: "",
      },
      {
        id: "default-info-4-item-2",
        banda: "Marina Costa",
        album: "Essência Musical",
        anoLancamento: "2024",
        adicionais: "",
      },
    ],
  },
  {
    id: "default-info-5",
    compositor: "Domínio Público",
    items: [
      {
        id: "default-info-5-item-1",
        banda: "Repertório Clássico",
        album: "Clássicos da Música",
        anoLancamento: "1995",
        adicionais: "Obra tradicional de domínio público.",
      },
    ],
  },
];

function createRegistryId(prefix = "info") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeText(value, maxLen = 200) {
  return String(value ?? "").trim().slice(0, maxLen);
}

function normalizeKey(value) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function sanitizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  const cleaned = rawItems
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const banda = normalizeText(item.banda, 200);
      const album = normalizeText(item.album, 200);
      const anoLancamento = normalizeText(item.anoLancamento, 20);
      const adicionais = normalizeText(item.adicionais, 2000);
      if (!banda && !album && !anoLancamento && !adicionais) return null;
      return {
        id: typeof item.id === "string" && item.id ? item.id : createRegistryId("item"),
        banda,
        album,
        anoLancamento,
        adicionais,
      };
    })
    .filter(Boolean);

  const seen = new Set();
  const deduped = [];
  for (const item of cleaned) {
    const signature = [
      normalizeKey(item.banda),
      normalizeKey(item.album),
      normalizeKey(item.anoLancamento),
      normalizeKey(item.adicionais),
    ].join("|");
    if (!seen.has(signature)) {
      seen.add(signature);
      deduped.push(item);
    }
  }
  return deduped;
}

export function readSongInfoRegistry() {
  try {
    const stored = localStorage.getItem(SONG_INFO_REGISTRY_KEY);
    if (stored == null) {
      const defaults = DEFAULT_SONG_INFO_REGISTRY.map((entry) => ({
        id: entry.id,
        compositor: entry.compositor,
        items: sanitizeItems(entry.items),
      }));
      try {
        localStorage.setItem(SONG_INFO_REGISTRY_KEY, JSON.stringify(defaults));
      } catch {
        /* ignore write error on seed */
      }
      return defaults;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("info_storage_invalid");

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const compositor = normalizeText(entry.compositor, 200);
        if (!compositor) return null;
        return {
          id: typeof entry.id === "string" && entry.id ? entry.id : createRegistryId("comp"),
          compositor,
          items: sanitizeItems(entry.items),
        };
      })
      .filter(Boolean);
  } catch (error) {
    if (error?.message === "info_storage_invalid") throw error;
    throw new Error("info_storage_read");
  }
}

function updateSongInfoRegistry(updater) {
  const current = readSongInfoRegistry();
  const next = updater(current);
  if (next === current) return current;

  try {
    localStorage.setItem(SONG_INFO_REGISTRY_KEY, JSON.stringify(next));
  } catch {
    throw new Error("info_storage_write");
  }
  window.dispatchEvent(new Event(SONG_INFO_REGISTRY_EVENT));
  return next;
}

export function createSongInfoEntry({ compositor, items = [] } = {}) {
  const cleanComposer = normalizeText(compositor, 200);
  if (!cleanComposer) throw new Error("info_composer_required");
  const cleanItems = sanitizeItems(items);
  if (cleanItems.length === 0) throw new Error("info_items_required");

  return updateSongInfoRegistry((entries) => {
    const targetKey = normalizeKey(cleanComposer);
    const existing = entries.find((item) => normalizeKey(item.compositor) === targetKey);
    if (existing) {
      const mergedItems = sanitizeItems([...existing.items, ...cleanItems]);
      return entries.map((item) =>
        item.id === existing.id
          ? { ...item, compositor: cleanComposer, items: mergedItems }
          : item,
      );
    }
    return [
      ...entries,
      {
        id: createRegistryId("comp"),
        compositor: cleanComposer,
        items: cleanItems,
      },
    ];
  });
}

export function updateSongInfoEntry(entryId, { compositor, items = [] } = {}) {
  const cleanComposer = normalizeText(compositor, 200);
  if (!cleanComposer) throw new Error("info_composer_required");
  const cleanItems = sanitizeItems(items);
  if (cleanItems.length === 0) throw new Error("info_items_required");

  return updateSongInfoRegistry((entries) => {
    const target = entries.find((item) => item.id === entryId);
    if (!target) throw new Error("info_not_found");
    const targetKey = normalizeKey(cleanComposer);
    if (
      entries.some(
        (item) => item.id !== entryId && normalizeKey(item.compositor) === targetKey,
      )
    ) {
      throw new Error("info_composer_duplicate");
    }
    return entries.map((item) =>
      item.id === entryId
        ? {
            ...item,
            compositor: cleanComposer,
            items: cleanItems,
          }
        : item,
    );
  });
}

export function deleteSongInfoEntry(entryId) {
  return updateSongInfoRegistry((entries) => {
    if (!entries.some((item) => item.id === entryId)) throw new Error("info_not_found");
    return entries.filter((item) => item.id !== entryId);
  });
}

export function songInfoErrorMessage(error) {
  switch (error?.message) {
    case "info_composer_required":
      return "Informe o Autor / Compositor / Banda principal.";
    case "info_items_required":
      return "Informe ao menos um vínculo (álbum, ano de lançamento, banda ou observação).";
    case "info_composer_duplicate":
      return "Já existe outro cadastro para este Autor / Compositor.";
    case "info_not_found":
      return "Este cadastro de informações não foi encontrado.";
    case "info_storage_invalid":
    case "info_storage_read":
      return "Não foi possível carregar os cadastros de informações salvos.";
    case "info_storage_write":
      return "Não foi possível salvar os cadastros de informações.";
    default:
      return "Não foi possível atualizar o cadastro de informações.";
  }
}

export function mergeSongsIntoInfoRegistry(entries = [], songs = []) {
  const byComposer = new Map();

  for (const entry of entries) {
    const key = normalizeKey(entry.compositor);
    if (!key) continue;
    byComposer.set(key, {
      id: entry.id,
      compositor: entry.compositor,
      items: [...(entry.items || [])],
    });
  }

  for (const song of songs) {
    const compositor = normalizeText(song?.compositor || song?.banda, 200);
    if (!compositor) continue;
    const key = normalizeKey(compositor);
    const songItem = {
      id: `song-${song.id}`,
      banda: normalizeText(song?.banda, 200),
      album: normalizeText(song?.album, 200),
      anoLancamento: normalizeText(song?.anoLancamento, 20),
      adicionais: normalizeText(song?.adicionais, 2000),
    };
    const existing = byComposer.get(key);
    if (existing) {
      existing.items = sanitizeItems([...existing.items, songItem]);
    } else {
      byComposer.set(key, {
        id: `catalog-${song.id}`,
        compositor,
        items: sanitizeItems([songItem]),
      });
    }
  }

  return [...byComposer.values()].sort((a, b) =>
    a.compositor.localeCompare(b.compositor, "pt-BR"),
  );
}

function uniqueSorted(values) {
  return [...new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { numeric: true }),
  );
}

export function getRelatedSongInfoOptions(entries = [], selectedCompositor = "", selectedAlbum = "") {
  const composers = uniqueSorted(entries.map((entry) => entry.compositor));
  const cleanComposerKey = normalizeKey(selectedCompositor);
  if (!cleanComposerKey) {
    return {
      composers,
      hasSelectedComposer: false,
      matchedEntry: null,
      matchedItems: [],
      bands: [],
      albums: [],
      years: [],
      additionalNotes: [],
    };
  }

  const matchedEntry =
    entries.find((entry) => normalizeKey(entry.compositor) === cleanComposerKey) || null;
  const matchedItems = matchedEntry?.items || [];

  const cleanAlbumKey = normalizeKey(selectedAlbum);
  const albumFilteredItems = cleanAlbumKey
    ? matchedItems.filter((item) => normalizeKey(item.album) === cleanAlbumKey)
    : [];

  const bands = uniqueSorted(matchedItems.map((item) => item.banda));
  const albums = uniqueSorted(matchedItems.map((item) => item.album));
  const yearsForAlbum = uniqueSorted(albumFilteredItems.map((item) => item.anoLancamento));
  const allComposerYears = uniqueSorted(matchedItems.map((item) => item.anoLancamento));
  const years = yearsForAlbum.length > 0 ? yearsForAlbum : allComposerYears;

  const notesForAlbum = uniqueSorted(albumFilteredItems.map((item) => item.adicionais));
  const allComposerNotes = uniqueSorted(matchedItems.map((item) => item.adicionais));
  const additionalNotes = notesForAlbum.length > 0 ? notesForAlbum : allComposerNotes;

  return {
    composers,
    hasSelectedComposer: true,
    matchedEntry,
    matchedItems,
    bands,
    albums,
    years,
    additionalNotes,
  };
}

export function buildUpdatesForComposerSelection(entries = [], nextCompositor = "", currentForm = {}) {
  const cleanComposer = String(nextCompositor ?? "").trim();
  if (!cleanComposer) {
    return {
      compositor: "",
      banda: "",
      album: "",
      anoLancamento: "",
      adicionais: "",
    };
  }

  const related = getRelatedSongInfoOptions(entries, cleanComposer, "");
  const nextBanda =
    related.bands.length === 1
      ? related.bands[0]
      : related.bands.includes(currentForm.banda)
        ? currentForm.banda
        : "";
  const nextAlbum =
    related.albums.length === 1
      ? related.albums[0]
      : related.albums.includes(currentForm.album)
        ? currentForm.album
        : "";

  const relatedWithAlbum = getRelatedSongInfoOptions(entries, cleanComposer, nextAlbum);
  const nextAno =
    relatedWithAlbum.years.length === 1
      ? relatedWithAlbum.years[0]
      : relatedWithAlbum.years.includes(currentForm.anoLancamento)
        ? currentForm.anoLancamento
        : "";
  const nextAdicionais =
    relatedWithAlbum.additionalNotes.length === 1
      ? relatedWithAlbum.additionalNotes[0]
      : relatedWithAlbum.additionalNotes.includes(currentForm.adicionais)
        ? currentForm.adicionais
        : "";

  return {
    compositor: cleanComposer,
    banda: nextBanda,
    album: nextAlbum,
    anoLancamento: nextAno,
    adicionais: nextAdicionais,
  };
}

export function buildUpdatesForAlbumSelection(
  entries = [],
  currentCompositor = "",
  nextAlbum = "",
  currentForm = {},
) {
  const cleanAlbum = String(nextAlbum ?? "").trim();
  const related = getRelatedSongInfoOptions(entries, currentCompositor, cleanAlbum);
  const albumMatchedItems = cleanAlbum
    ? related.matchedItems.filter((item) => normalizeKey(item.album) === normalizeKey(cleanAlbum))
    : [];

  const albumBands = uniqueSorted(albumMatchedItems.map((item) => item.banda));
  const nextBanda =
    albumBands.length === 1
      ? albumBands[0]
      : currentForm.banda && related.bands.includes(currentForm.banda)
        ? currentForm.banda
        : related.bands.length === 1
          ? related.bands[0]
          : "";

  const nextAno =
    related.years.length === 1
      ? related.years[0]
      : related.years.includes(currentForm.anoLancamento)
        ? currentForm.anoLancamento
        : "";

  const nextAdicionais =
    related.additionalNotes.length === 1
      ? related.additionalNotes[0]
      : related.additionalNotes.includes(currentForm.adicionais)
        ? currentForm.adicionais
        : currentForm.adicionais || "";

  return {
    album: cleanAlbum,
    banda: nextBanda,
    anoLancamento: nextAno,
    adicionais: nextAdicionais,
  };
}

export function useSongInfoRegistry(songs = []) {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(() => {
    try {
      setEntries(readSongInfoRegistry());
      setError("");
    } catch (loadError) {
      setEntries([]);
      setError(songInfoErrorMessage(loadError));
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(SONG_INFO_REGISTRY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SONG_INFO_REGISTRY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const runUpdate = useCallback((update) => {
    try {
      setEntries(update());
      setError("");
      return true;
    } catch (updateError) {
      setError(songInfoErrorMessage(updateError));
      return false;
    }
  }, []);

  const createEntry = useCallback(
    (payload) => runUpdate(() => createSongInfoEntry(payload)),
    [runUpdate],
  );
  const updateEntry = useCallback(
    (entryId, payload) => runUpdate(() => updateSongInfoEntry(entryId, payload)),
    [runUpdate],
  );
  const deleteEntry = useCallback(
    (entryId) => runUpdate(() => deleteSongInfoEntry(entryId)),
    [runUpdate],
  );

  const mergedEntries = useMemo(
    () => mergeSongsIntoInfoRegistry(entries, songs),
    [entries, songs],
  );

  return {
    entries,
    mergedEntries,
    error,
    isReady,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
