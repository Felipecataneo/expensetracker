// src/app/api/s3-upload/route.ts
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { getTokenAndUserId } from '@/lib/auth-utils'; // <-- Importar a nova função

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export async function POST(req: Request) {
  try {
    const { userId, error: authError } = await getTokenAndUserId(req.headers.get('Authorization'));
    if (authError || !userId) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileType } = await req.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'fileName and fileType are required' }, { status: 400 });
    }

    const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json({ error: 'S3 bucket name not configured' }, { status: 500 });
    }

    const uniqueFileName = `${uuidv4()}-${fileName}`;
    const keyWithPath = `receipts/${uniqueFileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: keyWithPath,
      ContentType: fileType,
      ACL: 'private',
      Metadata: {
        // Enviar o userId como metadado para a Lambda do Textract
        userid: userId,
      },
    });

    const url = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600,
      // Não incluir checksums ou outras configurações que podem complicar o CORS
    });

    console.log('Generated pre-signed URL:', url);

    return NextResponse.json({ url, key: keyWithPath, userId });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate pre-signed URL' }, { status: 500 });
  }
}