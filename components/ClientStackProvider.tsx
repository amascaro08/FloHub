'use client';

import { ReactNode } from 'react';
import { StackProvider } from '@stackframe/stack';
import { stackClientApp } from '@/stack/client';

interface ClientStackProviderProps {
  children: ReactNode;
}

export default function ClientStackProvider({ children }: ClientStackProviderProps) {
  return (
    <StackProvider app={stackClientApp}>
      {children}
    </StackProvider>
  );
}