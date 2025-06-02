// src/app/api/s3-upload/route.ts
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Inicializar cliente S3
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

// Tipos de arquivo permitidos para notas fiscais
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'application/pdf'
];

// Tamanho máximo do arquivo (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const { fileName, fileType, fileSize } = await req.json();

    // Validação de entrada
    if (!fileName || !fileType) {
      return NextResponse.json({ 
        error: 'fileName and fileType are required' 
      }, { status: 400 });
    }

    // Validar tipo de arquivo
    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
      return NextResponse.json({ 
        error: `File type ${fileType} not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}` 
      }, { status: 400 });
    }

    // Validar tamanho do arquivo (se fornecido)
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File size too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      }, { status: 400 });
    }

    const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json({ 
        error: 'S3 bucket name not configured' 
      }, { status: 500 });
    }

    // Sanitizar o nome do arquivo e criar nome único
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueFileName = `receipts/${timestamp}-${uuidv4()}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      ContentType: fileType,
      // Remover ACL se o bucket não tiver ACL habilitado
      Metadata: {
        'original-filename': fileName,
        'upload-timestamp': new Date().toISOString(),
        'content-type': fileType
      }
    });

    // Gerar URL pré-assinada (válida por 1 hora)
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ 
      url, 
      key: uniqueFileName,
      bucket: bucketName,
      expiresIn: 3600
    });

  } catch (error: any) {
    console.error('Error generating pre-signed URL:', error);
    
    // Log detalhado para debug
    if (error.name === 'CredentialsError') {
      console.error('AWS Credentials issue:', error.message);
      return NextResponse.json({ 
        error: 'AWS credentials not configured properly' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: 'Failed to generate pre-signed URL',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}