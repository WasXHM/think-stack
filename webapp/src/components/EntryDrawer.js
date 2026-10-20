import { EditingLanguageNotice } from '../i18n/LanguageProvider.js';
import { t } from '../i18n/index.js';
import React, { useEffect, useRef, useState } from 'react';

import {
  createExternalAnswer,
  createUnderstanding,
  updateExternalAnswer,
  updateUnderstanding,
} from '../services/topics.js';
import { getErrorMessage } from '../utils/format.js';
import { Button } from './Button.js';
import Drawer from './Drawer.js';
import Icon from './Icon.js';
import MarkdownEditor from './MarkdownEditor.js';
import { clearEntryDraft, readEntryDraft, saveEntryDraft } from '../utils/entry-drafts.js';

const SOURCE_OPTIONS = ['ChatGPT', 'DeepSeek', 'Claude', 'Gemini', 'Article'];

export default function EntryDrawer({ open, kind, entry, topicId, onClose, onSaved }) {
  const answer = kind === 'answer';
  const editing = Boolean(entry);
  const [sourceChoice, setSourceChoice] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const draftReadyRef = useRef(false);

  useEffect(() => {
    if (!open) {
      draftReadyRef.current = false;
      return;
    }
    const savedSource = ['未注明来源', 'Source not specified'].includes(entry?.source) ? '' : entry?.source ?? '';
    const knownSource = SOURCE_OPTIONS.includes(savedSource);
    const draft = !editing ? readEntryDraft(topicId, kind) : null;
    setSourceChoice(draft?.sourceChoice ?? (knownSource ? savedSource : savedSource ? 'Other' : ''));
    setCustomSource(draft?.customSource ?? (knownSource ? '' : savedSource));
    setContent(draft?.content ?? entry?.content ?? '');
    setErrors({});
    setSubmitError('');
    setSubmitting(false);
    draftReadyRef.current = !editing;
  }, [editing, entry, kind, open, topicId]);

  useEffect(() => {
    if (!open || editing || !draftReadyRef.current) return;
    saveEntryDraft(topicId, kind, { content, sourceChoice, customSource });
  }, [content, customSource, editing, kind, open, sourceChoice, topicId]);

  function handleClose() {
    if (!editing) clearEntryDraft(topicId, kind);
    draftReadyRef.current = false;
    onClose();
  }

  async function submit(event) {
    event.preventDefault();
    if (uploading || submitting) return;
    const nextErrors = {};
    const selectedSource = sourceChoice === 'Other' ? customSource.trim() : sourceChoice;
    if (!content.trim()) {
      nextErrors.content = answer
        ? t("请粘贴或记录外部解答正文。")
        : t("请记录你此刻对这个问题的理解。");
    }
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      let saved;
      if (answer) {
        const input = { source: selectedSource || t("未注明来源"), content: content.trim() };
        saved = editing
          ? await updateExternalAnswer(topicId, entry.id, input)
          : await createExternalAnswer(topicId, input);
      } else {
        const input = { content: content.trim() };
        saved = editing
          ? await updateUnderstanding(topicId, entry.id, input)
          : await createUnderstanding(topicId, input);
      }
      if (!editing) clearEntryDraft(topicId, kind);
      await onSaved(saved, { kind, editing });
    } catch (error) {
      setSubmitError(getErrorMessage(error, t("内容没有保存，请重新尝试。")));
      setSubmitting(false);
    }
  }

  const noun = answer ? t("外部解答") : t("我的理解");
  return (
    <Drawer
      busy={submitting || uploading}
      description={
        answer
          ? t("正文支持 Markdown；来源信息可稍后补充。")
          : editing
            ? t("只修正原记录中的文字错误；新的认识应追加为一条新记录。")
            : t("新增记录会追加到时间线，不会覆盖过去的理解。")
      }
      eyebrow={answer ? 'EXTERNAL ANSWER' : 'UNDERSTANDING'}
      footer={(
        <>
          <Button disabled={submitting || uploading} onClick={handleClose} size="large">{t("取消")}</Button>
          <Button
            disabled={uploading}
            busy={submitting}
            busyLabel={t("正在保存…")}
            form="entry-editor-form"
            size="large"
            type="submit"
            variant="primary"
          >
            {editing ? t("保存{p0}", {
  p0: noun
}) : t("添加{p0}", {
  p0: noun
})}
          </Button>
        </>
      )}
      onClose={handleClose}
      open={open}
      lockScroll={answer}
      presentation={answer ? 'workspace-dialog' : 'drawer'}
      title={editing ? t("编辑{p0}", {
  p0: noun
}) : t("添加{p0}", {
  p0: noun
})}
    >
      <form id="entry-editor-form" noValidate onSubmit={submit}>
        <EditingLanguageNotice />
        {!answer && editing ? (
          <div className="editor-notice">
            <Icon name="alert" size={20} />
            <div>
              <strong>{t("保留认知演进")}</strong>
              <p>{t("如果你的认识发生变化，请关闭此弹窗并选择“添加我的理解”。")}</p>
            </div>
          </div>
        ) : null}

        <MarkdownEditor
          disabled={submitting}
          onUploadStateChange={setUploading}
          error={errors.content}
          fillAvailable
          helper={answer ? t("可直接粘贴长文本、代码块、表格和链接。") : t("写下当前判断、依据与仍然不确定的部分。")}
          id="entry-content"
          label={answer ? t("解答正文") : t("理解正文")}
          onChange={(value) => {
            setContent(value);
            setErrors((current) => ({ ...current, content: '' }));
          }}
          placeholder={answer ? t("粘贴或整理这条外部解答…") : t("记录你目前对这个问题的理解…")}
          previewOnDemand
          required
          value={content}
        />
        {answer ? (
          <div className="source-fields source-fields--secondary">
            <div className="field">
              <label htmlFor="entry-source">{t("来源")} <span className="field__optional">{t("可选")}</span></label>
              <select
                id="entry-source"
                onChange={(event) => setSourceChoice(event.target.value)}
                value={sourceChoice}
              >
                <option value="">{t("不填写来源")}</option>
                {SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source}</option>)}
                <option value="Other">{t("其他来源")}</option>
              </select>
            </div>
            {sourceChoice === 'Other' ? (
              <div className="field">
                <label htmlFor="entry-custom-source">{t("自定义来源")} <span className="field__optional">{t("可选")}</span></label>
                <input
                  id="entry-custom-source"
                  maxLength={120}
                  onChange={(event) => setCustomSource(event.target.value)}
                  placeholder={t("例如：GitHub Discussion")}
                  type="text"
                  value={customSource}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}
      </form>
    </Drawer>
  );
}
