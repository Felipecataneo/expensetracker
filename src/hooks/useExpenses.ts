// src/hooks/useExpenses.ts
import { useState, useEffect, useCallback } from 'react';
import { Expense } from '@/lib/types';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchAuthSession } from 'aws-amplify/auth';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const fetchExpenses = useCallback(async () => {
    if (!isAuthenticated || authLoading || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Método atualizado para obter a sessão no Amplify v6
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        throw new Error('Token de autenticação não encontrado');
      }

      const token = session.tokens.idToken.toString();

      const response = await fetch('/api/expenses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data: Expense[] = await response.json();
      
      // Ordena por data decrescente
      const sortedExpenses = data.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setExpenses(sortedExpenses);
    } catch (err: any) {
      const errorMessage = err.message || 'Ocorreu um erro inesperado.';
      console.error('Erro ao buscar despesas:', err);
      setError(errorMessage);
      
      toast.error('Erro de Carregamento', {
        description: 'Não foi possível carregar as despesas. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, user]);

  useEffect(() => {
    // Só busca despesas quando estiver autenticado e não estiver carregando
    if (isAuthenticated && user && !authLoading) {
      fetchExpenses();
    } else if (!authLoading && !isAuthenticated) {
      // Limpa os dados quando não estiver autenticado
      setExpenses([]);
      setIsLoading(false);
      setError(null);
    }
  }, [isAuthenticated, user, authLoading, fetchExpenses]);

  return { 
    expenses, 
    isLoading, 
    error, 
    refetchExpenses: fetchExpenses 
  };
}