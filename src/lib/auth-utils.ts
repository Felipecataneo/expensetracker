// src/lib/auth-utils.ts
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Verificador Cognito JWT criado sob demanda: inicializar no load do módulo quebra
// o `next build` em ambientes sem NEXT_PUBLIC_COGNITO_USER_POOL_ID/CLIENT_ID (ex.: CI).
// Certifique-se de que NEXT_PUBLIC_COGNITO_USER_POOL_ID e NEXT_PUBLIC_AWS_REGION estão no .env.local
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      tokenUse: 'id', // Estamos interessados no ID Token
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
    });
  }
  return verifier;
}

export async function getTokenAndUserId(authorizationHeader: string | null): Promise<{ token?: string; userId?: string; error?: string }> {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return { error: 'No Authorization header or invalid format' };
  }

  const token = authorizationHeader.substring(7); // Remove 'Bearer '

  try {
    const payload = await getVerifier().verify(token);
    // O 'sub' é o ID único do usuário no Cognito
    return { token, userId: payload.sub };
  } catch (error: any) {
    console.error('Error verifying JWT token:', error);
    return { error: error.message || 'Invalid or expired token' };
  }
}