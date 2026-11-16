import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth.jsx";
import { getAppSettings } from "@/lib/appSettings.js";

const emptyForm = { name: "", email: "", password: "" };

export default function RegisterPage() {
  const { register } = useAuth();
  const { appName } = getAppSettings();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await register(form);
      navigate("/conta", { replace: true });
    } catch (registrationError) {
      setError(messageForRegistrationError(registrationError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-10 text-ink">
      <section className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-9">
        <Link to="/" className="text-sm font-semibold text-pine hover:underline">
          ‹ Voltar para {appName}
        </Link>
        <div className="mt-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">
            Comece por aqui
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Crie sua conta</h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Cadastre-se para acessar letras, cifras e favoritos no {appName}.
          </p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">Nome</span>
            <input
              autoComplete="name"
              className="h-12 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-pine"
              value={form.name}
              onChange={updateForm("name")}
              maxLength={80}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">E-mail</span>
            <input
              type="email"
              autoComplete="email"
              className="h-12 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-pine"
              value={form.email}
              onChange={updateForm("email")}
              maxLength={254}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">Senha</span>
            <input
              type="password"
              autoComplete="new-password"
              className="h-12 w-full rounded-xl border border-line bg-paper px-3 outline-none focus:ring-2 focus:ring-pine"
              value={form.password}
              onChange={updateForm("password")}
              minLength={8}
              maxLength={128}
              required
            />
            <span className="block text-xs text-ink-soft">Use pelo menos 8 caracteres.</span>
          </label>

          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-pine px-4 text-sm font-semibold text-white hover:bg-pine-dark disabled:opacity-60"
          >
            {submitting ? "Criando conta…" : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Já tem uma conta?{" "}
          <Link to="/login" className="font-semibold text-pine hover:underline">
            Entrar
          </Link>
        </p>
      </section>
    </main>
  );
}

function messageForRegistrationError(error) {
  switch (error?.message) {
    case "nome_invalido":
      return "Informe seu nome (até 80 caracteres).";
    case "email_invalido":
      return "Informe um e-mail válido.";
    case "senha_invalida":
      return "A senha deve ter entre 8 e 128 caracteres.";
    case "email_em_uso":
      return "Já existe uma conta cadastrada com esse e-mail.";
    default:
      return "Não foi possível criar sua conta. Verifique a conexão e tente novamente.";
  }
}
