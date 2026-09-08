import React from 'react';

import { formatDate } from '../utils/format.js';

export default function DateTime({ value, withTime = false, prefix }) {
  return (
    <span className="date-time">
      {prefix ? `${prefix} ` : null}
      <time dateTime={value || undefined}>{formatDate(value, { withTime })}</time>
    </span>
  );
}

