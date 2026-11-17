import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.jsx";
import { getAppIconImage, getAppSettings } from "@/lib/appSettings.js";
import { useTheme } from "@/lib/theme.js";

export default function UserDashboardPage({ user }) {
  const { logout, deleteAccount } = useAuth();
  const settings = getAppSettings();
  const { appName } = settings;
  const theme = useTheme();
  const appIconImage =
    getAppIconImage(settings, theme) || `${import.meta.env.BASE_URL || "/"}icon.png`;
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const signOut = async () => {
    setError("");
    try {
      await logout();
      navigate("/", { replace: true });
    } catch {
      setError("Não foi possível encerrar a sessão. Tente novamente.");
    }
  };

  const removeAccount = async () => {
    const confirmed = window.confirm(
      `Excluir permanentemente a conta ${user.email}? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      await deleteAccount();
      window.location.replace("/");
    } catch (deleteError) {
      setError(
        deleteError?.message === "ultimo_administrador"
          ? "A última conta administradora não pode ser excluída."
          : "Não foi possível excluir sua conta. Tente novamente.",
      );
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
          <Link to="/" className="text-lg font-bold tracking-tight text-pine">
            {appName}
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex h-10 items-center rounded-full border border-line px-5 text-sm font-medium hover:bg-paper"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">
            Painel da conta
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Olá, {user.name}.
          </h1>
          <p className="mt-2 text-base leading-7 text-ink-soft">
            Este é o seu espaço no {appName}. Acesse o aplicativo quando quiser consultar letras,
            cifras e suas músicas favoritas.
          </p>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pine/10 text-pine">
              {appIconImage ? (
                <img src={appIconImage} alt="" className="h-12 w-12 rounded-2xl object-contain" />
              ) : (
                <MusicIcon />
              )}
            </div>
            <h2 className="mt-5 text-xl font-semibold">Aplicativo {appName}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft">
              O catálogo fica em uma área separada deste painel. Entre no app para encontrar músicas,
              abrir cifras e organizar seus favoritos.
            </p>
            <Link
              to="/app"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-pine px-6 text-sm font-semibold text-white hover:bg-pine-dark"
            >
              Abrir aplicativo
            </Link>
          </div>

          <div className="rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Sua conta
            </p>
            <p className="mt-5 text-lg font-semibold">{user.name}</p>
            <p className="mt-1 break-all text-sm text-ink-soft">{user.email}</p>
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-sm leading-6 text-ink-soft">
                Para alterar seu acesso, fale com um administrador do {appName}.
              </p>
            </div>
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-sm font-semibold text-danger">Excluir minha conta</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                Sua conta e sua sessão serão removidas permanentemente.
              </p>
              <button
                type="button"
                onClick={removeAccount}
                disabled={deleting}
                className="mt-3 h-10 rounded-full border border-danger/30 px-4 text-sm font-medium text-danger hover:bg-danger-soft disabled:opacity-60"
              >
                {deleting ? "Excluindo…" : "Excluir minha conta"}
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}

function MusicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-6 w-6"
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
