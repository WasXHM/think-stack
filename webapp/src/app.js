import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import AppRoutes from './routes.js';
import { routerBaseHref } from './config.js';
import { ThemeProvider } from './components/ThemeProvider.js';
import { ToastProvider } from './components/ToastProvider.js';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter basename={routerBaseHref}>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

