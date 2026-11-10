import { EditingLanguageNotice } from '../i18n/LanguageProvider.js';
import { t } from '../i18n/index.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  createExternalAnswer,
  createUnderstanding,
  deleteTopicDraft,
  updateExternalAnswer,
  updateUnderstanding,
} from '../services/topics.js';
import useDraftAutosave from '../hooks/useDraftAutosave.js';
import { getErrorMessage } from '../utils/format.js';
import { Button } from './Button.js';
import Drawer from './Drawer.js';
import Icon from './Icon.js';
import MarkdownEditor from './MarkdownEditor.js';
import { clearEntryDraft, readEntryDraft, saveEntryDraft } from '../utils/entry-drafts.js';
import { draftMatches, isCurrentTopicDraft } from '../utils/topic-drafts.js';

const SOURCE_OPTIONS = ['ChatGPT', 'DeepSeek', 'Claude', 'Gemini', 'Article'];

export default function EntryDrawer({
  open,
  kind,
  entry,
  topicId,
  topicUpdatedAt,
  draft,
  onDraftChange,
  onClose,
  onSaved,
}) {
  const answer = kind === 'answer';
  const editing = Boolean(entry);
  const targetType = answer ? 'external-answer' : 'understanding';
  const operation = editing ? 'update' : 'create';
  const targetId = entry?.id ?? null;
  const baseUpdatedAt = editing ? entry.updatedAt : topicUpdatedAt;
  const matchingServerDraft = draftMatches(draft, { targetType, targetId, operation })
    && isCurrentTopicDraft({
      updatedAt: topicUpdatedAt,
      externalAnswers: answer && entry ? [entry] : [],
      understandings: !answer && entry ? [entry] : [],
    }, draft)
    ? draft
    : null;
  const [sourceChoice, setSourceChoice] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clearingDraft, setClearingDraft] = useState(false);
  const [localDraftPresent, setLocalDraftPresent] = useState(false);
  const draftReadyRef = useRef(false);

  const selectedSource = sourceChoice === 'Other' ? customSource : sourceChoice;
  const currentDraft = useMemo(() => ({
    targetType,
    targetId,
    operation,
    values: answer
      ? { source: selectedSource, content }
      : { content },
    baseUpdatedAt,
  }), [answer, baseUpdatedAt, content, operation, selectedSource, targetId, targetType]);
  const formalDraft = useMemo(() => ({
    targetType,
    targetId,
    operation,
    values: answer
      ? {
        source: ['未注明来源', 'Source not specified'].includes(entry?.source) ? '' : entry?.source ?? '',
        content: entry?.content ?? '',
      }
      : { content: entry?.content ?? '' },
    baseUpdatedAt,
  }), [answer, baseUpdatedAt, entry?.content, entry?.source, operation, targetId, targetType]);
  const autosave = useDraftAutosave({
    enabled: open && Boolean(baseUpdatedAt),
    topicId,
    sessionKey: `${targetType}:${operation}:${targetId ?? 'new'}`,
    draft: currentDraft,
    initialSavedDraft: matchingServerDraft ?? formalDraft,
    onSaved: onDraftChange,
  });

  useEffect(() => {
    if (!open) {
      draftReadyRef.current = false;
      return;
    }
    const savedSource = ['未注明来源', 'Source not specified'].includes(entry?.source) ? '' : entry?.source ?? '';
    const knownSource = SOURCE_OPTIONS.includes(savedSource);
    const localDraft = !editing ? readEntryDraft(topicId, kind) : null;
    const useServerDraft = matchingServerDraft
      && (!localDraft?.savedAt || Date.parse(matchingServerDraft.updatedAt) >= Date.parse(localDraft.savedAt));
    const restoredSource = useServerDraft ? matchingServerDraft.values.source : savedSource;
    const restoredKnownSource = SOURCE_OPTIONS.includes(restoredSource);
    setSourceChoice(
      useServerDraft
        ? (restoredKnownSource ? restoredSource : restoredSource ? 'Other' : '')
        : localDraft?.sourceChoice ?? (knownSource ? savedSource : savedSource ? 'Other' : ''),
    );
    setCustomSource(
      useServerDraft
        ? (restoredKnownSource ? '' : restoredSource)
        : localDraft?.customSource ?? (knownSource ? '' : savedSource),
    );
    setContent(useServerDraft ? matchingServerDraft.values.content : localDraft?.content ?? entry?.content ?? '');
    setLocalDraftPresent(Boolean(localDraft));
    setErrors({});
    setSubmitError('');
    setSubmitting(false);
    setClearingDraft(false);
    draftReadyRef.current = !editing;
  }, [editing, entry?.content, entry?.id, entry?.source, kind, open, topicId]);

  useEffect(() => {
    if (!open || editing || !draftReadyRef.current) return;
    saveEntryDraft(topicId, kind, { content, sourceChoice, customSource });
    setLocalDraftPresent(Boolean(content.trim() || sourceChoice || customSource.trim()));
  }, [content, customSource, editing, kind, open, sourceChoice, topicId]);

  function handleClose() {
    if (!editing) clearEntryDraft(topicId, kind);
    draftReadyRef.current = false;
    onClose();
  }

  async function clearDraft() {
    if (clearingDraft || submitting) return;
    setClearingDraft(true);
    setSubmitError('');
    try {
      if (matchingServerDraft) await deleteTopicDraft(topicId);
      if (!editing) clearEntryDraft(topicId, kind);
      const savedSource = ['未注明来源', 'Source not specified'].includes(entry?.source) ? '' : entry?.source ?? '';
      const knownSource = SOURCE_OPTIONS.includes(savedSource);
      setSourceChoice(knownSource ? savedSource : savedSource ? 'Other' : '');
      setCustomSource(knownSource ? '' : savedSource);
      setContent(entry?.content ?? '');
      setLocalDraftPresent(false);
      if (matchingServerDraft) onDraftChange?.(null);
      autosave.resetBaseline(formalDraft);
    } catch (error) {
      setSubmitError(getErrorMessage(error, t("草稿没有清除，请重新尝试。")));
    } finally {
      setClearingDraft(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (uploading || submitting) return;
    const nextErrors = {};
    const submittedSource = sourceChoice === 'Other' ? customSource.trim() : sourceChoice;
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
        const input = { source: submittedSource || t("未注明来源"), content: content.trim() };
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
      if (matchingServerDraft) onDraftChange?.(null);
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
          {(matchingServerDraft || localDraftPresent) ? (
            <Button
              busy={clearingDraft}
              busyLabel={t("正在清除…")}
              disabled={submitting || uploading}
              onClick={clearDraft}
              size="large"
              type="button"
            >{t("清除草稿")}</Button>
          ) : null}
          <Button
            disabled={uploading || clearingDraft}
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
        {autosave.status === 'saved' ? <p className="draft-save-status">{t("草稿已自动保存于 {p0}", { p0: new Date(autosave.savedAt).toLocaleTimeString() })}</p> : null}
        {autosave.status === 'saving' ? <p className="draft-save-status">{t("正在自动保存草稿…")}</p> : null}
        {autosave.status === 'error' ? <p className="draft-save-status draft-save-status--error" role="alert">{autosave.error}</p> : null}
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
