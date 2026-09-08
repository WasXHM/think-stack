import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { IconButton } from './Button.js';
import Icon from './Icon.js';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const dismiss = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const notify = useCallback((message, tone = 'success') => {
    window.clearTimeout(timerRef.current);
    setToast({ id: Date.now(), message, tone });
    timerRef.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          className={`toast toast--${toast.tone}`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
        >
          <Icon name={toast.tone === 'error' ? 'alert' : 'check'} size={19} />
          <span>{toast.message}</span>
          <IconButton icon="close" label="关闭提示" onClick={dismiss} />
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider.');
  }
  return context;
}

