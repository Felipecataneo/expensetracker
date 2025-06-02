// src/components/dashboard/AddExpenseDialog.tsx
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReceiptUpload } from './ReceiptUpload';
import { ExpenseForm } from './ExpenseForm';
import { PlusIcon } from 'lucide-react';

interface AddExpenseDialogProps {
  onSuccess: () => void; // Callback para quando uma despesa é adicionada/upload
}

export function AddExpenseDialog({ onSuccess }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false); // Fecha o modal após sucesso
    onSuccess(); // Chama o callback para o componente pai
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" /> Adicionar Despesa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Despesa</DialogTitle>
          <DialogDescription>
            Escolha como você quer adicionar sua despesa: via upload de recibo ou preenchendo manualmente.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload de Recibo</TabsTrigger>
            <TabsTrigger value="manual">Digitar Manualmente</TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <ReceiptUpload onUploadSuccess={handleSuccess} />
          </TabsContent>
          <TabsContent value="manual">
            <ExpenseForm onManualExpenseSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}