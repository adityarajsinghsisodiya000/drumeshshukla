/* Protects the admin console at the edge before any HTML is served. */
export const config = {
  matcher: ["/admin", "/admin/:path*", "/admin.html"]
};

function readCookie(header, name) {
  const parts = String(header || "").split(";");
  for (let i = 0; i < parts.length; i++) {
    const item = parts[i].trim();
    if (item.startsWith(name + "=")) return decodeURIComponent(item.slice(name.length + 1));
  }
  return "";
}

function toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function validToken(token) {
  if (!token || token.indexOf(".") < 0) return false;
  const [payload, signature] = token.split(".");
  const secret = process.env.SESSION_SECRET || "";
  if (!payload || !signature || !secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  if (toBase64Url(new Uint8Array(mac)) !== signature) return false;

  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json.sub === "admin" && typeof json.exp === "number" && json.exp > Date.now();
  } catch (error) {
    return false;
  }
}

export default async function middleware(request) {
  const url = new URL(request.url);

  if (url.pathname === "/admin/login" || url.pathname === "/admin/login/") {
    return;
  }

  const token = readCookie(request.headers.get("cookie"), "mkc_admin");
  if (await validToken(token)) return;

  const login = new URL("/admin/login", url);
  return Response.redirect(login, 307);
}
