import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout.js';

const HomeModule = lazy(() => import('./modules/home/index.js'));
const NotFoundModule = lazy(() => import('./modules/not-found/index.js'));
const TopicDetailModule = lazy(() => import('./modules/topic-detail/index.js'));
const TopicFormModule = lazy(() => import('./modules/topic-form/index.js'));

function SuspendedRoute({ children }) {
  return (
    <Suspense fallback={(
      <div aria-busy="true" aria-label="正在载入页面" className="page route-loading" role="status">
        <div className="skeleton skeleton--eyebrow" />
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--panel" />
      </div>
    )}
    >
      {children}
    </Suspense>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<SuspendedRoute><HomeModule /></SuspendedRoute>} />
        <Route path="topics/new" element={<SuspendedRoute><TopicFormModule mode="create" /></SuspendedRoute>} />
        <Route path="topics/:topicId" element={<SuspendedRoute><TopicDetailModule /></SuspendedRoute>} />
        <Route path="topics/:topicId/edit" element={<SuspendedRoute><TopicFormModule mode="edit" /></SuspendedRoute>} />
        <Route path="*" element={<SuspendedRoute><NotFoundModule /></SuspendedRoute>} />
      </Route>
    </Routes>
  );
}
