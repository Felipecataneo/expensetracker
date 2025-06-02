// src/components/dashboard/ReceiptUpload.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner'; // substituindo useToast

interface ReceiptUploadProps {
  onUploadSuccess: () => void;
}

export function ReceiptUpload({ onUploadSuccess }: ReceiptUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Nenhum arquivo selecionado', {
        description: 'Por favor, selecione um recibo para upload.',
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Obter URL pré-assinada do backend para o upload do arquivo
      const response = await fetch('/api/s3-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Enviar fileName, fileType e fileSize para validação no backend
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao obter URL de upload.');
      }

      const { url, key } = await response.json();
      console.log('Got pre-signed URL for S3:', url);

      // 2. Fazer o upload do arquivo diretamente para o S3 usando a URL pré-assinada
      await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          // Dependendo da sua configuração S3, você pode precisar de 'x-amz-acl': 'public-read'
          // Mas geralmente é melhor controlar permissões via políticas de bucket/IAM e evitar ACLs públicas
        },
        body: file,
      });

      // 3. Informar o usuário sobre o sucesso do upload e o processamento assíncrono
      toast.success('Recibo enviado com sucesso!', {
        description: `O recibo "${file.name}" foi enviado e está sendo processado. Ele aparecerá em breve na lista de despesas.`,
        duration: 5000, // Manter o toast visível por mais tempo para o usuário ler
      });

      setFile(null); // Limpar o input do arquivo

      // 4. Adicionar um pequeno atraso antes de fechar o modal e refazer o fetch de despesas.
      // Isso dá ao fluxo S3 -> Lambda (Textract) -> DynamoDB um tempo para ser concluído.
      // É uma heurística, não garante a conclusão, mas melhora a UX.
      setTimeout(() => {
        onUploadSuccess(); // Chama o callback para fechar o modal e refazer o fetch no componente pai
      }, 3000); // Atraso de 3 segundos

    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro no upload', {
        description: error.message || 'Não foi possível fazer o upload do recibo. Por favor, tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Anexar Recibo</h3>
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="receipt">Recibo (imagem ou PDF)</Label>
        <Input id="receipt" type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
      </div>
      {file && (
        <p className="text-sm text-muted-foreground">
          Arquivo selecionado: {file.name} ({Math.round(file.size / 1024)} KB)
        </p>
      )}
      <Button onClick={handleUpload} disabled={!file || loading}>
        {loading ? 'Enviando...' : 'Enviar Recibo'}
      </Button>
    </div>
  );
}