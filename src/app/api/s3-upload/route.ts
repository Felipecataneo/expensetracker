// src/app/api/s3-upload/route.ts
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Certifique-se de configurar suas credenciais AWS e região
// O Next.js irá carregar isso de .env.local
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1', // Defina sua região padrão
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export async function POST(req: Request) {
  try {
    const { fileName, fileType } = await req.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'fileName and fileType are required' }, { status: 400 });
    }

    const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME; // expensetrackerfelipe
    if (!bucketName) {
      return NextResponse.json({ error: 'S3 bucket name not configured' }, { status: 500 });
    }

    // Criar um nome de arquivo único para evitar colisões
    const uniqueFileName = `${uuidv4()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      ContentType: fileType,
      ACL: 'private', // Mantenha os objetos privados para a Lambda processar
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL válida por 1 hora

    return NextResponse.json({ url, key: uniqueFileName });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate pre-signed URL' }, { status: 500 });
  }
}