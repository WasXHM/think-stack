import React, { useEffect, useId, useRef, useState } from 'react';

import { Button } from './Button.js';
import MarkdownContent from './MarkdownContent.js';

export default function MarkdownEditor({
  id,
  label,
  value,
  onChange,
  error,
  helper,
  required = false,
  placeholder = '使用 Markdown 记录内容…',
  minHeight = 360,
  previewOnDemand = false,
  fillAvailable = false,
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const textareaRef = useRef(null);
  const [mobileMode, setMobileMode] = useState('edit');
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;

  useEffect(() => {
    if (!error) {
      return;
    }
    if (mobileMode !== 'edit') {
      setMobileMode('edit');
      return;
    }
    textareaRef.current?.focus();
  }, [error, mobileMode]);

  return (
    <div
      className={`field markdown-editor${previewOnDemand ? ' markdown-editor--on-demand' : ''}${fillAvailable ? ' markdown-editor--fill' : ''}`}
    >
      <div className="markdown-editor__heading">
        <label htmlFor={fieldId}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
        {previewOnDemand ? (
          <Button
            className="markdown-editor__preview-button"
            onClick={() => setMobileMode((current) => (current === 'edit' ? 'preview' : 'edit'))}
            size="small"
            type="button"
          >
            {mobileMode === 'edit' ? '打开预览' : '返回编辑'}
          </Button>
        ) : (
          <div aria-label="Markdown 编辑视图" className="markdown-editor__tabs">
            <button
              aria-controls={`${fieldId}-edit-pane`}
              aria-pressed={mobileMode === 'edit'}
              className={mobileMode === 'edit' ? 'is-active' : ''}
              onClick={() => setMobileMode('edit')}
              type="button"
            >
              编辑
            </button>
            <button
              aria-controls={`${fieldId}-preview-pane`}
              aria-pressed={mobileMode === 'preview'}
              className={mobileMode === 'preview' ? 'is-active' : ''}
              onClick={() => setMobileMode('preview')}
              type="button"
            >
              预览
            </button>
          </div>
        )}
      </div>
      <div className={`markdown-editor__panes is-${mobileMode}`}>
        {!previewOnDemand || mobileMode === 'edit' ? (
          <section
            aria-label="Markdown 编辑"
            className="markdown-editor__pane markdown-editor__pane--edit"
            id={`${fieldId}-edit-pane`}
          >
            <p className="markdown-editor__pane-label">Markdown</p>
            <textarea
              aria-describedby={`${helper ? descriptionId : ''} ${error ? errorId : ''}`.trim() || undefined}
              aria-invalid={Boolean(error)}
              id={fieldId}
              maxLength={500000}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              ref={textareaRef}
              required={required}
              spellCheck="false"
              style={fillAvailable ? undefined : { minHeight }}
              value={value}
            />
          </section>
        ) : null}
        {!previewOnDemand || mobileMode === 'preview' ? (
          <section
            aria-label="Markdown 预览"
            className="markdown-editor__pane markdown-editor__pane--preview"
            id={`${fieldId}-preview-pane`}
          >
            <p className="markdown-editor__pane-label">预览</p>
            <div className="markdown-editor__preview" style={fillAvailable ? undefined : { minHeight }}>
              {value.trim() ? (
                <MarkdownContent>{value}</MarkdownContent>
              ) : (
                <p className="markdown-editor__placeholder">输入内容后，可在这里检查排版。</p>
              )}
            </div>
          </section>
        ) : null}
      </div>
      {helper ? (
        <p className="field__help" id={descriptionId}>
          {helper}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
