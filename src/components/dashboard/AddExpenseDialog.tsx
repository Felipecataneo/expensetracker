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
import { CsvUpload } from './CsvUpload'; // Importar o novo componente

interface AddExpenseDialogProps {
  onSuccess: () => void; // Callback para quando uma despesa é adicionada/upload
}

export function AddExpenseDialog({ onSuccess }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    // Um pequeno delay pode dar tempo para os toasts serem exibidos antes de fechar o modal
    setTimeout(() => {
        setOpen(false); // Fecha o modal após sucesso
        onSuccess(); // Chama o callback para o componente pai
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" /> Adicionar Despesa
        </Button>
      </DialogTrigger>
      {/* Aumenta a largura para acomodar a tabela de pré-visualização do CSV */}
      <DialogContent className="sm:max-w-[800px]"> 
        <DialogHeader>
          <DialogTitle>Adicionar Nova Despesa</DialogTitle>
          <DialogDescription>
            Escolha como você quer adicionar sua despesa.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="upload" className="w-full">
          {/* Altera para 3 colunas em telas maiores, e 1 em telas pequenas para responsividade */}
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="upload">Upload de Recibo</TabsTrigger>
            <TabsTrigger value="manual">Digitar Manualmente</TabsTrigger>
            <TabsTrigger value="csv">Upload CSV (C6)</TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <ReceiptUpload onUploadSuccess={handleSuccess} />
          </TabsContent>
          <TabsContent value="manual">
            <ExpenseForm onManualExpenseSuccess={handleSuccess} />
          </TabsContent>
          {/* Adiciona o conteúdo da nova aba para o upload de CSV */}
          <TabsContent value="csv">
            <CsvUpload onUploadSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}