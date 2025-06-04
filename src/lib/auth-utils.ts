// src/lib/auth-utils.ts
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Inicialize o verificador Cognito JWT
// Certifique-se de que NEXT_PUBLIC_COGNITO_USER_POOL_ID e NEXT_PUBLIC_AWS_REGION estão no .env.local
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  tokenUse: 'id', // Estamos interessados no ID Token
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

export async function getTokenAndUserId(authorizationHeader: string | null): Promise<{ token?: string; userId?: string; error?: string }> {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return { error: 'No Authorization header or invalid format' };
  }

  const token = authorizationHeader.substring(7); // Remove 'Bearer '

  try {
    const payload = await verifier.verify(token);
    // O 'sub' é o ID único do usuário no Cognito
    return { token, userId: payload.sub };
  } catch (error: any) {
    console.error('Error verifying JWT token:', error);
    return { error: error.message || 'Invalid or expired token' };
  }
}