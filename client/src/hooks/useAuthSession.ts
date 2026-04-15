import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../api/http";

const STORAGE_KEY = "photovault:userId";

export function useAuthSession() {
  const demoUserId = import.meta.env.VITE_PHOTOVAULT_DEMO_USER_ID as string | undefined;
  const [userId, setUserId] = useState<string | null>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored || demoUserId || null;
  });

  useEffect(() => {
    if (userId) {
      window.localStorage.setItem(STORAGE_KEY, userId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [userId]);

  useEffect(() => {
    const nextUserId = window.localStorage.getItem(STORAGE_KEY);
    if (!nextUserId && demoUserId) {
      setUserId(demoUserId);
    }
  }, [demoUserId]);

  const apiBaseUrl = getApiBaseUrl();

  const auth = useMemo(() => {
    return {
      userId,
      isAuthenticated: Boolean(userId),
      signInWithGoogle: () => {
        window.location.href = `${apiBaseUrl}/auth/google`;
      },
      addAccount: () => {
        window.location.href = `${apiBaseUrl}/auth/google/add-account`;
      },
      signOut: () => setUserId(null),
      setDemoSession: (nextUserId: string) => setUserId(nextUserId),
    };
  }, [apiBaseUrl, userId]);

  return auth;
}
