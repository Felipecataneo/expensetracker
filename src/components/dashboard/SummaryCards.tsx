// src/components/dashboard/SummaryCards.tsx
'use client';

import React, { useMemo } from 'react';
import { Expense } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  expenseTotal,
  filterByMonth,
  formatMonthLabel,
  getMonthlyTotals,
} from '@/lib/expense-utils';
import { useChartTheme } from '@/hooks/useChartTheme';
import { WalletIcon, ReceiptTextIcon, TrendingUpIcon, TrendingDownIcon, StoreIcon, CalendarDaysIcon } from 'lucide-react';

interface SummaryCardsProps {
  expenses: Expense[];
  selectedMonth: string; // "YYYY-MM" ou "all"
}

interface StatTileProps {
  label: string;
  value: string;
  helper?: React.ReactNode;
  icon: React.ReactNode;
}

function StatTile({ label, value, helper, icon }: StatTileProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight truncate">{value}</p>
            {helper && <div className="mt-1 text-xs text-muted-foreground">{helper}</div>}
          </div>
          <div className="shrink-0 rounded-md bg-muted p-2 text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ expenses, selectedMonth }: SummaryCardsProps) {
  const theme = useChartTheme();
  const stats = useMemo(() => {
    const scoped = filterByMonth(expenses, selectedMonth);
    const total = scoped.reduce((sum, expense) => sum + expenseTotal(expense), 0);
    const count = scoped.length;

    // Variação vs mês anterior (apenas quando um mês específico está selecionado)
    let delta: { percent: number; previousMonth: string } | null = null;
    if (selectedMonth !== 'all') {
      const monthly = getMonthlyTotals(expenses);
      const index = monthly.findIndex((entry) => entry.month === selectedMonth);
      if (index > 0) {
        const previous = monthly[index - 1];
        if (previous.total > 0) {
          delta = {
            percent: ((total - previous.total) / previous.total) * 100,
            previousMonth: previous.month,
          };
        }
      }
    }

    // Média mensal considerando os meses com lançamentos
    const monthly = getMonthlyTotals(expenses).filter((entry) => entry.count > 0);
    const monthlyAverage =
      monthly.length > 0
        ? monthly.reduce((sum, entry) => sum + entry.total, 0) / monthly.length
        : 0;

    // Maior despesa individual do período
    const biggest = scoped.reduce<Expense | null>((acc, expense) => {
      if (!acc || expenseTotal(expense) > expenseTotal(acc)) return expense;
      return acc;
    }, null);

    return { total, count, delta, monthlyAverage, biggest };
  }, [expenses, selectedMonth]);

  const periodLabel =
    selectedMonth === 'all' ? 'Total geral' : `Total em ${formatMonthLabel(selectedMonth, 'short')}`;

  const deltaHelper = stats.delta ? (
    <span
      className="inline-flex items-center gap-1 font-medium"
      style={{ color: stats.delta.percent >= 0 ? theme.deltaUpBad : theme.deltaDownGood }}
    >
      {stats.delta.percent >= 0 ? (
        <TrendingUpIcon className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <TrendingDownIcon className="h-3.5 w-3.5" aria-hidden />
      )}
      {`${stats.delta.percent >= 0 ? '+' : ''}${stats.delta.percent.toFixed(1)}% vs ${formatMonthLabel(stats.delta.previousMonth)}`}
    </span>
  ) : selectedMonth === 'all' ? (
    'Todas as despesas registradas'
  ) : (
    'Sem base de comparação'
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatTile
        label={periodLabel}
        value={formatCurrency(stats.total)}
        helper={deltaHelper}
        icon={<WalletIcon className="h-5 w-5" aria-hidden />}
      />
      <StatTile
        label="Média mensal"
        value={formatCurrency(stats.monthlyAverage)}
        helper="Meses com lançamentos"
        icon={<CalendarDaysIcon className="h-5 w-5" aria-hidden />}
      />
      <StatTile
        label="Despesas no período"
        value={String(stats.count)}
        helper={
          stats.count > 0
            ? `Ticket médio de ${formatCurrency(stats.count ? stats.total / stats.count : 0)}`
            : 'Nenhum lançamento'
        }
        icon={<ReceiptTextIcon className="h-5 w-5" aria-hidden />}
      />
      <StatTile
        label="Maior despesa"
        value={stats.biggest ? formatCurrency(stats.biggest.total) : '—'}
        helper={stats.biggest ? stats.biggest.vendor : 'Nenhum lançamento'}
        icon={<StoreIcon className="h-5 w-5" aria-hidden />}
      />
    </div>
  );
}
