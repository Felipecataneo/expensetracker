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
  total: z.string().regex(/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$/, {
    message: 'O total deve ser um número válido (ex: 123,45 ou 1.234,56).',
  }),
  items: z.array(
    z.object({
      name: z.string().min(1, 'Nome do item é obrigatório.'),
      price: z.string().regex(/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$/, {
        message: 'Preço deve ser um número válido (ex: 12,34).',
      }),
      quantity: z.string().regex(/^\d+$/, {
        message: 'Quantidade deve ser um número inteiro.',
      }),
    })
  ).min(1, 'Adicione pelo menos um item.'),
});

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
      total: expenseToEdit ? formatNumberForInput(expenseToEdit.total) : '0,00',
      items: expenseToEdit?.items?.map(item => ({
        name: item.name,
        price: formatNumberForInput(item.price),
        quantity: item.quantity,
      })) || [{ name: '', price: '0,00', quantity: '1' }],
    },
  });

  useEffect(() => {
    if (expenseToEdit) {
      form.reset({
        date: parseISO(expenseToEdit.date),
        vendor: expenseToEdit.vendor,
        total: formatNumberForInput(expenseToEdit.total),
        items: expenseToEdit.items.map(item => ({
          name: item.name,
          price: formatNumberForInput(item.price),
          quantity: item.quantity,
        })),
      });
    } else {
      form.reset({
        date: new Date(),
        vendor: '',
        total: '0,00',
        items: [{ name: '', price: '0,00', quantity: '1' }],
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

      // Debug: vamos ver o que está sendo enviado
      const formattedDate = formatDateForAPI(values.date);
      console.log('Data selecionada:', values.date);
      console.log('Data formatada para API:', formattedDate);
      console.log('Timezone offset:', values.date.getTimezoneOffset());

      const expenseData: ManualExpenseInput = {
        date: formattedDate,
        vendor: values.vendor,
        total: parseFloat(parseInputToFloatString(values.total)).toFixed(2),
        items: values.items.map(item => ({
          name: item.name,
          price: parseFloat(parseInputToFloatString(item.price)).toFixed(2),
          quantity: parseInt(item.quantity).toString(),
        })),
      };

      console.log('Dados enviados para API:', expenseData);

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
      
      form.reset();
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
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-[280px] justify-start text-left font-normal',
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
        <Input 
          id="total" 
          type="text" 
          {...form.register('total')} 
          placeholder="0,00"
        />
        {form.formState.errors.total && (
          <p className="text-sm text-red-500">{form.formState.errors.total.message}</p>
        )}
      </div>

      {/* Itens da Despesa */}
      <h4 className="text-md font-medium">Itens da Despesa</h4>
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border p-4 rounded-md">
          <div className="grid gap-2 col-span-2">
            <Label htmlFor={`items.${index}.name`}>Nome do Item</Label>
            <Input id={`items.${index}.name`} {...form.register(`items.${index}.name`)} />
            {form.formState.errors.items?.[index]?.name && (
              <p className="text-sm text-red-500">{form.formState.errors.items[index]?.name?.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`items.${index}.price`}>Preço</Label>
            <Input 
              id={`items.${index}.price`} 
              type="text" 
              {...form.register(`items.${index}.price`)} 
              placeholder="0,00"
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
          {fields.length > 1 && (
            <Button type="button" variant="destructive" onClick={() => remove(index)} className="col-span-1 md:col-span-4 lg:col-span-1">
              <MinusCircle className="h-4 w-4 mr-2" /> Remover Item
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => append({ name: '', price: '0,00', quantity: '1' })}>
        <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Item
      </Button>
      {form.formState.errors.items && typeof form.formState.errors.items.message === 'string' && (
        <p className="text-sm text-red-500">{form.formState.errors.items.message}</p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : (expenseToEdit ? 'Salvar Alterações' : 'Salvar Despesa')}
      </Button>
    </form>
  );
}