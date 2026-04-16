import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../api/http";

const STORAGE_KEY = "photovault:userId";
const LEGACY_DEMO_USER_ID = "photovault-demo-user";

export function useAuthSession() {
  const [userId, setUserId] = useState<string | null>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const redirectedUserId = new URLSearchParams(window.location.search).get("userId");
    if (stored === LEGACY_DEMO_USER_ID) {
      window.localStorage.removeItem(STORAGE_KEY);
      return redirectedUserId || null;
    }

    return stored || redirectedUserId || null;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectedUserId = params.get("userId");

    if (redirectedUserId) {
      setUserId(redirectedUserId);
      params.delete("userId");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState({}, document.title, nextUrl);
      return;
    }

    if (userId) {
      if (userId === LEGACY_DEMO_USER_ID) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(STORAGE_KEY, userId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [userId]);

  const apiBaseUrl = getApiBaseUrl();

  const auth = useMemo(() => {
    return {
      userId,
      isAuthenticated: Boolean(userId),
      signInWithGoogle: () => {
        window.location.href = `${apiBaseUrl}/auth/google`;
      },
      addAccount: () => {
        const nextUrl = userId
          ? `${apiBaseUrl}/auth/google/add-account?userId=${encodeURIComponent(userId)}`
          : `${apiBaseUrl}/auth/google/add-account`;
        window.location.href = nextUrl;
      },
      signOut: () => setUserId(null),
      setDemoSession: (nextUserId: string) => setUserId(nextUserId),
    };
  }, [apiBaseUrl, userId]);

  return auth;
}
