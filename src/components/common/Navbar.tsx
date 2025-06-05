// src/components/common/Navbar.tsx
import React from 'react';

export function Navbar() {
  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Despesas da casa</h1>
        {/* Você pode adicionar links de navegação aqui se tiver mais páginas */}
      </div>
    </nav>
  );
}