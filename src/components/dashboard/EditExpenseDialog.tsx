// src/components/dashboard/EditExpenseDialog.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/dashboard/ExpenseForm'; // Importar o formulário de despesas
import { PencilIcon } from 'lucide-react';
import { Expense } from '@/lib/types'; // Importar o tipo Expense

interface EditExpenseDialogProps {
  expense: Expense; // A despesa a ser editada
  onSuccess: () => void; // Callback para recarregar a lista após a edição
}

export function EditExpenseDialog({ expense, onSuccess }: EditExpenseDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false); // Fecha o modal após sucesso
    onSuccess(); // Chama o callback para o componente pai (refetchExpenses)
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <PencilIcon className="h-4 w-4" />
          <span className="sr-only">Editar</span> {/* Texto acessível para leitores de tela */}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Editar Despesa</DialogTitle>
          <DialogDescription>
            Faça as alterações necessárias na despesa selecionada.
          </DialogDescription>
        </DialogHeader>
        {/* Passa a despesa para o ExpenseForm para preenchê-lo */}
        <ExpenseForm expenseToEdit={expense} onManualExpenseSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}