import React, { useEffect, useId, useRef, useState } from 'react';

import { uploadImage as defaultUploadImage } from '../services/images.js';
import { clipboardImages, IMAGE_ACCEPT, insertMarkdownImages, validateImageFile } from '../utils/markdown-images.js';
import { getErrorMessage } from '../utils/format.js';
import { Button } from './Button.js';
import MarkdownContent from './MarkdownContent.js';
import MarkdownToolbar from './MarkdownToolbar.js';
import { formatMarkdown } from '../utils/markdown-format.js';

export default function MarkdownEditor({
  id,
  label,
  value = '',
  onChange,
  error,
  helper,
  required = false,
  placeholder = '使用 Markdown 记录内容…',
  minHeight = 360,
  previewOnDemand = false,
  fillAvailable = false,
  uploadImage = defaultUploadImage,
  onUploadStateChange,
  disabled = false,
  maxLength = 500000,
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadRef = useRef(null);
  const currentValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const uploadStateRef = useRef(onUploadStateChange);
  const caretRef = useRef(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  currentValueRef.current = value;
  onChangeRef.current = onChange;
  uploadStateRef.current = onUploadStateChange;

  useEffect(() => () => {
    uploadRef.current?.abort();
    uploadRef.current = null;
    uploadStateRef.current?.(false);
  }, []);

  useEffect(() => {
    if (caretRef.current !== null && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(caretRef.current.start, caretRef.current.end);
      selectionRef.current = caretRef.current;
      caretRef.current = null;
    }
  }, [value]);

  function rememberSelection() {
    const textarea = textareaRef.current;
    if (textarea) selectionRef.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
  }

  function applyFormat(command) {
    if (disabled || uploadRef.current) return;
    rememberSelection();
    const { start, end } = selectionRef.current;
    try {
      const result = formatMarkdown(currentValueRef.current, start, end, command, maxLength);
      setUploadError('');
      if (result.value === currentValueRef.current) {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(result.start, result.end);
        selectionRef.current = { start: result.start, end: result.end };
      } else {
        caretRef.current = { start: result.start, end: result.end };
        onChange(result.value);
      }
    } catch (error) {
      setUploadError(error.message);
    }
  }

  async function insertImages(files) {
    if (disabled || uploadRef.current || !files.length) return;
    setUploadError('');
    try { files.forEach(validateImageFile); }
    catch (error) { setUploadError(error.message); return; }
    const original = currentValueRef.current;
    const { start, end } = selectionRef.current;
    const controller = new AbortController();
    uploadRef.current = controller;
    setUploading(true);
    uploadStateRef.current?.(true);
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      const urls = [];
      for (const file of files) urls.push(await uploadImage(file, { signal: controller.signal }));
      if (controller.signal.aborted || uploadRef.current !== controller) return;
      if (currentValueRef.current !== original) throw new Error('正文已发生变化，请在新的光标位置重新粘贴图片。');
      const inserted = insertMarkdownImages(original, start, end, urls, maxLength);
      caretRef.current = { start: inserted.caret, end: inserted.caret };
      onChangeRef.current(inserted.value);
    } catch (error) {
      if (uploadRef.current === controller) {
        setUploadError(error.name === 'AbortError' ? '图片上传超时，请重新粘贴或选择图片重试。' : getErrorMessage(error, '图片上传失败，请重试。'));
      }
    } finally {
      clearTimeout(timeout);
      if (uploadRef.current === controller) {
        uploadRef.current = null;
        setUploading(false);
        uploadStateRef.current?.(false);
      }
    }
  }

  function paste(event) {
    const files = clipboardImages(event.clipboardData);
    if (!files.length) return;
    event.preventDefault();
    rememberSelection();
    void insertImages(files);
  }
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
            disabled={uploading}
            onClick={() => setMobileMode((current) => (current === 'edit' ? 'preview' : 'edit'))}
            size="small"
            type="button"
          >
            {mobileMode === 'edit' ? '打开预览' : '返回编辑'}
          </Button>
        ) : (
          <div aria-label="Markdown 编辑视图" className="markdown-editor__tabs">
            <button
              disabled={uploading}
              aria-controls={`${fieldId}-edit-pane`}
              aria-pressed={mobileMode === 'edit'}
              className={mobileMode === 'edit' ? 'is-active' : ''}
              onClick={() => setMobileMode('edit')}
              type="button"
            >
              编辑
            </button>
            <button
              disabled={uploading}
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
      <MarkdownToolbar
        disabled={disabled || uploading || mobileMode !== 'edit'}
        onFormat={applyFormat}
        onImage={() => { rememberSelection(); fileInputRef.current?.click(); }}
      />
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        tabIndex={-1}
        aria-label="选择图片"
        disabled={disabled || uploading}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          void insertImages(files);
        }}
      />
      <p className="field__help markdown-editor__upload-status" role="status">
        {uploading ? '正在上传图片，请稍候…' : '可在光标处粘贴截图（⌘V / Ctrl+V），单张最大 10 MB。'}
      </p>
      {uploadError ? <p className="field__error" role="alert">{uploadError}</p> : null}
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
              maxLength={maxLength}
              readOnly={disabled || uploading}
              aria-busy={uploading}
              onPaste={paste}
              onSelect={rememberSelection}
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
