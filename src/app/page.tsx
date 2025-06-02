// src/app/page.tsx
'use client';

import { Navbar } from '@/components/common/Navbar';
import { ExpenseList } from '@/components/dashboard/ExpenseList';
import { MonthlyCharts } from '@/components/dashboard/MonthlyCharts';
import { AddExpenseDialog } from '@/components/dashboard/AddExpenseDialog';
import { useExpenses } from '@/hooks/useExpenses';
import { Toaster } from "@/components/ui/sonner"

export default function Home() {
  const { expenses, isLoading, error, refetchExpenses } = useExpenses();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Seu Dashboard de Gastos</h2>
          <AddExpenseDialog onSuccess={refetchExpenses} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpenseList expenses={expenses} isLoading={isLoading} error={error} />
          <MonthlyCharts expenses={expenses} />
        </div>
      </main>
      <Toaster /> {/* Adicione o Toaster aqui para exibir as notificações */}
    </div>
  );
}