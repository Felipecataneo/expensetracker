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

interface MonthlyChartsProps {
  expenses: Expense[];
}

export function MonthlyCharts({ expenses }: MonthlyChartsProps) {
  const data = useMemo(() => {
    // Agrupar despesas por mês e somar os totais
    const monthlyDataMap = new Map<string, number>();

    expenses.forEach((expense) => {
      try {
        const date = parseISO(expense.date);
        const monthYear = format(date, 'MMM yyyy'); // Ex: "Jan 2023"
        const total = parseFloat(expense.total || '0'); // Garante que o total é um número

        if (!isNaN(total)) {
          monthlyDataMap.set(monthYear, (monthlyDataMap.get(monthYear) || 0) + total);
        }
      } catch (e) {
        console.error("Error parsing expense date or total:", expense.date, expense.total, e);
      }
    });

    // Converter para array de objetos e ordenar por data
    const sortedData = Array.from(monthlyDataMap.entries())
      .map(([monthYear, total]) => ({
        month: monthYear,
        total: parseFloat(total.toFixed(2)), // Arredonda para 2 casas decimais
      }))
      .sort((a, b) => {
        // Ordenar cronologicamente
        const dateA = parseISO(a.month.replace(' ', '-01-')); // Gambiarra para parsear Mês Ano
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
            <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
            <Legend />
            <Bar dataKey="total" fill="#8884d8" name="Total Gasto" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}