// src/app/auth/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { signUp, confirmSignUp, signIn } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function AuthPage() {
  // Estados separados para login e registro
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [confirmationCode, setConfirmationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (signupPassword !== confirmPassword) {
        throw new Error("As senhas não coincidem.");
      }
      
      await signUp({
        username: signupUsername, // Agora usa username para registro
        password: signupPassword,
        options: {
          userAttributes: {
            email: signupEmail, // Email como atributo adicional
          },
        },
      });
      
      setShowConfirm(true);
      toast("Confirmação Necessária", {
        description: "Um código de confirmação foi enviado para o seu email. Por favor, insira-o abaixo.",
      });
    } catch (error: any) {
      console.error('Erro no registro:', error);
      toast.error("Erro no Registro", {
        description: error.message || "Não foi possível registrar o usuário.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await confirmSignUp({
        username: signupUsername, // Usa o username para confirmação
        confirmationCode: confirmationCode,
      });
      
      toast.success("Registro Confirmado!", {
        description: "Sua conta foi confirmada com sucesso. Agora você pode fazer login.",
      });
      
      setShowConfirm(false);
      
      // Login automático após confirmação
      await signIn({
        username: signupUsername,
        password: signupPassword,
      });
      
      // Aguarda um pequeno delay para garantir que o estado seja atualizado
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error: any) {
      console.error('Erro na confirmação:', error);
      toast.error("Erro na Confirmação", {
        description: error.message || "Código de confirmação inválido ou expirado.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn({
        username: loginUsername, // Agora usa username para login
        password: loginPassword,
      });
      
      toast.success("Login bem-sucedido!", {
        description: "Você foi logado com sucesso.",
      });
      
      // Aguarda um pequeno delay para garantir que o estado seja atualizado
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error("Erro no Login", {
        description: error.message || "Credenciais inválidas ou conta não confirmada.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Expense Tracker</CardTitle>
          <CardDescription className="text-center">
            Faça login ou crie sua conta para começar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Registrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="loginUsername">Nome de Usuário</Label>
                  <Input
                    id="loginUsername"
                    type="text"
                    placeholder="meuusername"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="loginPassword">Senha</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              {showConfirm ? (
                <form onSubmit={handleConfirmSignUp} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="confirmCode">Código de Confirmação</Label>
                    <Input
                      id="confirmCode"
                      type="text"
                      placeholder="XXXXXX"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Confirmando...' : 'Confirmar Registro'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="signupUsername">Nome de Usuário</Label>
                    <Input
                      id="signupUsername"
                      type="text"
                      placeholder="meuusername"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signupEmail">Email</Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="email@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signupPassword">Senha</Label>
                    <Input
                      id="signupPassword"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmSignupPassword">Confirmar Senha</Label>
                    <Input
                      id="confirmSignupPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Registrando...' : 'Registrar'}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}