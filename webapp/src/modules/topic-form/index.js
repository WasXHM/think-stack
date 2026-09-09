import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, ButtonLink } from '../../components/Button.js';
import { useCategories } from '../../components/CategoryContext.js';
import DateTime from '../../components/DateTime.js';
import Icon from '../../components/Icon.js';
import MarkdownEditor from '../../components/MarkdownEditor.js';
import PageHeader from '../../components/PageHeader.js';
import StatePanel, { DetailSkeleton } from '../../components/StatePanel.js';
import { useToast } from '../../components/ToastProvider.js';
import usePageTitle from '../../hooks/usePageTitle.js';
import { createTopic, getTopic, updateTopic } from '../../services/topics.js';
import { getErrorMessage } from '../../utils/format.js';

function validate(values) {
  const errors = {};
  if (!values.title.trim()) {
    errors.title = '请输入一句能够识别这个问题的标题。';
  }
  if (!values.question.trim()) {
    errors.question = '请记录当时产生疑问的上下文。';
  }
  return errors;
}

export default function TopicFormModule({ mode }) {
  const editing = mode === 'edit';
  const { categories, selectedCategoryId } = useCategories();
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [topic, setTopic] = useState(null);
  const [values, setValues] = useState({ title: '', question: '', categoryId: selectedCategoryId });
  const [errors, setErrors] = useState({});
  const [loadStatus, setLoadStatus] = useState(editing ? 'loading' : 'success');
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const mountedRef = useRef(true);

  usePageTitle(editing ? (topic?.title ? `编辑 ${topic.title}` : '编辑主题') : '新建思考');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!editing) {
      return undefined;
    }
    const controller = new AbortController();
    setLoadStatus('loading');
    setLoadError('');
    getTopic(topicId, { signal: controller.signal })
      .then((data) => {
        setTopic(data);
        setValues({ title: data.title ?? '', question: data.question ?? '', categoryId: data.categoryId ?? 'default' });
        setLoadStatus('success');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setLoadError(getErrorMessage(error, '暂时无法读取这个主题。'));
          setLoadStatus(error.status === 404 ? 'not-found' : 'error');
        }
      });
    return () => controller.abort();
  }, [editing, topicId]);

  useEffect(() => {
    if (!editing) setValues((current) => ({ ...current, categoryId: selectedCategoryId }));
  }, [editing, selectedCategoryId]);

  function updateValue(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  async function submit(event) {
    event.preventDefault();
    if (uploading || submitting) return;
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(nextErrors.title ? 'topic-title' : 'topic-question')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        categoryId: values.categoryId,
        title: values.title.trim(),
        question: values.question.trim(),
      };
      const saved = editing
        ? await updateTopic(topicId, payload)
        : await createTopic(payload);
      if (!mountedRef.current) {
        return;
      }
      const savedId = saved?.id ?? topicId;
      notify(editing ? '主题已更新。' : '新思考已创建。');
      navigate(`/topics/${savedId}`, { replace: true });
    } catch (error) {
      if (mountedRef.current) {
        setSubmitError(getErrorMessage(error, '内容没有保存，请重新尝试。'));
        setSubmitting(false);
      }
    }
  }

  if (loadStatus === 'loading') {
    return <div className="page"><DetailSkeleton /></div>;
  }

  if (loadStatus === 'error' || loadStatus === 'not-found') {
    return (
      <div className="page page--narrow">
        <StatePanel
          actionLabel="返回全部思考"
          actionTo="/"
          description={
            loadStatus === 'not-found'
              ? '这个主题可能已被删除或移动。'
              : loadError
          }
          icon="alert"
          title={loadStatus === 'not-found' ? '没有找到这个主题' : '主题暂时无法读取'}
          tone={loadStatus === 'not-found' ? 'neutral' : 'error'}
        />
      </div>
    );
  }

  return (
    <div className="page topic-form-page">
      <PageHeader
        actions={(
          submitting ? (
            <Button disabled type="button" variant="secondary">取消</Button>
          ) : (
            <ButtonLink to={editing ? `/topics/${topicId}` : '/'} variant="secondary">
              取消
            </ButtonLink>
          )
        )}
        description={
          editing
            ? '修正标题或最初的问题语境，不会改变已保存的外部解答和理解记录。'
            : '先保存真实的问题语境，再逐步补充资料和阶段性理解。'
        }
        eyebrow={editing ? 'EDIT TOPIC' : 'NEW TOPIC'}
        title={editing ? '编辑思考主题' : '记录一个新问题'}
      />

      <form className="topic-form-layout" noValidate onSubmit={submit}>
        <div className="topic-form-layout__main">
          <div className="field">
            <label htmlFor="topic-title">主题标题 <span aria-hidden="true">*</span></label>
            <input
              aria-describedby={errors.title ? 'topic-title-error' : 'topic-title-help'}
              aria-invalid={Boolean(errors.title)}
              autoComplete="off"
              id="topic-title"
              maxLength={200}
              onChange={(event) => updateValue('title', event.target.value)}
              placeholder="例如：MCP 与 API 网关的边界是什么"
              type="text"
              value={values.title}
            />
            <p className="field__help" id="topic-title-help">用一句话标记你真正想厘清的问题。</p>
            {errors.title ? <p className="field__error" id="topic-title-error" role="alert">{errors.title}</p> : null}
          </div>

          <div className="field">
            <label htmlFor="topic-category">分类 <span className="field__help">（选填）</span></label>
            <select id="topic-category" value={values.categoryId} onChange={(event) => updateValue('categoryId', event.target.value)}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <p className="field__help">未指定分类时归入默认分类。</p>
          </div>
          <MarkdownEditor
            disabled={submitting}
            onUploadStateChange={setUploading}
            error={errors.question}
            helper="支持 Markdown、代码块、表格、列表和链接。"
            id="topic-question"
            label="原始问题"
            onChange={(value) => updateValue('question', value)}
            placeholder={'记录你当时为什么产生这个问题。\n\n可以补充已有背景、困惑边界和希望验证的判断。'}
            required
            value={values.question}
          />

          {submitError ? <p className="form-error" role="alert">{submitError}</p> : null}
          <div className="form-actions">
            <Button
              disabled={uploading}
              busy={submitting}
              busyLabel={editing ? '正在保存…' : '正在创建…'}
              size="large"
              type="submit"
              variant="primary"
            >
              {editing ? '保存修改' : '创建思考'}
            </Button>
            {submitting ? (
              <Button disabled size="large" type="button">取消</Button>
            ) : (
              <ButtonLink size="large" to={editing ? `/topics/${topicId}` : '/'}>
                取消
              </ButtonLink>
            )}
          </div>
        </div>

        <aside className="topic-form-aside" aria-label="记录说明">
          <div className="aside-section">
            <Icon name="lightbulb" size={21} />
            <h2>保留问题的起点</h2>
            <p>原始问题不是文章摘要。请保留当时不知道什么、为何困惑，以及你已经做出的判断。</p>
          </div>
          {editing ? (
            <div className="aside-section aside-section--warning">
              <Icon name="alert" size={20} />
              <h2>这是起点记录</h2>
              <p>修改原始问题会改变这条主题的起点。新的认识请在详情页追加“我的理解”。</p>
            </div>
          ) : (
            <div className="aside-section">
              <Icon name="book" size={20} />
              <h2>下一步</h2>
              <p>保存后将进入主题详情，你可以继续粘贴外部解答并记录自己的理解。</p>
            </div>
          )}
          {topic ? (
            <dl className="aside-meta">
              <div><dt>创建</dt><dd><DateTime value={topic.createdAt} /></dd></div>
              <div><dt>更新</dt><dd><DateTime value={topic.updatedAt} /></dd></div>
            </dl>
          ) : null}
        </aside>
      </form>
    </div>
  );
}
