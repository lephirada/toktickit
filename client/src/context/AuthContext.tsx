import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import {
  AuthUser,
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
} from "../api.js";

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updatePasswordChanged: () => void;
  // Unsaved changes / Dirty guard management
  isFormDirty: boolean;
  setFormDirty: (dirty: boolean) => void;
  isDirtyModalOpen: boolean;
  pendingNavigation: (() => void) | null;
  requestNavigationWithGuard: (navigateAction: () => void) => boolean;
  confirmDiscard: () => void;
  cancelDiscard: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormDirty, setIsFormDirty] = useState<boolean>(false);
  const [isDirtyModalOpen, setIsDirtyModalOpen] = useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await fetchCurrentUser();
      if (isMountedRef.current) {
        setUser(currentUser);
      }
    } catch {
      if (isMountedRef.current) {
        setUser(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const res = await apiLogin({ email, password });
    const authUser = res.data;
    if (isMountedRef.current) {
      setUser(authUser);
    }
    return authUser;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiLogout();
    } finally {
      if (isMountedRef.current) {
        setUser(null);
        setIsFormDirty(false);
        setIsDirtyModalOpen(false);
        setPendingNavigation(null);
      }
    }
  }, []);

  const updatePasswordChanged = useCallback(() => {
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
  }, []);

  const requestNavigationWithGuard = useCallback(
    (navigateAction: () => void): boolean => {
      if (isFormDirty) {
        setPendingNavigation(() => navigateAction);
        setIsDirtyModalOpen(true);
        return false;
      }
      navigateAction();
      return true;
    },
    [isFormDirty]
  );

  const confirmDiscard = useCallback(() => {
    setIsFormDirty(false);
    setIsDirtyModalOpen(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  const cancelDiscard = useCallback(() => {
    setIsDirtyModalOpen(false);
    setPendingNavigation(null);
  }, []);

  const isAuthenticated = user !== null;
  const mustChangePassword = user !== null && user.mustChangePassword === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        mustChangePassword,
        login,
        logout,
        refreshUser,
        updatePasswordChanged,
        isFormDirty,
        setFormDirty: setIsFormDirty,
        isDirtyModalOpen,
        pendingNavigation,
        requestNavigationWithGuard,
        confirmDiscard,
        cancelDiscard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
