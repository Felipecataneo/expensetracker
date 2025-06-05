// src/hooks/useExpenses.ts
import { useState, useEffect, useCallback } from 'react';
import { Expense, ManualExpenseInput } from '@/lib/types'; // Import ManualExpenseInput
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

  // NOVO: Função para atualizar despesa
  const updateExpense = useCallback(async (receiptId: string, updatedExpense: ManualExpenseInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Token de autenticação não encontrado');
      }
      const token = session.tokens.idToken.toString();

      const response = await fetch(`/api/expenses/${receiptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedExpense),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      toast.success('Despesa atualizada com sucesso!');
      await fetchExpenses(); // Recarrega todas as despesas para atualizar a lista
    } catch (err: any) {
      const errorMessage = err.message || 'Não foi possível atualizar a despesa.';
      console.error('Erro ao atualizar despesa:', err);
      setError(errorMessage);
      toast.error('Erro de Atualização', { description: errorMessage });
      throw err; // Re-lança para permitir que o componente chame onSuccess/onError
    } finally {
      setIsLoading(false);
    }
  }, [fetchExpenses]);

  // NOVO: Função para deletar despesa
  const deleteExpense = useCallback(async (receiptId: string, date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Token de autenticação não encontrado');
      }
      const token = session.tokens.idToken.toString();

      const response = await fetch(`/api/expenses/${receiptId}?date=${date}`, { // <-- Adicione ?date=${date}
        method: 'DELETE',
        
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ date: date })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      toast.success('Despesa deletada com sucesso!');
      await fetchExpenses(); // Recarrega todas as despesas para atualizar a lista
    } catch (err: any) {
      const errorMessage = err.message || 'Não foi possível deletar a despesa.';
      console.error('Erro ao deletar despesa:', err);
      setError(errorMessage);
      toast.error('Erro ao Deletar', { description: errorMessage });
      throw err; // Re-lança para permitir que o componente chame onSuccess/onError
    } finally {
      setIsLoading(false);
    }
  }, [fetchExpenses]);

  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      fetchExpenses();
    } else if (!authLoading && !isAuthenticated) {
      setExpenses([]);
      setIsLoading(false);
      setError(null);
    }
  }, [isAuthenticated, user, authLoading, fetchExpenses]);

  return { 
    expenses, 
    isLoading, 
    error, 
    refetchExpenses: fetchExpenses,
    updateExpense, // Disponibiliza para outros componentes
    deleteExpense, // Disponibiliza para outros componentes
  };
}