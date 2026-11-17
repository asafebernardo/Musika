import { splitLyrics } from "@/components/Lyrics.jsx";
import { packChordLines, syncChordLines } from "@/lib/chords.js";
import { buildFullSongLyrics, hasMarkedVoices, packLyrics } from "@/lib/voices.js";

export const emptySongForm = {
  titulo: "",
  banda: "",
  compositor: "",
  album: "",
  anoLancamento: "",
  tema: "",
  adicionais: "",
  audioArquivo: "",
  audioNome: "",
  audioDataUrl: "",
  removeAudio: false,
  letra: "",
  refrao: "",
  cronologica: false,
  refraoPrimeiro: false,
  somenteVozes: false,
  vozesLetra: [],
  vozesRefrao: [],
  letraVozes: "",
  vozesArranjo: [],
  cifraLetra: [],
  cifraRefrao: [],
};

export function fieldsFromSong(song) {
  const embedded = splitLyrics(song.letra || "");
  const storedRefrao = String(song.refrao ?? "").trim();
  const refrao = storedRefrao || embedded.refrao;
  const letra = storedRefrao ? song.letra || "" : embedded.letra;
  const cronologica = Boolean(song.cronologica) && Boolean(refrao);
  const refraoPrimeiro = Boolean(song.refraoPrimeiro) && Boolean(refrao);
  const vozesLetra = Array.isArray(song.vozesLetra) ? song.vozesLetra : [];
  const vozesRefrao = Array.isArray(song.vozesRefrao) ? song.vozesRefrao : [];
  const storedLetraVozes = String(song.letraVozes ?? "").trim();
  const storedVozesArranjo = Array.isArray(song.vozesArranjo) ? song.vozesArranjo : [];
  const hasLegacyVoices = hasMarkedVoices(vozesLetra) || hasMarkedVoices(vozesRefrao);
  const built = hasLegacyVoices
    ? buildFullSongLyrics({
        letra,
        refrao,
        vozesLetra,
        vozesRefrao,
        cronologica,
        refraoPrimeiro,
      })
    : { text: "", marks: [] };
  const letraVozes = storedLetraVozes || built.text;
  const vozesArranjo = storedLetraVozes ? storedVozesArranjo : built.marks;
  const somenteVozes =
    Boolean(song.somenteVozes) && (Boolean(letraVozes) || hasMarkedVoices(vozesArranjo));

  return {
    ...emptySongForm,
    titulo: song.titulo || "",
    banda: song.banda || "",
    compositor: song.compositor || "",
    album: song.album || "",
    anoLancamento: song.anoLancamento || "",
    tema: song.tema || "",
    adicionais: song.adicionais || "",
    audioArquivo: song.audioArquivo || "",
    audioNome: song.audioNome || "",
    letra,
    refrao,
    cronologica,
    refraoPrimeiro,
    somenteVozes,
    vozesLetra,
    vozesRefrao,
    letraVozes,
    vozesArranjo,
    cifraLetra: syncChordLines(letra, song.cifraLetra),
    cifraRefrao: syncChordLines(refrao, song.cifraRefrao),
  };
}

export function payloadFromSongForm(form) {
  const baseLetra = form.letra.trim() ? form.letra : form.letraVozes;
  const letraPack = packLyrics(baseLetra, []);
  const refraoPack = packLyrics(form.refrao, []);
  const vozesPack = packLyrics(form.letraVozes, form.vozesArranjo);
  const hasArranjoVoices = Boolean(vozesPack.text);

  return {
    titulo: form.titulo.trim(),
    banda: String(form.banda ?? "").trim(),
    compositor: String(form.compositor ?? "").trim(),
    album: String(form.album ?? "").trim(),
    anoLancamento: String(form.anoLancamento ?? "").trim(),
    tema: String(form.tema ?? "").trim(),
    adicionais: String(form.adicionais ?? "").trim(),
    audioDataUrl: form.audioDataUrl || undefined,
    audioNome: form.audioNome || undefined,
    removeAudio: Boolean(form.removeAudio),
    letra: letraPack.text,
    refrao: refraoPack.text,
    cronologica: Boolean(form.cronologica) && Boolean(refraoPack.text),
    refraoPrimeiro: Boolean(form.refraoPrimeiro) && Boolean(refraoPack.text),
    somenteVozes: Boolean(form.somenteVozes) && hasArranjoVoices,
    vozesLetra: [],
    vozesRefrao: [],
    letraVozes: hasArranjoVoices ? vozesPack.text : "",
    vozesArranjo: hasArranjoVoices ? vozesPack.marks : [],
    cifraLetra: syncChordLines(letraPack.text, packChordLines(baseLetra, form.cifraLetra)),
    cifraRefrao: syncChordLines(
      refraoPack.text,
      packChordLines(form.refrao, form.cifraRefrao),
    ),
  };
}
