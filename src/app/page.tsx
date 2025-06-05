// src/app/page.tsx
'use client';

import { Navbar } from '@/components/common/Navbar';
import { ExpenseList } from '@/components/dashboard/ExpenseList';
import { MonthlyCharts } from '@/components/dashboard/MonthlyCharts';
import { AddExpenseDialog } from '@/components/dashboard/AddExpenseDialog';
import { useExpenses } from '@/hooks/useExpenses'; // Chame o hook AQUI
import { useAuth } from '@/components/providers/AuthProvider';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Home() {
  // NOVO: Obter deleteExpense e updateExpense do hook
  const { expenses, isLoading, error, refetchExpenses, deleteExpense, updateExpense } = useExpenses(); 
  const { user, isAuthenticated, loading, signOut } = useAuth();

  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando autenticação...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Seu Dashboard de Gastos</h2>
          <div className="flex gap-4">
            <AddExpenseDialog onSuccess={refetchExpenses} />
            <Button onClick={signOut} variant="outline">
              Sair ({user?.username || user?.signInDetails?.loginId || 'Usuário'})
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 
            Passa todas as props necessárias para ExpenseList, 
            incluindo deleteExpense e updateExpense 
          */}
          <ExpenseList 
            expenses={expenses} 
            isLoading={isLoading} 
            error={error} 
            refetchExpenses={refetchExpenses} 
            deleteExpense={deleteExpense} // NOVO: Passando deleteExpense
            updateExpense={updateExpense} // NOVO: Passando updateExpense
          />
          <MonthlyCharts expenses={expenses} />
        </div>
      </main>
    </div>
  );
}