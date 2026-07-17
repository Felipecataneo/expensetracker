// src/app/page.tsx
'use client';

import { Navbar } from '@/components/common/Navbar';
import { ExpenseList } from '@/components/dashboard/ExpenseList';
import { MonthlyCharts } from '@/components/dashboard/MonthlyCharts';
import { BreakdownChart } from '@/components/dashboard/BreakdownChart';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { AddExpenseDialog } from '@/components/dashboard/AddExpenseDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  filterByMonth,
  formatMonthLabel,
  getAvailableMonths,
} from '@/lib/expense-utils';

export default function Home() {
  const { expenses, isLoading, error, refetchExpenses, deleteExpense, updateExpense } =
    useExpenses();
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const monthInitialized = useRef(false);

  const availableMonths = useMemo(() => getAvailableMonths(expenses), [expenses]);

  // Ao carregar os dados pela primeira vez, seleciona o mês mais recente com lançamentos.
  useEffect(() => {
    if (!monthInitialized.current && availableMonths.length > 0) {
      monthInitialized.current = true;
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths]);

  // Se o mês selecionado deixou de existir (ex.: última despesa do mês deletada), volta para "todos".
  useEffect(() => {
    if (selectedMonth !== 'all' && expenses.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth('all');
    }
  }, [availableMonths, expenses.length, selectedMonth]);

  const scopedExpenses = useMemo(
    () => filterByMonth(expenses, selectedMonth),
    [expenses, selectedMonth]
  );

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando autenticação...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        {/* Linha de filtros e ações: um único filtro escopa KPIs, gráficos e lista */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Dashboard de gastos
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedMonth === 'all'
                ? 'Visão geral de todas as despesas'
                : `Despesas de ${formatMonthLabel(selectedMonth, 'long')}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-44 bg-background">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonthLabel(month, 'long')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AddExpenseDialog onSuccess={refetchExpenses} />
          </div>
        </div>

        <SummaryCards expenses={expenses} selectedMonth={selectedMonth} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <MonthlyCharts
              expenses={expenses}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
            />
          </div>
          <div className="lg:col-span-2">
            <BreakdownChart expenses={scopedExpenses} selectedMonth={selectedMonth} />
          </div>
        </div>

        <ExpenseList
          expenses={scopedExpenses}
          selectedMonth={selectedMonth}
          isLoading={isLoading}
          error={error}
          refetchExpenses={refetchExpenses}
          deleteExpense={deleteExpense}
          updateExpense={updateExpense}
        />
      </main>
    </div>
  );
}
