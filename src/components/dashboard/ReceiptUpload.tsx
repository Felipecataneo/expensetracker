// src/components/dashboard/ReceiptUpload.tsx
'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

interface ReceiptUploadProps {
  onUploadSuccess: () => void;
}

export function ReceiptUpload({ onUploadSuccess }: ReceiptUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();

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

    if (!isAuthenticated || !user) {
      toast.error('Não autenticado', {
        description: 'Por favor, faça login para enviar recibos.',
      });
      return;
    }

    setLoading(true);
    
    try {
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        throw new Error('Token de autenticação não encontrado');
      }

      const token = session.tokens.idToken.toString();

      const currentUser = await getCurrentUser();
      const userId = currentUser.userId;

      // 1. Obter URL pré-assinada do nosso API Route
      const response = await fetch('/api/s3-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          fileName: file.name, 
          fileType: file.type, 
          userId: userId 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const { url, key } = await response.json();
      console.log('Got pre-signed URL for S3:', url);

      // 2. Fazer upload do arquivo diretamente para o S3
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Falha no upload para S3');
      }

      toast.success('Upload de recibo sucesso!', {
        description: `O recibo "${file.name}" foi enviado e está sendo processado. Pode levar alguns segundos para aparecer na lista.`,
      });

      // Limpar o estado do arquivo
      setFile(null);
      // Reset do input file
      const fileInput = document.getElementById('receipt') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // --- NOVO: Introduzir um atraso antes de chamar onUploadSuccess ---
      // 3 segundos é um bom ponto de partida, ajuste se necessário.
      setTimeout(() => {
        onUploadSuccess(); // Chama o refetchExpenses do componente pai
      }, 6000); // Espera 3 segundos

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
        <Input 
          id="receipt" 
          type="file" 
          accept="image/*,application/pdf" 
          onChange={handleFileChange}
          disabled={loading || !isAuthenticated}
        />
      </div>
      {file && (
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Arquivo selecionado: {file.name}</p>
          <p>Tamanho: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}
      <Button 
        onClick={handleUpload} 
        disabled={!file || loading || !isAuthenticated}
        className="w-full sm:w-auto"
      >
        {loading ? 'Enviando...' : 'Enviar Recibo'}
      </Button>
    </div>
  );
}