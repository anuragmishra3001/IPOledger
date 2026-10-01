const BASE = "";

async function request(url, { method = "GET", body, headers = {} } = {}) {
  const opts = {
    method,
    credentials: "include",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + url, opts);
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let error = "Request failed.";
    if (ct.includes("application/json")) {
      const data = await res.json().catch(() => ({}));
      error = data.error || error;
    }
    const err = new Error(error);
    err.status = res.status;
    throw err;
  }
  if (ct.includes("application/json")) return res.json();
  return res;
}

export const api = {
  get: (u) => request(u),
  post: (u, b) => request(u, { method: "POST", body: b }),
  patch: (u, b) => request(u, { method: "PATCH", body: b }),
  delete: (u) => request(u, { method: "DELETE" }),
  download: (u) => window.open(BASE + u, "_blank"),
};
