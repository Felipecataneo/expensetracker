// src/components/dashboard/ExpenseList.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Expense } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Trash2Icon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
} from 'lucide-react';
import { EditExpenseDialog } from './EditExpenseDialog';
import { formatCurrency } from '@/lib/utils';
import { expenseTotal } from '@/lib/expense-utils';
import { ManualExpenseInput } from '@/lib/types';

const PAGE_SIZE = 10;

type SortKey = 'date' | 'total' | 'vendor';
type SortDirection = 'asc' | 'desc';

interface ExpenseListProps {
  expenses: Expense[]; // já filtradas pelo período selecionado
  isLoading: boolean;
  error: string | null;
  refetchExpenses: () => void;
  deleteExpense: (receiptId: string, date: string) => Promise<void>;
  updateExpense: (receiptId: string, updatedExpense: ManualExpenseInput) => Promise<void>;
}

function SortableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors"
      >
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUpIcon className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ArrowDownIcon className="h-3.5 w-3.5" aria-hidden />
          )
        ) : (
          <ArrowUpDownIcon className="h-3.5 w-3.5 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
  );
}

export function ExpenseList({
  expenses,
  isLoading,
  error,
  refetchExpenses,
  deleteExpense,
}: ExpenseListProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);

  // Volta para a primeira página quando o filtro ou a busca mudam
  useEffect(() => {
    setPage(1);
  }, [search, expenses]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matching = term
      ? expenses.filter(
          (expense) =>
            expense.vendor?.toLowerCase().includes(term) ||
            expense.items?.some((item) => item.name?.toLowerCase().includes(term))
        )
      : expenses;

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...matching].sort((a, b) => {
      switch (sortKey) {
        case 'total':
          return (expenseTotal(a) - expenseTotal(b)) * direction;
        case 'vendor':
          return (a.vendor || '').localeCompare(b.vendor || '', 'pt-BR') * direction;
        default:
          return a.date.localeCompare(b.date) * direction;
      }
    });
  }, [expenses, search, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'vendor' ? 'asc' : 'desc');
    }
  };

  const handleDelete = async (receiptId: string, date: string, vendor: string) => {
    if (window.confirm(`Tem certeza que deseja deletar a despesa de "${vendor}"?`)) {
      try {
        await deleteExpense(receiptId, date);
      } catch {
        // Erro já tratado pelo toast no hook
      }
    }
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center text-destructive">
          Erro ao carregar despesas: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Despesas</CardTitle>
          <CardDescription>
            {filtered.length === expenses.length
              ? `${expenses.length} ${expenses.length === 1 ? 'lançamento' : 'lançamentos'} no período`
              : `${filtered.length} de ${expenses.length} lançamentos`}
          </CardDescription>
        </div>
        <div className="relative w-full sm:w-72">
          <SearchIcon
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Buscar por vendedor ou item..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && expenses.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">Carregando despesas...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">
            {search
              ? 'Nenhuma despesa corresponde à busca.'
              : 'Nenhuma despesa encontrada no período.'}
          </p>
        ) : (
          <>
            <div
              className="overflow-x-auto transition-opacity"
              style={{ opacity: isLoading ? 0.6 : 1 }}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="Data"
                      sortKey="date"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="w-28"
                    />
                    <SortableHead
                      label="Vendedor"
                      sortKey="vendor"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <TableHead className="hidden md:table-cell">Itens</TableHead>
                    <SortableHead
                      label="Total"
                      sortKey="total"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="text-right [&>button]:ml-auto [&>button]:flex"
                    />
                    <TableHead className="w-24 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((expense) => (
                    <TableRow key={expense.receipt_id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {format(parseISO(expense.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="max-w-56 truncate font-medium">
                        {expense.vendor}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-md">
                        {expense.items && expense.items.length > 0 ? (
                          <span className="block truncate text-sm text-muted-foreground">
                            {expense.items
                              .slice(0, 3)
                              .map((item) => item.name)
                              .join(', ')}
                            {expense.items.length > 3 && ` +${expense.items.length - 3}`}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium whitespace-nowrap">
                        {formatCurrency(expense.total)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center items-center gap-1.5">
                          <EditExpenseDialog expense={expense} onSuccess={refetchExpenses} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              handleDelete(expense.receipt_id, expense.date, expense.vendor)
                            }
                          >
                            <Trash2Icon className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Deletar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeftIcon className="h-4 w-4" aria-hidden />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                    <ChevronRightIcon className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
