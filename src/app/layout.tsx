// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/components/providers/AuthProvider'; // <-- Importar
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from "@/components/ui/sonner"// Para os toasts do Shadcn

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Despesas da Casa',
  description: 'Registre e gerencie suas despesas domésticas de forma simples e eficiente.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
      >
        <ThemeProvider>
          <AuthProvider> {/* <-- Envolver com AuthProvider */}
            {children}
          </AuthProvider>
          <Toaster /> {/* O Toaster deve estar fora do AuthProvider se o AuthProvider puder ser redirecionado */}
        </ThemeProvider>
      </body>
    </html>
  );
}