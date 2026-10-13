import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured, getCurrentUser } from "./supabase";

const AuthContext = createContext({
  user: null,
  loading: true,
  isInitialized: false,
  checkAuth: async () => null,
  signOut: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (err) {
      console.error("Auth verification error in AuthProvider:", err);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // Check session on mount
    checkAuth();

    let subscription = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) {
          setUser(session?.user ?? null);
          setLoading(false);
          setIsInitialized(true);
        }
      });
      subscription = data?.subscription;
    }

    return () => {
      active = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [checkAuth]);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      localStorage.removeItem("tm.local_user");
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isInitialized,
        checkAuth,
        signOut,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
