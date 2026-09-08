import React from 'react';

import { Button, ButtonLink } from './Button.js';
import Icon from './Icon.js';

export default function StatePanel({
  tone = 'neutral',
  icon = 'file',
  title,
  description,
  action,
  actionLabel,
  actionTo,
  compact = false,
}) {
  return (
    <section
      className={`state-panel state-panel--${tone} ${compact ? 'state-panel--compact' : ''}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon name={icon} size={23} />
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {actionLabel && action ? (
          <Button onClick={action} size="small" variant="secondary">
            {actionLabel}
          </Button>
        ) : null}
        {actionLabel && actionTo ? (
          <ButtonLink to={actionTo} size="small" variant="primary">
            {actionLabel}
          </ButtonLink>
        ) : null}
      </div>
    </section>
  );
}

export function TopicListSkeleton({ rows = 4 }) {
  return (
    <div className="topic-list topic-list--skeleton" aria-label="正在读取思考主题" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <div className="topic-row topic-row--skeleton" key={index} aria-hidden="true">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--text" />
          <div className="skeleton skeleton--meta" />
        </div>
      ))}
      <span className="sr-only">正在读取思考主题…</span>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="detail-skeleton" aria-label="正在读取主题详情" role="status">
      <div className="skeleton skeleton--eyebrow" />
      <div className="skeleton skeleton--hero" />
      <div className="skeleton skeleton--text" />
      <div className="detail-skeleton__section">
        <div className="skeleton skeleton--section-title" />
        <div className="skeleton skeleton--paragraph" />
        <div className="skeleton skeleton--paragraph-short" />
      </div>
      <span className="sr-only">正在读取主题详情…</span>
    </div>
  );
}

