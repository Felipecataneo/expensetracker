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
      const response = await fetch('/api/s3-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao obter URL de upload.');
      }

      const { url, key } = await response.json();
      console.log('Got pre-signed URL:', url);

      await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      toast.success('Upload de recibo realizado com sucesso!', {
        description: `O recibo "${file.name}" foi enviado e está sendo processado.`,
      });

      setFile(null);
      onUploadSuccess();
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro no upload', {
        description: error.message || 'Não foi possível fazer o upload do recibo.',
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
      {file && <p className="text-sm text-muted-foreground">Arquivo selecionado: {file.name}</p>}
      <Button onClick={handleUpload} disabled={!file || loading}>
        {loading ? 'Enviando...' : 'Enviar Recibo'}
      </Button>
    </div>
  );
}
