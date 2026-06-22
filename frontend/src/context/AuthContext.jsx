import { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import { authApi } from "../api/auth.js";
import { tokenStore } from "../api/client.js";
import { decodeJwt, isExpired } from "../lib/jwt.js";

const AuthContext = createContext(null);

const initialState = {
  user: null, // { id, email, role, linkedId }
  status: "loading", // loading | authenticated | unauthenticated
};

function reducer(state, action) {
  switch (action.type) {
    case "AUTHENTICATED":
      return { user: action.user, status: "authenticated" };
    case "UNAUTHENTICATED":
      return { user: null, status: "unauthenticated" };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate session from a stored token on first load.
  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token || isExpired(token)) {
      // No valid access token; let API calls trigger refresh lazily on demand.
      const refresh = tokenStore.getRefresh();
      if (!refresh) {
        dispatch({ type: "UNAUTHENTICATED" });
        return;
      }
    }
    authApi
      .me()
      .then(({ user }) => dispatch({ type: "AUTHENTICATED", user }))
      .catch(() => {
        tokenStore.clear();
        dispatch({ type: "UNAUTHENTICATED" });
      });
  }, []);

  const applyAuthResult = useCallback((result) => {
    tokenStore.set(result);
    const user = result.user || (() => {
      const p = decodeJwt(result.accessToken);
      return p ? { id: p.userId, role: p.role, linkedId: p.linkedId } : null;
    })();
    dispatch({ type: "AUTHENTICATED", user });
    return user;
  }, []);

  const login = useCallback(
    async (credentials) => applyAuthResult(await authApi.login(credentials)),
    [applyAuthResult]
  );

  const register = useCallback(
    async (payload) => applyAuthResult(await authApi.register(payload)),
    [applyAuthResult]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore network errors on logout */
    }
    tokenStore.clear();
    dispatch({ type: "UNAUTHENTICATED" });
  }, []);

  const value = {
    ...state,
    isAuthenticated: state.status === "authenticated",
    role: state.user?.role ?? null,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
