import {
  authenticate,
  authStatus,
  createFirstAdmin,
  createPerson,
  deleteUserAccount,
  endSession,
  getSessionUser,
  listPeople,
  sessionTtlSeconds,
  startSession,
  updateUserAccount,
} from "./auth-store.js";

function errorResult(status, error) {
  return { status, body: { error } };
}

function cookieDomain() {
  const configuredDomain = String(process.env.AUTH_COOKIE_DOMAIN || "").trim();
  return configuredDomain && /^\.?[a-z0-9.-]+$/i.test(configuredDomain)
    ? `; Domain=${configuredDomain}`
    : "";
}

function cookie(token, secure) {
  return `coletanea_session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${sessionTtlSeconds}${
    secure ? "; Secure" : ""
  }${cookieDomain()}`;
}

function clearCookie(secure) {
  return `coletanea_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${
    secure ? "; Secure" : ""
  }${cookieDomain()}`;
}

export async function isAdminRequest(headers) {
  return (await getSessionUser(headers))?.role === "admin";
}

export async function isAuthenticatedRequest(headers) {
  return Boolean(await getSessionUser(headers));
}

export function isSameOriginRequest(headers, secure = false) {
  const origin = String(headers.origin || "").trim();
  if (!origin) return true;
  try {
    const parsedOrigin = new URL(origin);
    const requestHost = String(headers.host || "").toLowerCase();
    return (
      Boolean(requestHost) &&
      parsedOrigin.host.toLowerCase() === requestHost &&
      (secure ? parsedOrigin.protocol === "https:" : ["http:", "https:"].includes(parsedOrigin.protocol))
    );
  } catch {
    return false;
  }
}

export async function handleAuthRequest({
  method,
  pathname,
  headers,
  body,
  secure = false,
}) {
  if (
    method !== "GET" &&
    method !== "HEAD" &&
    !isSameOriginRequest(headers, secure)
  ) {
    return errorResult(403, "origem_invalida");
  }

  if (method === "GET" && pathname === "/api/auth/status") {
    return { status: 200, body: await authStatus() };
  }

  if (method === "GET" && pathname === "/api/auth/me") {
    return { status: 200, body: { user: await getSessionUser(headers) } };
  }

  if (method === "POST" && pathname === "/api/auth/setup") {
    const result = await createFirstAdmin(body, { requireSetupToken: secure });
    if (result.error) {
      const status =
        result.error === "setup_token_nao_configurado"
          ? 503
          : result.error === "cadastro_restrito" || result.error === "token_configuracao_invalido"
            ? 403
            : 400;
      return errorResult(status, result.error);
    }
    const token = startSession(result.user.id);
    return {
      status: 201,
      body: { user: result.user },
      headers: { "Set-Cookie": cookie(token, secure) },
    };
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    const result = await createPerson({ ...body, role: "user" });
    if (result.error) {
      const status = result.error === "email_em_uso" ? 409 : 400;
      return errorResult(status, result.error);
    }
    const token = startSession(result.user.id);
    return {
      status: 201,
      body: { user: result.user },
      headers: { "Set-Cookie": cookie(token, secure) },
    };
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const user = await authenticate(body?.email, body?.password);
    if (!user) return errorResult(401, "credenciais_invalidas");
    const token = startSession(user.id);
    return {
      status: 200,
      body: { user },
      headers: { "Set-Cookie": cookie(token, secure) },
    };
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    endSession(headers);
    return {
      status: 200,
      body: { ok: true },
      headers: { "Set-Cookie": clearCookie(secure) },
    };
  }

  if ((method === "PUT" || method === "PATCH") && pathname === "/api/auth/account") {
    const user = await getSessionUser(headers);
    if (!user) return errorResult(401, "sessao_invalida");
    const result = await updateUserAccount(user.id, body);
    if (result.error) {
      const status =
        result.error === "nao_encontrada"
          ? 404
          : result.error === "email_em_uso"
            ? 409
            : 400;
      return errorResult(status, result.error);
    }
    return {
      status: 200,
      body: { user: result.user },
    };
  }

  if (method === "DELETE" && pathname === "/api/auth/account") {
    const user = await getSessionUser(headers);
    if (!user) return errorResult(401, "sessao_invalida");
    const result = await deleteUserAccount(user.id);
    if (result.error) {
      const status = result.error === "nao_encontrada" ? 404 : 409;
      return errorResult(status, result.error);
    }
    endSession(headers);
    return {
      status: 200,
      body: { ok: true },
      headers: { "Set-Cookie": clearCookie(secure) },
    };
  }

  if (pathname === "/api/admin/users" && method === "GET") {
    if (!(await isAdminRequest(headers))) return errorResult(403, "acesso_negado");
    return { status: 200, body: await listPeople() };
  }

  return null;
}
