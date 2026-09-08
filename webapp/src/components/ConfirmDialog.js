import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import useDialogFocus from '../hooks/useDialogFocus.js';
import { Button } from './Button.js';
import Icon from './Icon.js';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认删除',
  onCancel,
  onConfirm,
}) {
  const panelRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setBusy(false);
      setError('');
    }
  }, [open]);

  useDialogFocus({
    open,
    containerRef: panelRef,
    onClose: onCancel,
    canClose: !busy,
  });

  if (!open) {
    return null;
  }

  async function handleConfirm() {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (confirmError) {
      setError(confirmError?.message || '删除未完成，请重新尝试。');
      setBusy(false);
    }
  }

  return createPortal(
    <div className="overlay-layer overlay-layer--dialog">
      <button
        aria-label="取消删除"
        className="overlay-backdrop"
        disabled={busy}
        onClick={onCancel}
        tabIndex="-1"
        type="button"
      />
      <section
        aria-describedby="confirm-dialog-description"
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="confirm-dialog"
        ref={panelRef}
        role="alertdialog"
        tabIndex="-1"
      >
        <div className="confirm-dialog__icon"><Icon name="alert" size={22} /></div>
        <h2 id="confirm-dialog-title">{title}</h2>
        <div id="confirm-dialog-description" className="confirm-dialog__description">
          {description}
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="confirm-dialog__actions">
          <Button data-autofocus disabled={busy} onClick={onCancel}>
            取消
          </Button>
          <Button
            busy={busy}
            busyLabel="正在删除…"
            onClick={handleConfirm}
            variant="danger"
          >
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

