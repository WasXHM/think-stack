import React from 'react';
import { Link } from 'react-router-dom';

import Icon from './Icon.js';

export function buttonClassName({ variant = 'secondary', size = 'normal', className = '' } = {}) {
  return `button button--${variant} button--${size} ${className}`.trim();
}

export function Button({
  children,
  variant = 'secondary',
  size = 'normal',
  busy = false,
  busyLabel = '正在处理…',
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      className={buttonClassName({ variant, size, className })}
      disabled={disabled || busy}
      {...props}
    >
      {busy ? <span className="button__busy-dot" aria-hidden="true" /> : null}
      {busy ? busyLabel : children}
    </button>
  );
}

export function ButtonLink({
  children,
  to,
  variant = 'secondary',
  size = 'normal',
  className = '',
  ...props
}) {
  return (
    <Link
      className={buttonClassName({ variant, size, className })}
      to={to}
      {...props}
    >
      {children}
    </Link>
  );
}

export function IconButton({ icon, label, className = '', ...props }) {
  return (
    <button
      aria-label={label}
      className={`icon-button ${className}`.trim()}
      title={label}
      type="button"
      {...props}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

