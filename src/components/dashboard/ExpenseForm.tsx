// src/components/dashboard/ExpenseForm.tsx
'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PlusCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ManualExpenseInput } from '@/lib/types';

// Esquema de validação com Zod
const formSchema = z.object({
  date: z.date({
    required_error: 'A data é obrigatória.',
  }),
  vendor: z.string().min(2, {
    message: 'O nome do vendedor deve ter pelo menos 2 caracteres.',
  }),
  total: z.string().regex(/^\d+(\.\d{1,2})?$/, {
    message: 'O total deve ser um número válido (ex: 123.45).',
  }),
  items: z.array(
    z.object({
      name: z.string().min(1, 'Nome do item é obrigatório.'),
      price: z.string().regex(/^\d+(\.\d{1,2})?$/, {
        message: 'Preço deve ser um número válido.',
      }),
      quantity: z.string().regex(/^\d+$/, {
        message: 'Quantidade deve ser um número inteiro.',
      }),
    })
  ).min(1, 'Adicione pelo menos um item.'),
});

interface ExpenseFormProps {
  onManualExpenseSuccess: () => void;
}

export function ExpenseForm({ onManualExpenseSuccess }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      vendor: '',
      total: '0.00',
      items: [{ name: '', price: '', quantity: '1' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      // Verificar se o usuário está autenticado
      const user = await getCurrentUser();
      
      if (!user) {
        toast.error('Por favor, faça login para adicionar despesas.');
        return;
      }

      // Obter a sessão e o token JWT
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        toast.error('Não foi possível obter o token de autenticação.');
        return;
      }

      const expenseData: ManualExpenseInput = {
        ...values,
        date: format(values.date, 'yyyy-MM-dd'),
        total: parseFloat(values.total).toFixed(2),
        items: values.items.map(item => ({
          ...item,
          price: parseFloat(item.price).toFixed(2),
          quantity: parseInt(item.quantity).toString(),
        })),
      };

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
      form.reset();
      onManualExpenseSuccess();
    } catch (error: any) {
      console.error('Erro ao adicionar despesa:', error);
      
      // Tratamento específico para erros de autenticação
      if (error.name === 'UserUnAuthenticatedException' || error.name === 'NotAuthorizedException') {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else {
        toast.error(error.message || 'Não foi possível adicionar a despesa.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <h3 className="text-lg font-medium">Digitar Despesa Manualmente</h3>

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
                  {field.value ? format(field.value, 'PPP') : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  initialFocus
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
        <Input id="total" type="text" {...form.register('total')} placeholder="0.00" />
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
            <Input id={`items.${index}.price`} type="text" {...form.register(`items.${index}.price`)} placeholder="0.00" />
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
      <Button type="button" variant="outline" onClick={() => append({ name: '', price: '', quantity: '1' })}>
        <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Item
      </Button>
      {form.formState.errors.items && typeof form.formState.errors.items.message === 'string' && (
        <p className="text-sm text-red-500">{form.formState.errors.items.message}</p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Salvar Despesa'}
      </Button>
    </form>
  );
}