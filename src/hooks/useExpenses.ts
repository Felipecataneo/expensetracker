// src/hooks/useExpenses.ts
import { useState, useEffect, useCallback } from 'react';
import { Expense } from '@/lib/types';
import { toast } from 'sonner';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/expenses');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao buscar despesas.');
      }
      const data: Expense[] = await response.json();
      // Ordena por data decrescente
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(data);
    } catch (err: any) {
      console.error('Erro ao buscar despesas:', err);
      setError(err.message || 'Ocorreu um erro.');
      toast.error('Erro de Carregamento', {
        description: err.message || 'Não foi possível carregar as despesas.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return { expenses, isLoading, error, refetchExpenses: fetchExpenses };
}
