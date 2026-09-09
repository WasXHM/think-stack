'use client';

import { ThemeProvider } from '../webapp/src/components/ThemeProvider.js';
import { ToastProvider } from '../webapp/src/components/ToastProvider.js';

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
