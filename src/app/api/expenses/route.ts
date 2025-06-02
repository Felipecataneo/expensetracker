// src/app/api/expenses/route.ts
import { NextResponse } from 'next/server';
import { Expense, ManualExpenseInput } from '@/lib/types';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

export async function GET() {
  if (!API_GATEWAY_URL) {
    return NextResponse.json({ error: 'API Gateway URL not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`${API_GATEWAY_URL}/expenses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Gateway returned HTTP error ${response.status}: ${response.statusText}`);
    }

    // Com Lambda Proxy Integration ativada, a resposta já vem processada
    const expenses: Expense[] = await response.json();
    
    // Verificar se é um array válido
    if (!Array.isArray(expenses)) {
      console.error('Expected array but received:', expenses);
      throw new Error('Invalid data format received from API');
    }
    
    return NextResponse.json(expenses);

  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!API_GATEWAY_URL) {
    return NextResponse.json({ error: 'API Gateway URL not configured' }, { status: 500 });
  }

  try {
    const manualExpense: ManualExpenseInput = await req.json();

    const response = await fetch(`${API_GATEWAY_URL}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(manualExpense),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Gateway returned HTTP error ${response.status}: ${errorData.message || response.statusText}`);
    }

    // Com Lambda Proxy Integration ativada, a resposta já vem processada
    const result = await response.json();

    return NextResponse.json(result, { status: 201 });
    
  } catch (error: any) {
    console.error('Error adding expense manually:', error);
    return NextResponse.json({ error: error.message || 'Failed to add expense manually' }, { status: 500 });
  }
}