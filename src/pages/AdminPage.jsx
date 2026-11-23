import { useEffect, useState } from "react";
import { request } from "@/api/songs.js";
import { useAuth } from "@/lib/auth.jsx";
import { getAppUrl } from "@/lib/sites.js";
import { getAppSettings } from "@/lib/appSettings.js";
import { toggleTheme, useTheme } from "@/lib/theme.js";
import AdminContentPage from "@/pages/AdminContentPage.jsx";

const emptyAccessForm = { name: "", email: "", password: "", setupToken: "" };

export default function AdminPage() {
  const { user, loading: authLoading, available, login, setupAdmin, logout, deleteAccount } = useAuth();
  const { appName } = getAppSettings();
  const panelTheme = useTheme();
  const isPanelDark = panelTheme === "dark";
  const [setupRequired, setSetupRequired] = useState(null);
  const [setupError, setSetupError] = useState("");
  const [form, setForm] = useState(emptyAccessForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState("");

  useEffect(() => {
    let active = true;
    request("/api/auth/status")
      .then((status) => {
        if (active) setSetupRequired(status.setupRequired);
      })
      .catch(() => {
        if (active) setSetupError("Não foi possível conectar à API de administração.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user || user.role !== "admin") return undefined;
    let active = true;
    setPeopleLoading(true);
    setPeopleError("");
    request("/api/admin/users")
      .then((registeredPeople) => {
        if (!active) return;
        setPeople(registeredPeople);
      })
      .catch(() => {
        if (active) setPeopleError("Não foi possível carregar os dados de gerenciamento.");
      })
      .finally(() => {
        if (active) setPeopleLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submitAccess = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      if (setupRequired) {
        await setupAdmin(form);
        setSetupRequired(false);
        setForm(emptyAccessForm);
      } else {
        await login({ email: form.email, password: form.password });
        setForm(emptyAccessForm);
      }
    } catch (error) {
      setFormError(messageForAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteOwnAccount = async () => {
    if (!window.confirm("Excluir permanentemente sua conta de administrador?")) return;
    setFormError("");
    try {
      await deleteAccount();
      window.location.replace(getAppUrl());
    } catch (error) {
      setFormError(messageForAuthError(error));
    }
  };

  const signOut = async () => {
    setLogoutError("");
    try {
      await logout();
    } catch {
      setLogoutError("Não foi possível encerrar a sessão. Tente novamente.");
    }
  };

  const showSetup = setupRequired === true;
  const showRegistration = showSetup;
  const accessPanel = (
    <section className="mx-auto w-full max-w-7xl">
      <div className="border-b border-line/80 pb-4">
        <h2 className="text-sm font-semibold text-ink">Equipe & Acessos</h2>
        <p className="mt-1 text-xs text-ink-soft">
          Lista somente para administradores. O painel não cadastra nem remove outras contas.
        </p>
      </div>
      {peopleLoading ? (
        <p className="py-6 text-sm text-ink-soft">Carregando pessoas…</p>
      ) : people.length ? (
        <ul className="divide-y divide-line/80 border-b border-line/80">
          {people.map((person) => {
            const personFullName = [person.name, person.lastName].filter(Boolean).join(" ").trim();
            return (
              <li key={person.id} className="flex items-center gap-4 py-3">
                {person.avatarUrl ? (
                  <img
                    src={person.avatarUrl}
                    alt={personFullName}
                    className="h-8 w-8 shrink-0 rounded-[3px] border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-line bg-card text-xs font-semibold text-ink">
                    {person.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{personFullName}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {person.email}
                    {person.phone ? ` · ${person.phone}` : ""}
                  </p>
                </div>
                <span className="hidden rounded-[3px] border border-line bg-card px-2 py-0.5 text-[11px] font-medium text-ink-soft sm:inline-flex">
                  {person.role === "admin" ? "Administrador" : "Membro"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-sm text-ink-soft">Nenhuma pessoa cadastrada.</p>
      )}
      {peopleError ? (
        <p role="alert" className="py-4 text-sm text-danger">
          {peopleError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
        <div>
          <p className="text-sm font-medium text-ink">Excluir sua conta</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            A exclusão encerra sua sessão. A última conta administradora não pode ser excluída.
          </p>
          {formError ? <p role="alert" className="mt-2 text-sm text-danger">{formError}</p> : null}
        </div>
        <button
          type="button"
          onClick={deleteOwnAccount}
          className="h-8.5 rounded-[3px] border border-danger/30 bg-card px-3.5 text-xs font-medium text-danger hover:bg-danger-soft"
        >
          Excluir minha conta
        </button>
      </div>
    </section>
  );

  if (user?.role === "admin") {
    return (
      <div className="admin-studio-shell h-full w-full bg-paper text-ink">
        <AdminContentPage
          user={user}
          onLogout={signOut}
          logoutError={logoutError}
          accessPanel={accessPanel}
        />
      </div>
    );
  }

  return (
    <div className="admin-studio-shell flex h-full min-h-0 flex-1 flex-col bg-paper text-ink">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-card px-4 text-ink sm:px-8">
        <a
          href={getAppUrl()}
          aria-label={`Abrir ${appName}`}
          className="-ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-paper text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
        >
          <span aria-hidden className="text-lg leading-none">‹</span>
        </a>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">{appName}</p>
          <h1 className="truncate text-base font-semibold leading-tight text-ink">
            {user?.role === "admin" ? "Painel de administração" : "Acesso administrativo"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => toggleTheme({ force: true })}
          aria-label={isPanelDark ? "Alternar painel para modo claro" : "Alternar painel para modo escuro"}
          title={isPanelDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-line bg-paper px-3 text-xs font-medium text-ink-soft transition-colors hover:border-ink-soft/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
        >
          <span>{isPanelDark ? "☀ Claro" : "☾ Escuro"}</span>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">
        {authLoading || (setupRequired === null && !setupError && available) ? (
          <p className="py-12 text-center text-sm text-ink-soft">Carregando…</p>
        ) : !available ? (
          <p role="alert" className="rounded-lg border border-line bg-card p-4 text-sm text-danger">
            A autenticação precisa da API Node.js. Inicie o servidor e tente novamente.
          </p>
        ) : user ? (
            <section className="mx-auto w-full max-w-screen-lg rounded-lg border border-line bg-card p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-wide text-danger">Acesso restrito</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{user.name}</h2>
              <p className="text-sm text-ink-soft">
                Somente administradores podem acessar este site.
              </p>
              <a
                href={`${getAppUrl()}/conta`}
                className="mt-4 inline-flex h-9 items-center rounded-md bg-pine px-4 text-sm font-semibold text-white hover:bg-pine-dark"
              >
                Ir para meu painel
              </a>
              <button
                type="button"
                onClick={signOut}
                className="ml-2 mt-4 h-9 rounded-md border border-line bg-paper px-3 text-sm font-medium hover:bg-card"
              >
                Sair
              </button>
              {logoutError ? <p role="alert" className="mt-3 text-sm text-danger">{logoutError}</p> : null}
            </section>
        ) : setupError ? (
          <p role="alert" className="rounded-lg border border-line bg-card p-4 text-sm text-danger">
            {setupError}
          </p>
        ) : (
          <section className="mx-auto w-full max-w-md space-y-5 rounded-lg border border-line bg-card p-6 sm:p-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                {showSetup ? "Configuração inicial" : "Credenciais do estúdio"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink">
                {showSetup ? "Criar administrador" : showRegistration ? "Cadastrar administrador" : "Entrar no painel"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft sm:text-sm">
                {showSetup
                  ? "Cadastre a primeira conta para proteger o painel e gerenciar os acessos."
                  : "Entre com o e-mail e a senha cadastrados pelo administrador."}
              </p>
            </div>

            <form onSubmit={submitAccess} className="space-y-3.5">
              {showRegistration ? (
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-ink-soft">Nome</span>
                  <input
                    autoComplete="name"
                    className="h-10 w-full rounded-md border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                    value={form.name}
                    onChange={updateForm("name")}
                    maxLength={80}
                    required
                  />
                </label>
              ) : null}
              {showRegistration && import.meta.env.PROD ? (
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-ink-soft">Chave de configuração</span>
                  <input
                    type="password"
                    autoComplete="off"
                    className="h-10 w-full rounded-md border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                    value={form.setupToken}
                    onChange={updateForm("setupToken")}
                    required
                  />
                </label>
              ) : null}
              <label className="block space-y-1">
                <span className="text-xs font-medium text-ink-soft">E-mail</span>
                <input
                  type="email"
                  autoComplete="username"
                  className="h-10 w-full rounded-md border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                  value={form.email}
                  onChange={updateForm("email")}
                  maxLength={254}
                  required
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-ink-soft">Senha</span>
                <input
                  type="password"
                  autoComplete={showRegistration ? "new-password" : "current-password"}
                  className="h-10 w-full rounded-md border border-line bg-paper px-3 text-sm outline-none focus:ring-2 focus:ring-pine"
                  value={form.password}
                  onChange={updateForm("password")}
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>
              {formError ? <p role="alert" className="text-sm text-danger">{formError}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="h-10 w-full rounded-md bg-pine px-4 text-sm font-semibold text-white hover:bg-pine-dark disabled:opacity-60"
              >
                {submitting
                  ? "Aguarde…"
                  : showRegistration
                    ? "Criar administrador"
                    : "Entrar"}
              </button>
            </form>

          </section>
        )}
      </div>
    </div>
  );
}

function messageForAuthError(error) {
  switch (error?.message) {
    case "credenciais_invalidas":
      return "E-mail ou senha incorretos.";
    case "cadastro_restrito":
      return "A configuração inicial já foi concluída.";
    case "setup_token_nao_configurado":
      return "Configure ADMIN_SETUP_TOKEN no servidor para criar o primeiro administrador.";
    case "token_configuracao_invalido":
      return "A chave de configuração está incorreta.";
    case "nome_invalido":
      return "Informe um nome com até 80 caracteres.";
    case "email_invalido":
      return "Informe um e-mail válido.";
    case "senha_invalida":
      return "A senha deve ter entre 8 e 128 caracteres.";
    case "email_em_uso":
      return "Já existe um cadastro com esse e-mail.";
    case "papel_invalido":
      return "Selecione um perfil de acesso válido.";
    case "ultimo_administrador":
      return "Não é possível remover o último administrador.";
    case "nao_encontrada":
      return "Esse cadastro não foi encontrado.";
    case "acesso_negado":
      return "Sua conta não tem permissão para essa ação.";
    default:
      return "Não foi possível concluir a operação. Verifique a conexão e tente novamente.";
  }
}
