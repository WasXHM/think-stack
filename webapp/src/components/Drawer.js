import React, { useRef } from 'react';
import { createPortal } from 'react-dom';

import useDialogFocus from '../hooks/useDialogFocus.js';
import { IconButton } from './Button.js';

export default function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  busy = false,
  presentation = 'drawer',
  lockScroll = true,
}) {
  const panelRef = useRef(null);
  const workspaceDialog = presentation === 'workspace-dialog';
  const closeLabel = workspaceDialog ? '关闭编辑弹窗' : '关闭编辑面板';
  useDialogFocus({
    open,
    containerRef: panelRef,
    onClose,
    canClose: !busy,
    lockScroll,
  });

  if (!open) {
    return null;
  }

  return createPortal(
    <div className={`overlay-layer${lockScroll ? '' : ' overlay-layer--nonblocking'}`}>
      <button
        aria-label={closeLabel}
        className="overlay-backdrop"
        disabled={busy}
        onClick={onClose}
        tabIndex="-1"
        type="button"
      />
      <section
        aria-describedby={description ? 'drawer-description' : undefined}
        aria-labelledby="drawer-title"
        aria-modal="true"
        className={`drawer${workspaceDialog ? ' drawer--workspace-dialog' : ''}`}
        ref={panelRef}
        role="dialog"
        tabIndex="-1"
      >
        <header className="drawer__header">
          <div className="drawer__heading">
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <div className="drawer__title-line">
              <h2 id="drawer-title">{title}</h2>
              {description ? <p id="drawer-description">{description}</p> : null}
            </div>
          </div>
          <IconButton
            data-autofocus
            disabled={busy}
            icon="close"
            label={closeLabel}
            onClick={onClose}
          />
        </header>
        <div className="drawer__body">{children}</div>
        {footer ? <footer className="drawer__footer">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
