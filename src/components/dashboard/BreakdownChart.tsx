// src/components/dashboard/BreakdownChart.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Expense } from '@/lib/types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { expenseTotal, formatMonthLabel, getVendorTotals } from '@/lib/expense-utils';
import { getEffectiveCategory } from '@/lib/categories';
import { useChartTheme, useThemeMode } from '@/hooks/useChartTheme';

interface BreakdownChartProps {
  expenses: Expense[]; // já filtradas pelo período selecionado
  selectedMonth: string;
}

const TOP_SLICES = 5;

interface Slice {
  name: string;
  value: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Slice }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const slice = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{slice.name}</p>
      <p className="text-muted-foreground">{formatCurrency(slice.value)}</p>
    </div>
  );
}

export function BreakdownChart({ expenses, selectedMonth }: BreakdownChartProps) {
  const [mode, setMode] = useState<'category' | 'vendor'>('category');
  const theme = useChartTheme();
  const themeMode = useThemeMode();

  const { slices, total } = useMemo(() => {
    let entries: Array<{ name: string; value: number; color?: string }>;

    if (mode === 'category') {
      // Cor fixa por categoria (a cor segue a entidade, não a posição no ranking)
      const map = new Map<string, { label: string; color: string; total: number }>();
      expenses.forEach((expense) => {
        const category = getEffectiveCategory(expense);
        const entry = map.get(category.id) || {
          label: category.label,
          color: category.color[themeMode],
          total: 0,
        };
        entry.total += expenseTotal(expense);
        map.set(category.id, entry);
      });
      entries = Array.from(map.values())
        .map(({ label, color, total }) => ({ name: label, value: total, color }))
        .sort((a, b) => b.value - a.value);
    } else {
      // Vendedores usam os slots categóricos em ordem fixa de ranking
      entries = getVendorTotals(expenses).map((vendor, index) => ({
        name: vendor.vendor,
        value: vendor.total,
        color: theme.categorical[index],
      }));
    }

    const top = entries.slice(0, TOP_SLICES);
    const rest = entries.slice(TOP_SLICES);

    const result: Slice[] = top.map((entry) => ({
      name: entry.name,
      value: parseFloat(entry.value.toFixed(2)),
      color: entry.color || theme.other,
    }));

    const otherTotal = rest.reduce((sum, entry) => sum + entry.value, 0);
    if (otherTotal > 0) {
      result.push({
        name: mode === 'category' ? `Outras (${rest.length})` : `Outros (${rest.length})`,
        value: parseFloat(otherTotal.toFixed(2)),
        color: theme.other,
      });
    }

    return {
      slices: result,
      total: result.reduce((sum, slice) => sum + slice.value, 0),
    };
  }, [expenses, mode, theme, themeMode]);

  const periodLabel =
    selectedMonth === 'all' ? 'Todo o período' : formatMonthLabel(selectedMonth, 'long');

  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Onde você gastou</CardTitle>
          <CardDescription>{periodLabel}</CardDescription>
        </div>
        <Tabs value={mode} onValueChange={(value) => setMode(value as 'category' | 'vendor')}>
          <TabsList className="h-8">
            <TabsTrigger value="category" className="text-xs px-2.5">
              Categoria
            </TabsTrigger>
            <TabsTrigger value="vendor" className="text-xs px-2.5">
              Vendedor
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">
            Nenhuma despesa no período selecionado.
          </p>
        ) : (
          <>
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Tooltip content={<ChartTooltip />} />
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="68%"
                    outerRadius="95%"
                    paddingAngle={1.5}
                    strokeWidth={0}
                  >
                    {slices.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-lg font-semibold tracking-tight">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Legenda com valores: identidade nunca depende só da cor */}
            <ul className="mt-4 space-y-1.5">
              {slices.map((slice) => (
                <li key={slice.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden
                  />
                  <span className="truncate">{slice.name}</span>
                  <span className="ml-auto shrink-0 font-medium tabular-nums">
                    {formatCurrency(slice.value)}
                  </span>
                  <span className="w-11 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {total > 0 ? `${((slice.value / total) * 100).toFixed(0)}%` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
