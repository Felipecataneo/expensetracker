// src/app/page.tsx
'use client';

import { Navbar } from '@/components/common/Navbar';
import { ExpenseList } from '@/components/dashboard/ExpenseList';
import { MonthlyCharts } from '@/components/dashboard/MonthlyCharts';
import { AddExpenseDialog } from '@/components/dashboard/AddExpenseDialog';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';


export default function Home() {
  const { expenses, isLoading, error, refetchExpenses, deleteExpense, updateExpense } = useExpenses(); 
 
  const { isAuthenticated, loading } = useAuth(); // Não precisa de user ou signOut aqui

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
      <Navbar /> {/* A Navbar agora contém o botão Sair */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Seu Dashboard de Gastos</h2>
          <div className="flex gap-4">
            <AddExpenseDialog onSuccess={refetchExpenses} />
 
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpenseList 
            expenses={expenses} 
            isLoading={isLoading} 
            error={error} 
            refetchExpenses={refetchExpenses} 
            deleteExpense={deleteExpense}
            updateExpense={updateExpense}
          />
          <MonthlyCharts expenses={expenses} />
        </div>
      </main>
    </div>
  );
}