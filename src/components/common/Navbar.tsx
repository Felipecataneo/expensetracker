// src/components/common/Navbar.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LogOutIcon, WalletIcon } from 'lucide-react';

export function Navbar() {
  const { user, signOut, loading: authLoading } = useAuth();

  return (
    <nav className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <WalletIcon className="h-4.5 w-4.5" aria-hidden />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Despesas da casa
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {authLoading ? (
            <span className="text-sm text-muted-foreground">Carregando...</span>
          ) : (
            <>
              {user && (
                <span className="hidden sm:block text-sm text-muted-foreground mr-1">
                  {user.username || user.signInDetails?.loginId || 'Usuário'}
                </span>
              )}
              <ThemeToggle />
              <Button onClick={signOut} variant="outline" size="sm">
                <LogOutIcon className="h-4 w-4" aria-hidden />
                Sair
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
