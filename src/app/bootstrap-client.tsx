'use client';

import { useEffect } from 'react';

export default function BootstrapClient() {
  useEffect(() => {
    // Importar o JavaScript do Bootstrap no lado do cliente
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return null;
} 