import { useState } from "react";
import LyricEditor from "@/components/LyricEditor.jsx";
import { buildFullSongLyrics, hasMarkedVoices } from "@/lib/voices.js";

export default function VocalArrangementEditor({
  text,
  marks,
  letra,
  refrao,
  cronologica,
  refraoPrimeiro,
  somenteVozes = false,
  onChange,
  onSomenteVozesChange,
}) {
  const [startedEditing, setStartedEditing] = useState(false);
  const initialText = buildFullSongLyrics({ letra, refrao, cronologica, refraoPrimeiro }).text;
  const editorText = startedEditing || String(text ?? "").trim() ? text : initialText;
  const hasVoicesContent = Boolean(String(editorText ?? "").trim()) || hasMarkedVoices(marks);

  return (
    <div className="space-y-4" role="region" aria-label="Divisão de vozes">
      <div className="space-y-1.5">
        <p className="text-[12px] font-semibold text-ink">
          Divisão de vozes na música completa
        </p>
        <LyricEditor
          label="Música completa com divisão de vozes"
          text={editorText}
          marks={marks}
          placeholder="Cadastre a letra para marcar os trechos de cada voz"
          minClass="min-h-60"
          showVoiceTools
          onChange={(value) => {
            setStartedEditing(true);
            onChange(value);
          }}
          editorClassName="rounded-[3px] border border-line bg-card px-3.5 py-2.5 text-left font-sans text-[13px] leading-relaxed focus:border-pine focus:ring-1 focus:ring-pine"
        />
      </div>

      {hasVoicesContent ? (
        <label className="flex items-start gap-2.5 border-t border-line/80 pt-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded-[2px] accent-pine"
            checked={Boolean(somenteVozes)}
            onChange={(event) => {
              if (!String(text ?? "").trim() && editorText) {
                setStartedEditing(true);
                onChange({ text: editorText, marks });
              }
              onSomenteVozesChange?.(event.target.checked);
            }}
          />
          <span>
            <span className="block text-[13px] font-medium text-ink">Somente vozes</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-soft">
              Habilita apenas o modo Vozes nesta música e bloqueia o botão Letra na leitura.
            </span>
          </span>
        </label>
      ) : null}
    </div>
  );
}
