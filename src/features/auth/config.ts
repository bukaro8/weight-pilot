const localAuthHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function usesSecureAuthCookies(baseURL: string | undefined, nodeEnvironment = process.env.NODE_ENV) {
  if (!baseURL) return nodeEnvironment === "production";
  try {
    return new URL(baseURL).protocol === "https:";
  } catch {
    return nodeEnvironment === "production";
  }
}

export function isLocalHttpAuthOrigin(baseURL: string | undefined) {
  if (!baseURL) return false;
  try {
    const url = new URL(baseURL);
    return url.protocol === "http:" && localAuthHosts.has(url.hostname);
  } catch {
    return false;
  }
}

export function withLocalAuthClientIp(request: Request, baseURL: string | undefined) {
  if (!isLocalHttpAuthOrigin(baseURL)) return request;
  const headers = new Headers(request.headers);
  // Next.js does not expose the socket address to Better Auth. A Compose app
  // published only on loopback has one legitimate local client bucket.
  headers.set("x-forwarded-for", "127.0.0.1");

  // Next.js 16 can provide a proxy-backed route-handler Request. Passing that
  // object as the Request constructor's input makes the native constructor
  // inspect its private state using the proxy as the receiver, which throws.
  // Construct from the URL instead and copy the standard request fields.
  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : request.body;
  const init: RequestInit & {duplex?: "half"} = {
    method,
    headers,
    signal: request.signal,
  };

  if (body) {
    init.body = body;
    init.duplex = "half";
  }

  return new Request(request.url, init);
}
