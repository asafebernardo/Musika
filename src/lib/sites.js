const configuredAdminHost = String(import.meta.env.VITE_ADMIN_HOST || "")
  .trim()
  .toLowerCase();
const configuredAdminUrl = String(import.meta.env.VITE_ADMIN_URL || "").trim();

export function isAdminSite() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();
  return configuredAdminHost
    ? hostname === configuredAdminHost
    : hostname.startsWith("admin.");
}

export function getAdminUrl() {
  if (configuredAdminUrl) return configuredAdminUrl.replace(/\/$/, "");
  if (typeof window === "undefined") return "/admin";
  if (isAdminSite()) return window.location.origin;
  const { hostname, origin, protocol, port } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1" || !hostname.includes(".")) {
    return `${origin}/admin`;
  }
  const adminHost = `admin.${hostname}`;
  return `${protocol}//${adminHost}${port ? `:${port}` : ""}`;
}

export function getAppUrl() {
  if (typeof window === "undefined") return "/";
  if (!isAdminSite()) return window.location.origin;
  const { hostname, protocol, port } = window.location;
  const appHost = hostname.replace(/^admin\./i, "");
  return `${protocol}//${appHost}${port ? `:${port}` : ""}`;
}
