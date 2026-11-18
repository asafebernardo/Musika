export const DEFAULT_THEMES = [
  {
    label: "Abertura / Início",
    description: "Músicas ideais para abrir shows, apresentações e eventos.",
  },
  {
    label: "Acústico & Voz",
    description: "Arranjos intimistas focados em voz, violão ou piano.",
  },
  {
    label: "Animadas / Upbeat",
    description: "Repertório vibrante e energético para envolver o público.",
  },
  {
    label: "Baladas & Lento",
    description: "Canções suaves, melódicas e de andamento calmo.",
  },
  {
    label: "Clássicos & Sucessos",
    description: "Músicas consagradas e mais pedidas do repertório.",
  },
  {
    label: "Ensaio & Passagem de Som",
    description: "Seleção preparada para aquecimento, estudo e passagem de som.",
  },
  {
    label: "Encerramento",
    description: "Canções marcantes para finalizar a apresentação ou show.",
  },
  {
    label: "Especial / Evento",
    description: "Repertório selecionado para ocasiões e projetos especiais.",
  },
  {
    label: "Vocal & Harmonia",
    description: "Músicas com foco em arranjos vocais e divisão de vozes.",
  },
];

export const THEME_DESCRIPTIONS = new Map(
  DEFAULT_THEMES.map((item) => [item.label.toLowerCase(), item.description]),
);
