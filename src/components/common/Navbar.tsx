// src/components/common/Navbar.tsx
'use client'; // Certifique-se de que esta linha está presente

import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider'; // Importe o hook de autenticação
import { LogOutIcon } from 'lucide-react'; // Ícone para o botão Sair

export function Navbar() {
  const { user, signOut, loading: authLoading } = useAuth();

  // Classes de estilo para a barra de navegação e seus elementos internos
  // `bg-sidebar` e `text-sidebar-foreground` são variáveis do seu tema
  // que se ajustam automaticamente para claro/escuro.
  const navbarClasses = "bg-gradient-to-r from-indigo-700 to-sky-500 text-white p-4 shadow-lg"; 
  const titleClasses = "text-2xl font-bold";
  const userTextClasses = "text-md hidden sm:block"; // A cor do texto herdará da Navbar

  if (authLoading) {
    return (
      <nav className={navbarClasses}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className={titleClasses}>Despesas da casa</h1>
          {/* Opcional: Indicador de carregamento na navbar. Usamos text-muted-foreground que também é tema-aware. */}
          <span className="text-sm text-muted-foreground">Carregando usuário...</span>
        </div>
      </nav>
    );
  }

  return (
    <nav className={navbarClasses}>
      <div className="container mx-auto flex justify-between items-center">
        <h1 className={titleClasses}>Despesas da casa</h1>
        <div className="flex items-center gap-4">
          {/* Mostra o nome do usuário se ele estiver autenticado */}
          {user && (
            <span className={userTextClasses}>
              Bem-vindo, {user.username || user.signInDetails?.loginId || 'Usuário'}!
            </span>
          )}
          <Button 
            onClick={signOut} 
            variant="ghost" // Alterado para variant="ghost" para melhor adaptação de tema
          >
            <LogOutIcon className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </nav>
  );
}