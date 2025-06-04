export interface ExpenseItem {
  name: string;
  price: string; // Armazenado como string para consistência com Textract
  quantity: string;
}

export interface Expense {
  receipt_id: string;
  date: string; // Formato YYYY-MM-DD
  vendor: string;
  total: string; // Armazenado como string para consistência com Textract
  items: ExpenseItem[];
  s3_path?: string; // Opcional, se veio de upload
  processed_timestamp: string;
}

// Tipos para as APIs
export interface UploadPresignedUrlResponse {
  url: string;
  key: string;
  userId: string;
}

export interface ManualExpenseInput {
  date: string;
  vendor: string;
  total: string;
  items: ExpenseItem[];
}