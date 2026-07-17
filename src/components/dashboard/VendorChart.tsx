// src/components/dashboard/VendorChart.tsx
'use client';

import React, { useMemo } from 'react';
import { Expense } from '@/lib/types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { formatMonthLabel, getVendorTotals } from '@/lib/expense-utils';
import { CATEGORICAL_COLORS, OTHER_COLOR } from '@/lib/chart-theme';

interface VendorChartProps {
  expenses: Expense[]; // já filtradas pelo período selecionado
  selectedMonth: string;
}

const TOP_VENDORS = 5;

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
      <p className="font-medium">{slice.name}</p>
      <p className="text-muted-foreground">{formatCurrency(slice.value)}</p>
    </div>
  );
}

export function VendorChart({ expenses, selectedMonth }: VendorChartProps) {
  const { slices, total } = useMemo(() => {
    const vendors = getVendorTotals(expenses);
    const top = vendors.slice(0, TOP_VENDORS);
    const rest = vendors.slice(TOP_VENDORS);

    const result: Slice[] = top.map((vendor, index) => ({
      name: vendor.vendor,
      value: vendor.total,
      color: CATEGORICAL_COLORS[index],
    }));

    const otherTotal = rest.reduce((sum, vendor) => sum + vendor.total, 0);
    if (otherTotal > 0) {
      result.push({
        name: `Outros (${rest.length})`,
        value: parseFloat(otherTotal.toFixed(2)),
        color: OTHER_COLOR,
      });
    }

    return {
      slices: result,
      total: result.reduce((sum, slice) => sum + slice.value, 0),
    };
  }, [expenses]);

  const periodLabel =
    selectedMonth === 'all' ? 'Todo o período' : formatMonthLabel(selectedMonth, 'long');

  if (slices.length === 0) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>Onde você gastou</CardTitle>
          <CardDescription>{periodLabel}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhuma despesa no período selecionado.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Onde você gastou</CardTitle>
        <CardDescription>{periodLabel}</CardDescription>
      </CardHeader>
      <CardContent>
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
            <span className="text-lg font-semibold tracking-tight">{formatCurrency(total)}</span>
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
      </CardContent>
    </Card>
  );
}
