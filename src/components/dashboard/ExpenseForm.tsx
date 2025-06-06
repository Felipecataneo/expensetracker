// src/components/dashboard/ExpenseForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PlusCircle, MinusCircle } from 'lucide-react';
import { cn, parseInputToFloatString, formatNumberForInput } from '@/lib/utils';
import { toast } from 'sonner';
import { ManualExpenseInput, Expense } from '@/lib/types';
import { useExpenses } from '@/hooks/useExpenses';

// Função para formatar data de forma segura (sem timezone issues)
const formatDateForAPI = (date: Date): string => {
  // Use getTime() para garantir que estamos trabalhando com a data local
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().split('T')[0];
};

// Esquema de validação com Zod
const formSchema = z.object({
  date: z.date({
    required_error: 'A data é obrigatória.',
  }),
  vendor: z.string().min(2, {
    message: 'O nome do vendedor deve ter pelo menos 2 caracteres.',
  }),
  // Validação mais flexível - aceita diferentes formatos de número
  total: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true; // Campo opcional
      // Remove pontos e substitui vírgula por ponto para validação
      const cleanValue = val.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleanValue);
      return !isNaN(num) && num >= 0;
    }, {
      message: 'Digite um valor válido (ex: 3000, 3.000, 3000,50)',
    }),
  items: z.array(
    z.object({
      name: z.string().min(1, 'Nome do item é obrigatório.'),
      price: z.string()
        .optional()
        .or(z.literal(''))
        .refine((val) => {
          if (!val || val === '') return true; // Campo opcional
          // Remove pontos e substitui vírgula por ponto para validação
          const cleanValue = val.replace(/\./g, '').replace(',', '.');
          const num = parseFloat(cleanValue);
          return !isNaN(num) && num >= 0;
        }, {
          message: 'Digite um valor válido (ex: 25, 25,90)',
        }),
      quantity: z.string().regex(/^\d+$/, {
        message: 'Quantidade deve ser um número inteiro.',
      }),
    })
  ).min(1, 'Adicione pelo menos um item.'),
});

// Função para formatar número de forma mais inteligente
const formatCurrency = (value: string): string => {
  if (!value || value === '') return '';
  
  // Remove tudo que não for dígito, vírgula ou ponto
  let cleanValue = value.replace(/[^\d.,]/g, '');
  
  // Se só tem dígitos, formata automaticamente
  if (/^\d+$/.test(cleanValue)) {
    const num = parseInt(cleanValue);
    if (num < 100) {
      // Para números pequenos, não adiciona separador de milhares
      return cleanValue;
    } else {
      // Para números grandes, adiciona separador de milhares
      return num.toLocaleString('pt-BR');
    }
  }
  
  // Se tem vírgula, assume que é decimal
  if (cleanValue.includes(',')) {
    const parts = cleanValue.split(',');
    if (parts.length === 2) {
      const integerPart = parts[0].replace(/\./g, ''); // Remove pontos existentes
      const decimalPart = parts[1].slice(0, 2); // Máximo 2 decimais
      
      if (integerPart.length > 3) {
        const formattedInteger = parseInt(integerPart).toLocaleString('pt-BR');
        return `${formattedInteger},${decimalPart}`;
      } else {
        return `${integerPart},${decimalPart}`;
      }
    }
  }
  
  return cleanValue;
};

// Função para converter para float (para envio à API)
const parseToFloat = (value: string): number => {
  if (!value || value === '') return 0;
  // Remove pontos (separadores de milhares) e substitui vírgula por ponto
  const cleanValue = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanValue) || 0;
};

// Componente de Input melhorado para valores monetários
const CurrencyInput = ({ field, placeholder = "0,00", id }: any) => (
  <Input
    id={id}
    type="text"
    {...field}
    placeholder={placeholder}
    onChange={(e) => {
      const formatted = formatCurrency(e.target.value);
      field.onChange(formatted);
    }}
    onBlur={(e) => {
      // Formatação final no blur
      const formatted = formatCurrency(e.target.value);
      field.onChange(formatted);
    }}
    value={field.value ?? ''}
  />
);

interface ExpenseFormProps {
  onManualExpenseSuccess: () => void;
  expenseToEdit?: Expense;
}

export function ExpenseForm({ onManualExpenseSuccess, expenseToEdit }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateExpense } = useExpenses();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: expenseToEdit ? parseISO(expenseToEdit.date) : new Date(),
      vendor: expenseToEdit?.vendor || '',
      // Se estiver editando e o total for 0, ou se não estiver editando, inicializa como vazio.
      // Caso contrário, formata o total para exibição no input.
      total: expenseToEdit && parseFloat(expenseToEdit.total) !== 0 ? formatNumberForInput(expenseToEdit.total) : '',
      items: expenseToEdit?.items?.map(item => ({
        name: item.name,
        // Mesma lógica para o preço do item
        price: parseFloat(item.price) !== 0 ? formatNumberForInput(item.price) : '', 
        quantity: item.quantity,
      })) || [{ name: '', price: '', quantity: '1' }], // Default price to empty string
    },
  });

  // Resetar o formulário quando expenseToEdit mudar
  useEffect(() => {
    if (expenseToEdit) {
      form.reset({
        date: parseISO(expenseToEdit.date),
        vendor: expenseToEdit.vendor,
        total: parseFloat(expenseToEdit.total) !== 0 ? formatNumberForInput(expenseToEdit.total) : '',
        items: expenseToEdit.items.map(item => ({
          name: item.name,
          price: parseFloat(item.price) !== 0 ? formatNumberForInput(item.price) : '',
          quantity: item.quantity,
        })),
      });
    } else {
      form.reset({
        date: new Date(),
        vendor: '',
        total: '', // Default para string vazia
        items: [{ name: '', price: '', quantity: '1' }], // Default para string vazia
      });
    }
  }, [expenseToEdit, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Por favor, faça login para adicionar/atualizar despesas.');
        return;
      }

      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) {
        toast.error('Não foi possível obter o token de autenticação.');
        return;
      }

      const formattedDate = formatDateForAPI(values.date);

      // Trata strings vazias de total/preço, convertendo para '0.00' antes de enviar.
      // Usa parseFloat para garantir que o valor seja um número, e toFixed(2) para 2 casas decimais.
      const totalValue = values.total ? parseFloat(parseInputToFloatString(values.total)).toFixed(2) : '0.00';
      
      const expenseData: ManualExpenseInput = {
        date: formattedDate,
        vendor: values.vendor,
        total: parseToFloat(values.total || '').toFixed(2),
        items: values.items.map(item => ({
          name: item.name,
          price: parseToFloat(item.price || '').toFixed(2),
          quantity: parseInt(item.quantity || '1').toString(),
        })),
      };

      if (expenseToEdit) {
        await updateExpense(expenseToEdit.receipt_id, expenseData);
        toast.success('Despesa atualizada com sucesso.');
      } else {
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(expenseData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao adicionar despesa manualmente.');
        }
        toast.success('A despesa foi registrada com sucesso.');
      }
      
      // Reseta o formulário após o sucesso
      form.reset({
        date: new Date(),
        vendor: '',
        total: '',
        items: [{ name: '', price: '', quantity: '1' }],
      });
      onManualExpenseSuccess();
    } catch (error: any) {
      console.error('Erro ao adicionar/atualizar despesa:', error);
      if (error.name === 'UserUnAuthenticatedException' || error.name === 'NotAuthorizedException') {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else {
        toast.error(error.message || `Não foi possível ${expenseToEdit ? 'atualizar' : 'adicionar'} a despesa.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <h3 className="text-lg font-medium">{expenseToEdit ? 'Editar Despesa' : 'Digitar Despesa Manualmente'}</h3>

      {/* Data */}
      <div className="grid gap-2">
        <Label htmlFor="date">Data</Label>
        <Controller
          control={form.control}
          name="date"
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                {/* w-full para responsividade em telas pequenas, sm:w-[280px] para telas maiores */}
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full sm:w-[280px] justify-start text-left font-normal',
                    !field.value && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? format(field.value, 'dd/MM/yyyy', { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          )}
        />
        {form.formState.errors.date && (
          <p className="text-sm text-red-500">{form.formState.errors.date.message}</p>
        )}
      </div>

      {/* Vendedor */}
      <div className="grid gap-2">
        <Label htmlFor="vendor">Vendedor</Label>
        <Input id="vendor" {...form.register('vendor')} />
        {form.formState.errors.vendor && (
          <p className="text-sm text-red-500">{form.formState.errors.vendor.message}</p>
        )}
      </div>

      {/* Total */}
      <div className="grid gap-2">
        <Label htmlFor="total">Total</Label>
        <Controller
          control={form.control}
          name="total"
          render={({ field }) => (
            <CurrencyInput field={field} placeholder="0,00" id="total" />
          )}
        />
        {form.formState.errors.total && (
          <p className="text-sm text-red-500">{form.formState.errors.total.message}</p>
        )}
      </div>

      {/* Itens da Despesa */}
      <h4 className="text-md font-medium">Itens da Despesa</h4>
      {fields.map((field, index) => (
        // Container do item com flexbox para empilhar em telas pequenas
        <div key={field.id} className="border p-4 rounded-md flex flex-col gap-4">
          {/* Grid para os campos de input, empilha em mobile, colunas proporcionais em sm+ */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(120px,2fr)_minmax(80px,1fr)_minmax(60px,0.5fr)]"> 
            <div className="grid gap-2">
              <Label htmlFor={`items.${index}.name`}>Nome do Item</Label>
              <Input id={`items.${index}.name`} {...form.register(`items.${index}.name`)} />
              {form.formState.errors.items?.[index]?.name && (
                <p className="text-sm text-red-500">{form.formState.errors.items[index]?.name?.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`items.${index}.price`}>Preço</Label>
              <Controller
                control={form.control}
                name={`items.${index}.price`}
                render={({ field }) => (
                  <CurrencyInput field={field} placeholder="0,00" id={`items.${index}.price`} />
                )}
              />
              {form.formState.errors.items?.[index]?.price && (
                <p className="text-sm text-red-500">{form.formState.errors.items[index]?.price?.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`items.${index}.quantity`}>Qtd.</Label>
              <Input id={`items.${index}.quantity`} type="number" {...form.register(`items.${index}.quantity`)} placeholder="1" min="1" />
              {form.formState.errors.items?.[index]?.quantity && (
                <p className="text-sm text-red-500">{form.formState.errors.items[index]?.quantity?.message}</p>
              )}
            </div>
          </div>
          {fields.length > 1 && (
            <div className="flex justify-end"> 
              <Button type="button" variant="destructive" onClick={() => remove(index)} className="w-full sm:w-auto">
                <MinusCircle className="h-4 w-4 mr-2" /> Remover Item
              </Button>
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-4">
        <Button type="button" variant="outline" onClick={() => append({ name: '', price: '', quantity: '1' })}> 
          <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Item
        </Button>
        {form.formState.errors.items && typeof form.formState.errors.items.message === 'string' && (
          <p className="text-sm text-red-500">{form.formState.errors.items.message}</p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : (expenseToEdit ? 'Salvar Alterações' : 'Salvar Despesa')}
        </Button>
      </div>
    </form>
  );
}