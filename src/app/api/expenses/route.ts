// src/app/api/expenses/route.ts
import { NextResponse } from 'next/server';
import { Expense, ManualExpenseInput } from '@/lib/types';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

export async function GET(req: Request) {
  if (!API_GATEWAY_URL) {
    return NextResponse.json({ error: 'API Gateway URL not configured' }, { status: 500 });
  }

  try {
    const token = req.headers.get('Authorization');
    if (!token) {
        return NextResponse.json({ error: 'Authorization token is missing' }, { status: 401 });
    }

    const response = await fetch(`${API_GATEWAY_URL}/expenses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || response.statusText);
    }

    const expenses: Expense[] = await response.json();
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
    const token = req.headers.get('Authorization');
    if (!token) {
        return NextResponse.json({ error: 'Authorization token is missing' }, { status: 401 });
    }

    const manualExpense: ManualExpenseInput = await req.json();

    const response = await fetch(`${API_GATEWAY_URL}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify(manualExpense),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || response.statusText);
    }

    const result = await response.json();
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error adding expense manually:', error);
    return NextResponse.json({ error: error.message || 'Failed to add expense manually' }, { status: 500 });
  }
}