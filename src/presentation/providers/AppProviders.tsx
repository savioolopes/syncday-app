import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { AppContainer, createContainer } from '../../core/di/container';
import { ToastProvider } from './ToastProvider';

const AppContext = createContext<AppContainer | null>(null);

/** Injeta os casos de uso na árvore. Em testes, passe um `container` com repositórios falsos. */
export function AppProviders({ children, container }: { children: ReactNode; container?: AppContainer }) {
  const value = useMemo(() => container ?? createContainer(), [container]);
  return (
    <AppContext.Provider value={value}>
      <ToastProvider>{children}</ToastProvider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProviders>');
  return ctx;
}
