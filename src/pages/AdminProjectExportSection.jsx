import { useState } from "react";
import { getAppSettings } from "@/lib/appSettings.js";

const PROJECT_MODES = [
  {
    id: "hospedagem",
    title: "Hospedagem mensal",
    badge: "Nuvem gerenciada",
    subtitle: "Ambiente completo publicado e mantido automaticamente (App + Web).",
    summary:
      "Ideal para igrejas, ministérios e grupos que desejam utilizar o aplicativo e o painel web imediatamente, sem precisar configurar servidores, domínio ou infraestrutura própria.",
    features: [
      "Publicação imediata do Aplicativo Mobile (PWA instalável) e da Versão Web em endereço dedicado.",
      "Sincronização em tempo real: qualquer música, cifra, arranjo de vozes ou áudio salvo no painel fica disponível na hora para todos os dispositivos.",
      "Armazenamento em nuvem incluso para o catálogo de letras, demonstrações de áudio e ícones personalizados.",
      "Backups automáticos, certificado de segurança (HTTPS/SSL) e atualizações contínuas do sistema.",
    ],
    deliverables: "Link web oficial + Aplicativo instalável (Android, iOS e Desktop) + Painel administrativo online.",
  },
  {
    id: "arquivo-bruto",
    title: "Compilar arquivo bruto",
    badge: "Pacote independente",
    subtitle: "Exportação dos arquivos compilados do projeto (App + Web) para uso e hospedagem própria.",
    summary:
      "Ideal para quem possui servidor próprio, hospedagem contratada ou deseja guardar o pacote fechado do projeto contendo o aplicativo, a interface web e toda a base de músicas configurada.",
    features: [
      "Geração de um pacote único com os arquivos compilados de produção (front-end App + Web e API Node.js).",
      "Inclui o catálogo atualizado (songs.json), arquivos de áudio de demonstração e configurações de identidade visual (app-settings.json).",
      "Pronto para execução em servidor próprio, VPS, rede local ou containers sem dependência externa.",
      "Controle total sobre os arquivos brutos do projeto para arquivamento ou implantação manual.",
    ],
    deliverables: "Pacote compilado (.zip) com App + Web + Banco de músicas e áudios + Instruções de execução.",
  },
];

export default function AdminProjectExportSection({ totalSongs = 0 }) {
  const { appName } = getAppSettings();
  const [selectedMode, setSelectedMode] = useState("hospedagem");
  const currentMode = PROJECT_MODES.find((mode) => mode.id === selectedMode) ?? PROJECT_MODES[0];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pine">
              Entrega do projeto · App + Web
            </p>
            <h3 className="mt-1 text-xl font-semibold">
              Gerar projeto {appName}
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
              Escolha como disponibilizar o projeto completo contendo o <strong>Aplicativo Mobile</strong> e a{" "}
              <strong>Versão Web</strong> com as {totalSongs} músicas e personalizações configuradas no estúdio.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-pine/25 bg-pine/5 px-3 py-1 text-xs font-medium text-pine">
            Somente descrição informativa
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Modos de geração do projeto"
          className="mt-6 grid gap-3 sm:grid-cols-2"
        >
          {PROJECT_MODES.map((mode) => {
            const active = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedMode(mode.id)}
                className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-pine bg-pine/5 ring-2 ring-pine/25"
                    : "border-line bg-paper hover:bg-card"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-base font-semibold text-ink">{mode.title}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      active ? "bg-pine text-white" : "bg-card text-ink-soft"
                    }`}
                  >
                    {mode.badge}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{mode.subtitle}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-pine">
              Modo selecionado
            </span>
            <h4 className="mt-0.5 text-lg font-semibold text-ink">{currentMode.title}</h4>
          </div>
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink-soft">
            {currentMode.badge}
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink">{currentMode.summary}</p>

        <div className="mt-5 space-y-2.5">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Como funciona este modo
          </h5>
          <ul className="space-y-2.5">
            {currentMode.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pine/15 text-xs font-bold text-pine"
                >
                  ✓
                </span>
                <span className="leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded-xl border border-line bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            O que compõe a entrega (App + Web)
          </p>
          <p className="mt-1 text-sm font-medium text-ink">{currentMode.deliverables}</p>
        </div>

        <p className="mt-4 text-xs text-ink-soft">
          Nota: Esta seção apresenta a descrição das modalidades de disponibilização do projeto ({PROJECT_MODES[0].title} | {PROJECT_MODES[1].title}).
        </p>
      </section>
    </div>
  );
}
