// src/components/providers/AuthProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { signOut, getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { configureAmplify } from '@/amplifyconfig';
import { useRouter, usePathname } from 'next/navigation';
import type { AuthUser } from 'aws-amplify/auth';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    configureAmplify(); // Configura o Amplify uma vez
    checkCurrentUser(); // Verifica o usuário ao carregar

    // Listener para eventos de autenticação
    const listener = (data: any) => {
      switch (data.payload.event) {
        case 'signedIn':
          console.log('user signed in');
          checkCurrentUser();
          break;
        case 'signedOut':
          console.log('user signed out');
          setUser(null);
          // Redireciona para a página de login após o logout
          if (pathname !== '/auth') {
            router.push('/auth');
          }
          break;
        case 'signUp':
          console.log('user signed up');
          break;
        case 'signInWithRedirect_failure':
        case 'signIn_failure':
          console.log('user sign in failed');
          break;
        case 'tokenRefresh_failure':
          console.log('token refresh failed, forcing sign out');
          handleSignOut(); // Força logout se o token não puder ser renovado
          break;
      }
    };

    const unsubscribe = Hub.listen('auth', listener);

    return () => {
      unsubscribe();
    };
  }, [pathname, router]);

  const checkCurrentUser = async () => {
    try {
      const authUser = await getCurrentUser();
      setUser(authUser);
      if (pathname === '/auth') {
        // Se já está autenticado e na página de auth, redireciona para o dashboard
        router.push('/');
      }
    } catch (e) {
      console.log('No current user', e);
      setUser(null);
      // Se não está autenticado e não está na página de auth, redireciona para login
      if (pathname !== '/auth') {
        router.push('/auth');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      loading, 
      signOut: handleSignOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};