// src/components/dashboard/MonthlyCharts.tsx
'use client';

import React, { useMemo } from 'react';
import { Expense } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils'; // <-- Importar a função de formatação

interface MonthlyChartsProps {
  expenses: Expense[];
}

export function MonthlyCharts({ expenses }: MonthlyChartsProps) {
  const data = useMemo(() => {
    const monthlyDataMap = new Map<string, number>();

    expenses.forEach((expense) => {
      try {
        const date = parseISO(expense.date);
        const monthYear = format(date, 'MMM yyyy');
        const total = parseFloat(expense.total || '0');

        if (!isNaN(total)) {
          monthlyDataMap.set(monthYear, (monthlyDataMap.get(monthYear) || 0) + total);
        }
      } catch (e) {
        console.error("Error parsing expense date or total:", expense.date, expense.total, e);
      }
    });

    const sortedData = Array.from(monthlyDataMap.entries())
      .map(([monthYear, total]) => ({
        month: monthYear,
        total: parseFloat(total.toFixed(2)),
      }))
      .sort((a, b) => {
        const dateA = parseISO(a.month.replace(' ', '-01-'));
        const dateB = parseISO(b.month.replace(' ', '-01-'));
        return dateA.getTime() - dateB.getTime();
      });

    return sortedData;
  }, [expenses]);

  if (!expenses || expenses.length === 0 || data.length === 0) {
    return <Card className="w-full"><CardContent className="p-6 text-center text-muted-foreground">Dados insuficientes para gerar gráficos.</CardContent></Card>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gastos Mensais</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatCurrency(value)} /> {/* <-- Usando formatCurrency no Tooltip */}
            <Legend />
            <Bar dataKey="total" fill="#8884d8" name="Total Gasto" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}