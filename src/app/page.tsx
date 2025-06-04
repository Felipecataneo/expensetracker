// src/app/page.tsx
'use client';

import { Navbar } from '@/components/common/Navbar';
import { ExpenseList } from '@/components/dashboard/ExpenseList';
import { MonthlyCharts } from '@/components/dashboard/MonthlyCharts';
import { AddExpenseDialog } from '@/components/dashboard/AddExpenseDialog';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/components/providers/AuthProvider'; // <-- Importar useAuth
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { expenses, isLoading, error, refetchExpenses } = useExpenses();
  const { user, isAuthenticated, loading, signOut } = useAuth(); // <-- Obter dados do Auth

  const router = useRouter();

  // Redirecionar se não estiver autenticado
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
          <ExpenseList expenses={expenses} isLoading={isLoading} error={error} />
          <MonthlyCharts expenses={expenses} />
        </div>
      </main>
      {/* O Toaster já está no RootLayout */}
    </div>
  );
}