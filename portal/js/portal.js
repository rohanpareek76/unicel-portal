// Shared helpers used by login.html and dashboard.html
const Portal = (function () {
  const TOKEN_KEY = "unicel_token";
  const USER_KEY = "unicel_user";

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function api(path, options = {}) {
    const token = getToken();
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      token ? { Authorization: "Bearer " + token } : {},
      options.headers || {}
    );
    const res = await fetch(path, { ...options, headers });
    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }
    if (!res.ok) {
      if (res.status === 401) clearSession();
      throw new Error((data && data.error) || "Something went wrong.");
    }
    return data;
  }

  return { getToken, getUser, setSession, clearSession, api };
})();
