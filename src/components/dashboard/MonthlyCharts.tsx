// src/components/dashboard/MonthlyCharts.tsx
'use client';

import React, { useMemo } from 'react';
import { Expense } from '@/lib/types';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  formatCompactCurrency,
  formatMonthLabel,
  getMonthlyTotals,
} from '@/lib/expense-utils';
import {
  AXIS_COLOR,
  CHART_ACCENT,
  DEEMPHASIS_COLOR,
  GRID_COLOR,
  TICK_COLOR,
} from '@/lib/chart-theme';

interface MonthlyChartsProps {
  expenses: Expense[];
  selectedMonth: string; // "YYYY-MM" ou "all"
  onSelectMonth: (month: string) => void;
}

const MAX_MONTHS = 12;

interface TooltipPayload {
  payload: { month: string; total: number; count: number };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{formatMonthLabel(data.month, 'long')}</p>
      <p className="text-muted-foreground">
        {formatCurrency(data.total)} · {data.count} {data.count === 1 ? 'despesa' : 'despesas'}
      </p>
    </div>
  );
}

export function MonthlyCharts({ expenses, selectedMonth, onSelectMonth }: MonthlyChartsProps) {
  const data = useMemo(() => getMonthlyTotals(expenses).slice(-MAX_MONTHS), [expenses]);

  if (data.length === 0) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>Evolução mensal</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-muted-foreground">
          Cadastre despesas para ver a evolução mensal.
        </CardContent>
      </Card>
    );
  }

  const hasSelection = selectedMonth !== 'all';

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Evolução mensal</CardTitle>
        <CardDescription>
          Últimos {data.length} meses · clique em uma barra para filtrar o dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="month"
              tickFormatter={(month: string) => formatMonthLabel(month)}
              tick={{ fill: TICK_COLOR, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: AXIS_COLOR }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              tickFormatter={formatCompactCurrency}
              tick={{ fill: TICK_COLOR, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: GRID_COLOR, opacity: 0.4 }} />
            <Bar
              dataKey="total"
              name="Total gasto"
              maxBarSize={24}
              radius={[4, 4, 0, 0]}
              className="cursor-pointer"
              onClick={(entry: { month?: string }) => {
                if (!entry?.month) return;
                onSelectMonth(entry.month === selectedMonth ? 'all' : entry.month);
              }}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={
                    !hasSelection || entry.month === selectedMonth
                      ? CHART_ACCENT
                      : DEEMPHASIS_COLOR
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
