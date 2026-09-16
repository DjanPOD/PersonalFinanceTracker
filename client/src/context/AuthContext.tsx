import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError, apiClient } from "../api/client";
import type {
  CurrentUserResponse,
  LoginCredentials,
  LoginResponse,
  RegisterCredentials,
  RegisterResponse,
  User,
} from "../types/auth";

const ACCESS_TOKEN_STORAGE_KEY = "ledgerly_access_token";

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (credentials: RegisterCredentials) => Promise<void>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    async function restoreSession() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient<CurrentUserResponse>("/auth/me", {
          method: "GET",
          token,
        });

        setUser(response.user);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
          setToken(null);
          setUser(null);
        } else {
          console.error("Unable to restore the current user session.", error);
        }
      } finally {
        setIsLoading(false);
      }
    }

    void restoreSession();
  }, [token]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await apiClient<LoginResponse>("/auth/login", {
      method: "POST",
      body: credentials,
    });

    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, response.access_token);
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    await apiClient<RegisterResponse>("/auth/register", {
      method: "POST",
      body: credentials,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: token !== null && user !== null,
      isLoading,
      login,
      logout,
      register,
      user,
    }),
    [isLoading, login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}