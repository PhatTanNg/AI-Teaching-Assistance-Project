import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client.js';

const AuthContext = createContext(null);

const AUTH_TOKEN_KEY = 'aita_access_token';

const readStoredToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.warn('Unable to read stored token:', error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(!!token);
  const isAuthenticated = Boolean(token);

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient('/api/users/me', {
        method: 'GET',
        token,
      });

      setUser(response.user);
    } catch (error) {
      console.error('Unable to fetch profile:', error);
      setToken(null);
      try {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      } catch (storageError) {
        console.warn('Unable to clear stored token:', storageError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = useCallback(({ accessToken }) => {
    setToken(accessToken);
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    } catch (error) {
      console.warn('Unable to persist token:', error);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.warn('Unable to clear stored token:', error);
    }
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated,
      isLoading,
      refreshProfile: fetchProfile,
    }),
    [token, user, login, logout, isAuthenticated, isLoading, fetchProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
