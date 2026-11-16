import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scrypt = promisify(scryptCallback);
const usersFile = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/users.json",
);
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map();
let queue = Promise.resolve();

function withLock(task) {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readUsers() {
  try {
    const parsed = JSON.parse(await readFile(usersFile, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("usuarios_invalidos");
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeUsers(users) {
  const tempFile = `${usersFile}.${randomUUID()}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(users, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  try {
    await rename(tempFile, usersFile);
  } catch (error) {
    const { unlink } = await import("node:fs/promises");
    await unlink(tempFile).catch(() => {});
    throw error;
  }
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function validatePerson(input) {
  const name = String(input?.name ?? "").trim();
  const email = String(input?.email ?? "").trim().toLowerCase();
  const password = String(input?.password ?? "");
  const role = String(input?.role ?? "user");
  if (!name || name.length > 80) return { error: "nome_invalido" };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "email_invalido" };
  }
  if (password.length < 8 || password.length > 128) {
    return { error: "senha_invalida" };
  }
  if (role !== "admin" && role !== "user") return { error: "papel_invalido" };
  return { value: { name, email, password, role } };
}

async function passwordHash(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function passwordMatches(password, storedHash) {
  const [saltHex, hashHex] = String(storedHash ?? "").split(":");
  if (!/^[a-f0-9]{32}$/i.test(saltHex) || !/^[a-f0-9]{128}$/i.test(hashHex)) {
    return false;
  }
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

async function createUser({ name, email, password, role }) {
  const hash = await passwordHash(password);
  return {
    id: randomUUID(),
    name,
    email,
    passwordHash: hash,
    role,
    createdAt: new Date().toISOString(),
  };
}

export async function authStatus() {
  const users = await readUsers();
  return { setupRequired: !users.some((user) => user.role === "admin") };
}

export async function createFirstAdmin(input, { requireSetupToken = false } = {}) {
  const checked = validatePerson(input);
  if (checked.error) return { error: checked.error };
  if (requireSetupToken) {
    const expectedToken = String(process.env.ADMIN_SETUP_TOKEN || "");
    const providedToken = String(input?.setupToken || "");
    if (expectedToken.length < 32) return { error: "setup_token_nao_configurado" };
    const expected = Buffer.from(expectedToken);
    const provided = Buffer.from(providedToken);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      return { error: "token_configuracao_invalido" };
    }
  }
  return withLock(async () => {
    const users = await readUsers();
    if (users.some((user) => user.role === "admin")) return { error: "cadastro_restrito" };
    if (users.some((user) => user.email === checked.value.email)) {
      return { error: "email_em_uso" };
    }
    const admin = await createUser({ ...checked.value, role: "admin" });
    await writeUsers([...users, admin]);
    return { user: publicUser(admin) };
  });
}

export async function createPerson(input) {
  const checked = validatePerson(input);
  if (checked.error) return { error: checked.error };
  return withLock(async () => {
    const users = await readUsers();
    if (users.some((user) => user.email === checked.value.email)) {
      return { error: "email_em_uso" };
    }
    const user = await createUser(checked.value);
    await writeUsers([...users, user]);
    return { user: publicUser(user) };
  });
}

export async function authenticate(email, password) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const candidatePassword = String(password ?? "");
  const users = await readUsers();
  const user = users.find((item) => item.email === normalizedEmail);
  if (
    !user ||
    candidatePassword.length > 128 ||
    !(await passwordMatches(candidatePassword, user.passwordHash))
  ) {
    return null;
  }
  return publicUser(user);
}

export function startSession(userId) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function sessionToken(headers) {
  const cookies = String(headers.cookie ?? "").split(";");
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name === "coletanea_session") return valueParts.join("=");
  }
  return "";
}

export async function getSessionUser(headers) {
  const token = sessionToken(headers);
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  const user = (await readUsers()).find((item) => item.id === session.userId);
  if (!user) {
    sessions.delete(token);
    return null;
  }
  return publicUser(user);
}

export async function listPeople() {
  return (await readUsers()).map(publicUser);
}

export async function deleteUserAccount(id) {
  return withLock(async () => {
    const users = await readUsers();
    const target = users.find((user) => user.id === id);
    if (!target) return { error: "nao_encontrada" };
    if (target.role === "admin" && users.filter((user) => user.role === "admin").length <= 1) {
      return { error: "ultimo_administrador" };
    }
    await writeUsers(users.filter((user) => user.id !== id));
    return { ok: true };
  });
}

export function endSession(headers) {
  const token = sessionToken(headers);
  if (token) sessions.delete(token);
}

export const sessionTtlSeconds = SESSION_TTL_MS / 1000;
