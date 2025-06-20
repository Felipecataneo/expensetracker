// src/amplifyconfig.ts
import { Amplify } from 'aws-amplify';

export const configureAmplify = () => {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
        
        // Exemplo para usar o Hosted UI (se você decidisse usar)
        // loginWith: {
        //   oauth: {
        //     domain: 'YOUR_COGNITO_DOMAIN.auth.us-east-1.amazoncognito.com',
        //     scopes: ['email', 'openid', 'profile'],
        //     redirectSignIn: ['http://localhost:3000/'],
        //     redirectSignOut: ['http://localhost:3000/auth'],
        //     responseType: 'code'
        //   }
        // }
      },
    },
  });
};