import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import UserProfileMenu from "@/components/UserProfileMenu.jsx";
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
  const [openProfileSection, setOpenProfileSection] = useState(null);

  const fullName = [user.name, user.lastName].filter(Boolean).join(" ").trim();
  const initials =
    [user.name, user.lastName]
      .filter(Boolean)
      .map((part) => part.trim().slice(0, 1).toUpperCase())
      .join("")
      .slice(0, 2) || "U";

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
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <Link to="/" className="text-lg font-bold tracking-tight text-pine">
            {appName}
          </Link>
          <UserProfileMenu
            user={user}
            onLogout={signOut}
            externalOpenSection={openProfileSection}
            onExternalSectionHandled={() => setOpenProfileSection(null)}
          />
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">
            Painel da conta
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Olá, {fullName}.
          </h1>
          <p className="mt-2 text-base leading-7 text-ink-soft">
            Este é o seu espaço no {appName}. Acesse o aplicativo quando quiser consultar letras,
            cifras e suas músicas favoritas, ou gerencie seu perfil, plano e faturas no menu superior.
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

            <div className="mt-8 border-t border-line pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Atalhos de configuração da conta
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { id: "perfil", label: "Meu Perfil e Foto" },
                  { id: "plano", label: "Plano Pago Atual" },
                  { id: "faturas", label: "Faturas e Recibos" },
                  { id: "dados-pagamento", label: "Dados de Pagamento" },
                  { id: "forma-pagamento", label: "Forma de Pagamento" },
                ].map((shortcut) => (
                  <button
                    key={shortcut.id}
                    type="button"
                    onClick={() => setOpenProfileSection(shortcut.id)}
                    className="inline-flex h-9 items-center rounded-full border border-line bg-paper px-3.5 text-xs font-semibold text-ink transition-colors hover:border-pine hover:text-pine"
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Sua conta
            </p>
            <div className="mt-4 flex items-center gap-3.5">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={fullName}
                  className="h-14 w-14 shrink-0 rounded-full border border-line object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pine text-lg font-bold text-white">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{fullName}</p>
                <p className="mt-0.5 break-all text-sm text-ink-soft">{user.email}</p>
                {user.phone ? (
                  <p className="mt-0.5 text-xs text-ink-soft">Contato: {user.phone}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setOpenProfileSection("perfil")}
                className="inline-flex h-9 items-center rounded-full border border-line bg-paper px-4 text-xs font-semibold text-ink hover:bg-card"
              >
                Configurar meu usuário e assinatura
              </button>
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
