// src/app/api/expenses/[receipt_id]/route.ts
import { NextResponse } from 'next/server';
import { ManualExpenseInput } from '@/lib/types';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ receipt_id: string }> }
) {
  console.log('=== PUT REQUEST DEBUG ===');
  console.log('API_GATEWAY_URL:', API_GATEWAY_URL);
  
  const resolvedParams = await params;
  console.log('Receipt ID:', resolvedParams.receipt_id);

  if (!API_GATEWAY_URL) {
    console.error('API Gateway URL not configured');
    return NextResponse.json({ error: 'API Gateway URL not configured' }, { status: 500 });
  }

  try {
    const token = req.headers.get('Authorization');
    if (!token) {
      console.error('Authorization token missing');
      return NextResponse.json({ error: 'Authorization token is missing' }, { status: 401 });
    }

    const receiptId = resolvedParams.receipt_id;
    const expenseData: ManualExpenseInput = await req.json();
    
    console.log('Expense data to update:', JSON.stringify(expenseData, null, 2));
    console.log('Full API URL:', `${API_GATEWAY_URL}/expenses/${receiptId}`);

    const response = await fetch(`${API_GATEWAY_URL}/expenses/${receiptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify(expenseData),
    });

    console.log('Backend response status:', response.status);
    console.log('Backend response headers:', Object.fromEntries(response.headers));

    const responseText = await response.text();
    console.log('Backend response body:', responseText);

    if (!response.ok) {
      console.error('Backend returned error:', responseText);
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { success: true, message: 'Updated successfully' };
    }

    console.log('Returning success result:', result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('=== PUT ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ error: error.message || 'Falha ao atualizar despesa' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ receipt_id: string }> }
) {
  console.log('=== DELETE REQUEST DEBUG ===');
  console.log('API_GATEWAY_URL:', API_GATEWAY_URL);
  
  const resolvedParams = await params;
  const receiptId = resolvedParams.receipt_id;
  console.log('Receipt ID:', receiptId);

  if (!API_GATEWAY_URL) {
    console.error('API Gateway URL not configured');
    return NextResponse.json({ error: 'API Gateway URL not configured' }, { status: 500 });
  }

  try {
    const token = req.headers.get('Authorization');
    if (!token) {
      console.error('Authorization token missing');
      return NextResponse.json({ error: 'Authorization token is missing' }, { status: 401 });
    }

    // --- NOVO: Obter o 'date' do corpo da requisição ---
    let requestBody;
    try {
        requestBody = await req.json();
    } catch (e) {
        console.error('Error parsing DELETE request body:', e);
        // Se o corpo não é JSON válido ou está vazio, é um erro 400
        return NextResponse.json({ error: 'Invalid JSON body for DELETE request' }, { status: 400 });
    }
    
    const date = requestBody?.date; // Acessa 'date' de forma segura

    if (!date) {
      console.error('Date missing in body for DELETE request.');
      return NextResponse.json({ error: 'Date is required in the request body for deletion' }, { status: 400 });
    }
    // --- FIM NOVO ---

    console.log('Full API URL:', `${API_GATEWAY_URL}/expenses/${receiptId}`);
    console.log('Sending DELETE request with body:', JSON.stringify({ date: date }));

    const response = await fetch(`${API_GATEWAY_URL}/expenses/${receiptId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json', // Importante para enviar um corpo
        'Authorization': token,
      },
      body: JSON.stringify({ date: date }), // Envia o 'date' no corpo
    });

    console.log('Backend response status:', response.status);
    console.log('Backend response headers:', Object.fromEntries(response.headers));

    const responseText = await response.text();
    console.log('Backend response body (raw):', responseText);

    if (!response.ok) {
      console.error('Backend returned error:', response.status, responseText);
      let errorData;
      try {
        errorData = JSON.parse(responseText);
        // Verificar se é uma resposta aninhada de erro do API Gateway
        if (errorData.statusCode && errorData.body) {
            try {
                errorData = JSON.parse(errorData.body);
            } catch {
                errorData = { message: errorData.body };
            }
        }
      } catch {
        errorData = { message: responseText || `Unknown error: HTTP ${response.status}` };
      }
      
      // Lança um erro para que o bloco `catch` externo o trate
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
    }
    
    // Se a resposta foi OK (status 2xx)
    if (response.status === 204) {
      console.log('Delete completed successfully (204 No Content)');
      return new Response(null, { status: 204 }); // Retorna 204 No Content
    }

    // Caso raro onde o DELETE retorne 2xx com conteúdo (não esperado do seu Lambda 204)
    let result;
    try {
        result = responseText ? JSON.parse(responseText) : { success: true, message: 'Operation successful' };
    } catch {
        result = { success: true, message: responseText || 'Operation successful' };
    }
    console.log('Returning success result (non-204):', result);
    return NextResponse.json(result, { status: response.status });

  } catch (error: any) {
    console.error('=== DELETE ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    // Para passar os códigos de erro do backend (e.g., 400, 401, 403, 404),
    // você precisaria de um objeto de erro mais rico que contivesse o status original.
    // Por enquanto, ele retorna 500 para qualquer erro capturado.
    return NextResponse.json({ error: error.message || 'Falha ao deletar despesa' }, { status: 500 });
  }
}