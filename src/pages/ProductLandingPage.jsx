import { Link } from "react-router-dom";
import { getAppSettings } from "@/lib/appSettings.js";
import { getAdminUrl } from "@/lib/sites.js";

const FEATURES = [
  {
    number: "01",
    title: "Letras organizadas",
    description: "Encontre músicas pelo título, número ou por um trecho da letra.",
  },
  {
    number: "02",
    title: "Cifras no seu tom",
    description: "Consulte acordes e transponha a tonalidade para acompanhar o louvor.",
  },
  {
    number: "03",
    title: "Acesso onde estiver",
    description: "Salve favoritas e use o app no celular ou no computador.",
  },
];

export default function ProductLandingPage({ user }) {
  const { appName, appLogoDataUrl } = getAppSettings();
  const logoSrc = appLogoDataUrl || `${import.meta.env.BASE_URL || "/"}logo.jfif`;

  return (
    <main className="min-h-dvh overflow-hidden bg-card text-ink">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
        <Link to="/" className="inline-flex items-center gap-3" aria-label={`${appName}, página inicial`}>
          <img src={logoSrc} alt="" className="h-10 w-10 rounded-full object-cover" />
          <span className="text-lg font-bold tracking-tight">{appName}</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Acesso à conta">
          {user ? (
            user.role === "admin" ? (
              <a
                href={getAdminUrl()}
                className="inline-flex h-10 items-center rounded-full bg-pine px-5 text-sm font-semibold text-white hover:bg-pine-dark"
              >
                Painel administrativo
              </a>
            ) : (
              <Link
                to="/conta"
                className="inline-flex h-10 items-center rounded-full bg-pine px-5 text-sm font-semibold text-white hover:bg-pine-dark"
              >
                Meu painel
              </Link>
            )
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-ink hover:bg-paper"
              >
                Entrar
              </Link>
              <Link
                to="/cadastro"
                className="inline-flex h-10 items-center rounded-full bg-pine px-5 text-sm font-semibold text-white hover:bg-pine-dark"
              >
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative isolate">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_22%,rgb(var(--pine)/0.12),transparent_38%),linear-gradient(to_bottom,rgb(var(--paper)/0.4),transparent)]"
        />
        <div className="mx-auto grid min-h-[min(680px,78dvh)] w-full max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-pine/20 bg-pine/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-pine">
              <span className="h-1.5 w-1.5 rounded-full bg-pine" />
              Letras e cifras para louvor
            </p>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.04] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              A música que une.
              <span className="mt-2 block text-pine">O louvor que inspira.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">
              Consulte letras, cifras e demonstrações em um só lugar. Encontre sua próxima música
              e prepare cada momento de louvor com o {appName}.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {user ? (
                user.role === "admin" ? (
                  <a
                    href={getAdminUrl()}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-pine px-7 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pine-dark"
                  >
                    Ir para administração
                  </a>
                ) : (
                  <Link
                    to="/conta"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-pine px-7 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pine-dark"
                  >
                    Acessar meu painel
                  </Link>
                )
              ) : (
                <>
                  <Link
                    to="/cadastro"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-pine px-7 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pine-dark"
                  >
                    Criar minha conta
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-card px-7 text-sm font-semibold text-ink transition-colors hover:bg-paper"
                  >
                    Já tenho uma conta
                  </Link>
                </>
              )}
            </div>
            {!user ? (
              <p className="mt-4 text-xs text-ink-soft">
                Cadastro gratuito. Sua conta dá acesso ao catálogo do aplicativo.
              </p>
            ) : null}
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div
              aria-hidden
              className="absolute -inset-5 rounded-[2.5rem] bg-pine/5 blur-2xl sm:-inset-8"
            />
            <div className="relative overflow-hidden rounded-[2rem] border border-line bg-card p-5 shadow-[0_30px_90px_-40px_rgba(20,45,33,0.38)] sm:p-8">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <img src={logoSrc} alt="" className="h-11 w-11 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-bold text-ink">{appName}</p>
                    <p className="text-xs text-ink-soft">Catálogo de louvores</p>
                  </div>
                </div>
                <span className="rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                  Letras & cifras
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                    Explore o catálogo
                  </p>
                  <p className="mt-1 text-lg font-semibold text-ink">Uma canção para cada momento</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine text-white">
                  <MusicIcon />
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  ["001", "A Alegria Está no Coração", "Tom: G"],
                  ["002", "Aclame ao Senhor", "Tom: D"],
                  ["003", "Alvo Mais que a Neve", "Tom: C"],
                ].map(([number, title, key]) => (
                  <div
                    key={number}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-paper/60 p-3.5"
                  >
                    <span className="font-mono text-xs font-semibold tabular-nums text-pine">
                      {number}
                    </span>
                    <span aria-hidden className="h-8 w-px bg-line" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                      {title}
                    </span>
                    <span className="rounded-lg bg-card px-2 py-1 text-xs font-medium text-ink-soft">
                      {key}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-pine/5 p-4">
                  <p className="text-xs font-medium text-ink-soft">Sua coleção</p>
                  <p className="mt-1 text-sm font-semibold text-ink">Músicas favoritas</p>
                </div>
                <div className="rounded-2xl bg-pine/5 p-4">
                  <p className="text-xs font-medium text-ink-soft">Acompanhamento</p>
                  <p className="mt-1 text-sm font-semibold text-ink">Cifras transponíveis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper/45">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">
              Feito para acompanhar
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Tudo para o seu momento de louvor.
            </h2>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.number}
                className="rounded-2xl border border-line bg-card p-6 sm:p-7"
              >
                <p className="font-mono text-sm font-semibold text-pine">{feature.number}</p>
                <h3 className="mt-5 text-lg font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p>{appName} — letras e cifras para louvor.</p>
          {!user ? (
            <div className="flex gap-4">
              <Link to="/login" className="font-medium hover:text-ink">Entrar</Link>
              <Link to="/cadastro" className="font-medium hover:text-ink">Criar conta</Link>
            </div>
          ) : user.role === "admin" ? (
            <a href={getAdminUrl()} className="font-medium hover:text-ink">Painel administrativo</a>
          ) : null}
        </div>
      </footer>
    </main>
  );
}

function MusicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
