'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { verifyAdminPassword } from '@/lib/api';
import {
  isAdminSessionAuthenticated,
  setAdminSessionAuthenticated,
  clearAdminSession,
  subscribeAdminUnauthorized,
} from '@/lib/adminSession';

interface UseAdminAuthOptions {
  onAuthenticated?: () => void;
  onUnauthenticatedOnMount?: () => void;
  onUnauthorized?: () => void;
}

/**
 * Manages admin authentication state, login submission, logout, and automatic
 * session expiration handling when any admin API call returns HTTP 401.
 */
export function useAdminAuth(options: UseAdminAuthOptions = {}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (isAdminSessionAuthenticated()) {
      setIsAuthenticated(true);
      optionsRef.current.onAuthenticated?.();
    } else {
      optionsRef.current.onUnauthenticatedOnMount?.();
    }
  }, []);

  useEffect(() => {
    return subscribeAdminUnauthorized(() => {
      clearAdminSession();
      setIsAuthenticated(false);
      setPasswordInput('');
      setAuthError('Your session has expired. Please log in again.');
      optionsRef.current.onUnauthorized?.();
    });
  }, []);

  const handleAdminLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const isValid = await verifyAdminPassword(passwordInput);
        if (isValid) {
          setIsAuthenticated(true);
          setAdminSessionAuthenticated();
          setAuthError('');
          setPasswordInput('');
          optionsRef.current.onAuthenticated?.();
        } else {
          setAuthError('Incorrect admin password.');
        }
      } catch {
        setAuthError('Failed to verify admin password.');
      }
    },
    [passwordInput]
  );

  const logout = useCallback(() => {
    clearAdminSession();
    setIsAuthenticated(false);
    setPasswordInput('');
    setAuthError('');
  }, []);

  return {
    isAuthenticated,
    passwordInput,
    setPasswordInput,
    showPassword,
    setShowPassword,
    authError,
    handleAdminLogin,
    logout,
  };
}
