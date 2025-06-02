// src/components/dashboard/ExpenseList.tsx
import React from 'react';
import { Expense } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface ExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
}

export function ExpenseList({ expenses, isLoading, error }: ExpenseListProps) {
  if (isLoading) {
    return <Card className="w-full"><CardContent className="p-6 text-center">Carregando despesas...</CardContent></Card>;
  }

  if (error) {
    return <Card className="w-full"><CardContent className="p-6 text-center text-red-500">Erro ao carregar despesas: {error}</CardContent></Card>;
  }

  if (!expenses || expenses.length === 0) {
    return <Card className="w-full"><CardContent className="p-6 text-center text-muted-foreground">Nenhuma despesa encontrada.</CardContent></Card>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Últimas Despesas</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Itens (alguns)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.receipt_id}>
                <TableCell>{format(new Date(expense.date), 'dd/MM/yyyy')}</TableCell>
                <TableCell>{expense.vendor}</TableCell>
                <TableCell className="text-right">R$ {parseFloat(expense.total).toFixed(2)}</TableCell>
                <TableCell>
                  {expense.items && expense.items.length > 0 ? (
                    <ul className="list-disc list-inside text-sm">
                      {expense.items.slice(0, 2).map((item, index) => (
                        <li key={index}>
                          {item.name} (R$ {parseFloat(item.price).toFixed(2)} x {item.quantity})
                        </li>
                      ))}
                      {expense.items.length > 2 && <li>...</li>}
                    </ul>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}