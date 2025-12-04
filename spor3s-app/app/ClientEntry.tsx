"use client";

import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';

const AppClient = dynamic(() => import('./(client)/AppClient'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      color: '#fff',
      background: 'linear-gradient(135deg, #1a1a40 0%, #2d0b3a 25%, #4a1b5a 50%, #2d0b3a 75%, #1a1a40 100%)'
    }}>
      <div>Загрузка...</div>
    </div>
  )
});

export default function ClientEntry() {
  // Добавляем состояние для отслеживания клиентского рендеринга
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Рендерим только на клиенте, чтобы избежать ошибок гидратации
  if (!mounted) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        color: '#fff',
        background: 'linear-gradient(135deg, #1a1a40 0%, #2d0b3a 25%, #4a1b5a 50%, #2d0b3a 75%, #1a1a40 100%)'
      }}>
        <div>Загрузка...</div>
      </div>
    );
  }

  return <AppClient />;
}