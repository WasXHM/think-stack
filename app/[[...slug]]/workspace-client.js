'use client';

import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '../../webapp/src/routes.js';

export default function WorkspaceClient() {
  return (
    <BrowserRouter basename="/think-stack">
      <Suspense fallback={<div className="page route-loading" aria-busy="true">正在载入页面…</div>}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  );
}
