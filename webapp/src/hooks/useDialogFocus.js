import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function useDialogFocus({
  open,
  containerRef,
  onClose,
  canClose = true,
  lockScroll = true,
}) {
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);

  useEffect(() => {
    onCloseRef.current = onClose;
    canCloseRef.current = canClose;
  }, [canClose, onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const applicationRoot = document.getElementById('root');
    const previousInert = applicationRoot?.inert ?? false;
    if (lockScroll) document.body.style.overflow = 'hidden';
    if (lockScroll && applicationRoot) {
      applicationRoot.inert = true;
    }

    const focusInitial = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      const target =
        container?.querySelector('[data-autofocus]') ??
        container?.querySelector(FOCUSABLE_SELECTOR) ??
        container;
      target?.focus();
    });

    function handleKeyDown(event) {
      if (event.key === 'Escape' && canCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = Array.from(
        containerRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) ?? [],
      );
      if (focusable.length === 0) {
        event.preventDefault();
        containerRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusInitial);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (lockScroll && applicationRoot) {
        applicationRoot.inert = previousInert;
      }
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, [containerRef, lockScroll, open]);
}
