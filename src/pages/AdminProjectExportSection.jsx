import { useState } from "react";
import { getAppSettings } from "@/lib/appSettings.js";

const PROJECT_MODES = [
  {
    id: "hospedagem",
    title: "Hospedagem mensal",
    badge: "Nuvem gerenciada",
    subtitle: "Ambiente completo publicado e mantido automaticamente (App + Web).",
    summary:
      "Ideal para bandas, cantores, grupos musicais, produtoras e empresas que desejam utilizar o aplicativo e o painel web imediatamente, sem precisar configurar servidores, domínio ou infraestrutura própria.",
    features: [
      "Publicação imediata do Aplicativo Mobile (PWA instalável) e da Versão Web em endereço dedicado.",
      "Sincronização em tempo real: qualquer música, cifra, arranjo de vozes ou áudio salvo no painel fica disponível na hora para todos os dispositivos.",
      "Armazenamento em nuvem incluso para o catálogo de letras, demonstrações de áudio e ícones personalizados.",
      "Backups automáticos, certificado de segurança (HTTPS/SSL) e atualizações contínuas do sistema.",
    ],
    deliverables:
      "Link web oficial + Aplicativo instalável (Android, iOS e Desktop) + Painel administrativo online.",
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
    deliverables:
      "Pacote compilado (.zip) com App + Web + Banco de músicas e áudios + Instruções de execução.",
  },
];

export default function AdminProjectExportSection({ totalSongs = 0 }) {
  const { appName } = getAppSettings();
  const [selectedMode, setSelectedMode] = useState("hospedagem");
  const currentMode = PROJECT_MODES.find((mode) => mode.id === selectedMode) ?? PROJECT_MODES[0];

  return (
    <div className="mx-auto w-full max-w-5xl divide-y divide-line/80">
      <section className="pb-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-ink">
              Gerar projeto {appName}
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-soft">
              Escolha a modalidade de disponibilização do projeto contendo o{" "}
              <strong className="font-medium text-ink">Aplicativo Mobile</strong> e a{" "}
              <strong className="font-medium text-ink">Versão Web</strong> com as {totalSongs} músicas configuradas.
            </p>
          </div>
          <span className="inline-flex items-center rounded-[3px] border border-line bg-card px-2.5 py-1 text-[11px] font-medium text-ink-soft">
            Entrega · App + Web
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Modos de geração do projeto"
          className="mt-5 grid gap-3 sm:grid-cols-2"
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
                className={`flex flex-col items-start rounded-[3px] border p-4 text-left transition-colors ${
                  active
                    ? "border-pine bg-card"
                    : "border-line bg-card/50 hover:border-ink-soft/40 hover:bg-card"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{mode.title}</span>
                  <span
                    className={`rounded-[2px] px-2 py-0.5 text-[11px] font-medium ${
                      active
                        ? "bg-pine text-white"
                        : "border border-line bg-paper text-ink-soft"
                    }`}
                  >
                    {mode.badge}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">{mode.subtitle}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-5 pt-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-ink">{currentMode.title}</h4>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{currentMode.summary}</p>
          </div>
          <span className="text-xs font-medium text-pine">{currentMode.badge}</span>
        </div>

        <div className="space-y-2">
          <h5 className="text-xs font-medium text-ink-soft">Especificações da modalidade</h5>
          <ul className="divide-y divide-line/70 border-y border-line/80">
            {currentMode.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 py-2.5 text-[13px] text-ink"
              >
                <span aria-hidden className="mt-0.5 text-xs font-bold text-pine">
                  ✓
                </span>
                <span className="leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-l-2 border-pine pl-3.5">
          <p className="text-xs font-medium text-ink-soft">
            Escopo da entrega (App + Web)
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-ink">{currentMode.deliverables}</p>
        </div>
      </section>
    </div>
  );
}
