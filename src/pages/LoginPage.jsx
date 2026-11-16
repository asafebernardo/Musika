import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.jsx";
import { getAppSettings } from "@/lib/appSettings.js";
import { getAdminUrl } from "@/lib/sites.js";

export default function LoginPage() {
  const { login } = useAuth();
  const { appName } = getAppSettings();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const user = await login({ email, password });
      if (user.role === "admin") {
        const adminUrl = getAdminUrl();
        const destination = new URL(adminUrl, window.location.origin);
        if (destination.origin === window.location.origin) {
          navigate(destination.pathname, { replace: true });
        } else {
          window.location.replace(adminUrl);
        }
      } else {
        navigate("/conta", { replace: true });
      }
    } catch (loginError) {
      setError(
        loginError?.message === "credenciais_invalidas"
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Verifique a conexão e tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center overflow-y-auto bg-paper px-5 py-10 text-ink">
      <section className="w-full max-w-md space-y-5 rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-9">
        <Link to="/" className="text-sm font-semibold text-pine hover:underline">
          ‹ Voltar para {appName}
        </Link>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">{appName}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Que bom ter você de volta.</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Entre na sua conta para acessar letras, cifras e favoritos.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">E-mail</span>
              <input
                type="email"
                autoComplete="username"
                className="h-12 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-pine"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">Senha</span>
              <input
                type="password"
                autoComplete="current-password"
                className="h-12 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-pine"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                maxLength={128}
                required
              />
            </label>
            {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-pine px-4 text-sm font-semibold text-white hover:bg-pine-dark disabled:opacity-60"
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-ink-soft">
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="font-semibold text-pine hover:underline">
            Cadastre-se
          </Link>
        </p>
      </section>
    </main>
  );
}
