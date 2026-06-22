import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const TOKEN_KEYS = {
  access: "vc_access_token",
  refresh: "vc_refresh_token",
};

export const tokenStore = {
  getAccess: () => localStorage.getItem(TOKEN_KEYS.access),
  getRefresh: () => localStorage.getItem(TOKEN_KEYS.refresh),
  set: ({ accessToken, refreshToken }) => {
    if (accessToken) localStorage.setItem(TOKEN_KEYS.access, accessToken);
    if (refreshToken) localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
  },
  setAccess: (accessToken) => localStorage.setItem(TOKEN_KEYS.access, accessToken),
  clear: () => {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.refresh);
  },
};

export const api = axios.create({ baseURL, withCredentials: false });

// --- Request: attach the access token ---
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Response: on 401, try a single refresh then retry the original request ---
let refreshing = null; // de-dupe concurrent refreshes

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isAuthRoute = original?.url?.includes("/auth/");
    if (status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) {
        forceLogout();
        return Promise.reject(error);
      }

      try {
        refreshing =
          refreshing ||
          axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const { data } = await refreshing;
        refreshing = null;
        tokenStore.setAccess(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        refreshing = null;
        forceLogout();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

function forceLogout() {
  tokenStore.clear();
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

/** Normalise an axios error into a readable message. */
export function apiError(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

export default api;
