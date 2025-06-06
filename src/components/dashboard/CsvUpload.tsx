// src/components/dashboard/CsvUpload.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { ManualExpenseInput } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { format, parse } from 'date-fns';

interface CsvUploadProps {
  onUploadSuccess: () => void;
}

// Helper para parsear data de DD/MM/YYYY para YYYY-MM-DD
const parseCsvDate = (dateStr: string): string => {
  try {
    const parsedDate = parse(dateStr, 'dd/MM/yyyy', new Date());
    return format(parsedDate, 'yyyy-MM-dd');
  } catch (error) {
    console.error(`Invalid date format: ${dateStr}`);
    return '';
  }
};

export function CsvUpload({ onUploadSuccess }: CsvUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedExpenses, setParsedExpenses] = useState<ManualExpenseInput[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setParsedExpenses([]);
      setError(null);
    } else {
      setFile(null);
    }
  };

  const processFile = useCallback(() => {
    if (!file) {
      setError('Por favor, selecione um arquivo CSV.');
      return;
    }
    setIsParsing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).slice(1); // Pula o cabeçalho, suporta \n e \r\n

        const expenses: ManualExpenseInput[] = [];
        lines.forEach((line, index) => {
          if (!line.trim()) return; // Pula linhas vazias

          const columns = line.split(';');
          if (columns.length < 9) {
            console.warn(`Linha ${index + 2}: número de colunas inválido. Pulando.`);
            return;
          }

          const dateStr = columns[0]?.trim();
          const category = columns[3]?.trim();
          const vendor = columns[4]?.trim();
          const valueStr = columns[8]?.trim();

          const value = parseFloat(valueStr);

          // Filtra pagamentos, estornos e entradas inválidas
          if (!vendor || !category || category === '-' || isNaN(value) || value <= 0) {
            return;
          }

          const formattedDate = parseCsvDate(dateStr);
          if (!formattedDate) {
            console.warn(`Linha ${index + 2}: formato de data inválido "${dateStr}". Pulando.`);
            return;
          }

          const expense: ManualExpenseInput = {
            date: formattedDate,
            vendor: vendor,
            total: value.toFixed(2),
            items: [{
              name: category,
              price: value.toFixed(2),
              quantity: '1'
            }]
          };
          expenses.push(expense);
        });

        if (expenses.length === 0) {
          toast.info("Nenhuma despesa válida encontrada", {
            description: "O arquivo foi processado, mas não continha nenhuma linha de despesa válida para importar.",
          });
        }
        setParsedExpenses(expenses);
      } catch (e: any) {
        setError(`Erro ao processar o arquivo: ${e.message}`);
        toast.error("Erro no Processamento", {
          description: "Não foi possível ler o arquivo. Verifique se o formato está correto.",
        });
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setError('Não foi possível ler o arquivo.');
      setIsParsing(false);
    };

    // Usa 'windows-1252' para tratar corretamente caracteres da língua portuguesa
    reader.readAsText(file, 'windows-1252');
  }, [file]);

  const handleSubmit = async () => {
    if (parsedExpenses.length === 0) {
      toast.warning("Nada a enviar", { description: "Não há despesas processadas para enviar." });
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.');
      }

      let successCount = 0;
      let errorCount = 0;
      const totalToSubmit = parsedExpenses.length;

      toast.info(`Iniciando envio de ${totalToSubmit} despesas...`);

      for (const expense of parsedExpenses) {
        try {
          const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(expense),
          });
          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Falha ao enviar despesa "${expense.vendor}":`, await response.text());
          }
        } catch (e) {
          errorCount++;
          console.error(`Erro de rede ao enviar despesa "${expense.vendor}":`, e);
        }
      }

      if (errorCount > 0) {
        toast.warning('Envio Parcialmente Completo', {
          description: `${successCount} de ${totalToSubmit} despesas enviadas com sucesso. ${errorCount} falharam.`,
        });
      } else {
        toast.success('Envio Concluído!', {
          description: `Todas as ${successCount} despesas foram enviadas com sucesso.`,
        });
      }

      setFile(null);
      setParsedExpenses([]);
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      onUploadSuccess();

    } catch (error: any) {
      toast.error('Erro na Submissão', {
        description: error.message || 'Ocorreu um erro ao preparar o envio. Verifique seu login.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <h3 className="text-lg font-medium">Upload de Fatura C6 (CSV)</h3>
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="csv-upload">Arquivo CSV</Label>
        <Input
          id="csv-upload"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={isParsing || isSubmitting}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button
        onClick={processFile}
        disabled={!file || isParsing || isSubmitting || parsedExpenses.length > 0}
      >
        {isParsing ? 'Processando...' : 'Processar Arquivo'}
      </Button>

      {parsedExpenses.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold">Despesas para Importar ({parsedExpenses.length})</h4>
          <div className="max-h-64 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedExpenses.map((exp, index) => (
                  <TableRow key={index}>
                    <TableCell>{format(parse(exp.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="max-w-xs truncate">{exp.vendor}</TableCell>
                    <TableCell className="max-w-xs truncate">{exp.items[0].name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(exp.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : `Enviar ${parsedExpenses.length} Despesas`}
          </Button>
        </div>
      )}
    </div>
  );
}