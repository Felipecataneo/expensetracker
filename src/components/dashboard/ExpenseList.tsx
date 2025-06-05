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
import { Button } from '@/components/ui/button';
import { Trash2Icon } from 'lucide-react';
import { EditExpenseDialog } from './EditExpenseDialog';
// REMOVIDO: import { useExpenses } from '@/hooks/useExpenses'; // Este hook não deve ser chamado aqui

interface ExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  refetchExpenses: () => void;
  // NOVO: Adiciona deleteExpense e updateExpense como props
  deleteExpense: (receiptId: string, date: string) => Promise<void>; 
  updateExpense: (receiptId: string, updatedExpense: any) => Promise<void>; 
}

export function ExpenseList({ 
  expenses, 
  isLoading, 
  error, 
  refetchExpenses, 
  deleteExpense, // Recebido como prop
  updateExpense // Recebido como prop
}: ExpenseListProps) {
  // REMOVIDO: const { deleteExpense } = useExpenses(); // Não chame o hook aqui!

  const handleDelete = async (receiptId: string, date: string, vendor: string) => { 
    if (window.confirm(`Tem certeza que deseja deletar a despesa de "${vendor}"?`)) {
      try {
        await deleteExpense(receiptId, date); // Usa o deleteExpense recebido via prop
      } catch (err) {
        // Erro já tratado pelo toast no hook
      }
    }
  };

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
              <TableHead className="text-center">Ações</TableHead>
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
                <TableCell className="flex justify-center items-center gap-2">
                  {/* Se EditExpenseDialog também precisa de updateExpense, passe-o */}
                  {/* Assumindo que EditExpenseDialog chama useExpenses internamente. Se for esse o caso,
                      você terá um problema similar de estado. A solução seria passar updateExpense como prop para ele também.
                      Por agora, mantemos onSuccess, que já faz o refetch no pai. */}
                  <EditExpenseDialog expense={expense} onSuccess={refetchExpenses} /> 
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDelete(expense.receipt_id, expense.date, expense.vendor)} 
                  >
                    <Trash2Icon className="h-4 w-4" />
                    <span className="sr-only">Deletar</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}