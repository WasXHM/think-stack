import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';

import { Button, ButtonLink, IconButton } from '../../components/Button.js';
import ConfirmDialog from '../../components/ConfirmDialog.js';
import DateTime from '../../components/DateTime.js';
import EntryDrawer from '../../components/EntryDrawer.js';
import Icon from '../../components/Icon.js';
import MarkdownContent from '../../components/MarkdownContent.js';
import PageHeader from '../../components/PageHeader.js';
import StatePanel, { DetailSkeleton } from '../../components/StatePanel.js';
import { useToast } from '../../components/ToastProvider.js';
import usePageTitle from '../../hooks/usePageTitle.js';
import {
  deleteExternalAnswer,
  deleteTopic,
  deleteUnderstanding,
  getTopic,
} from '../../services/topics.js';
import { formatDate, getErrorMessage } from '../../utils/format.js';

function EntryActions({ label, onEdit, onDelete }) {
  return (
    <div className="entry-actions">
      <IconButton icon="edit" label={`编辑${label}`} onClick={onEdit} />
      <IconButton
        className="icon-button--danger"
        icon="trash"
        label={`删除${label}`}
        onClick={onDelete}
      />
    </div>
  );
}

function ExternalAnswerEntry({ entry, onEdit, onDelete }) {
  return (
    <article className="content-entry external-answer-entry">
      <header className="content-entry__header">
        <div>
          <span className="source-label">{entry.source || '未注明来源'}</span>
          <div className="content-entry__time">
            <DateTime prefix="记录于" value={entry.createdAt} />
            {entry.updatedAt && entry.updatedAt !== entry.createdAt ? (
              <DateTime prefix="更新于" value={entry.updatedAt} />
            ) : null}
          </div>
        </div>
        <EntryActions label={`来自 ${entry.source || '未注明来源'} 的外部解答`} onDelete={onDelete} onEdit={onEdit} />
      </header>
      <MarkdownContent>{entry.content}</MarkdownContent>
    </article>
  );
}

function UnderstandingEntry({ entry, index, onEdit, onDelete }) {
  return (
    <article className="understanding-entry">
      <div className="understanding-entry__marker" aria-hidden="true">
        <span>{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="understanding-entry__content">
        <header className="content-entry__header">
          <div>
            <p className="understanding-entry__label">阶段理解 {String(index + 1).padStart(2, '0')}</p>
            <div className="content-entry__time">
              <DateTime prefix="记录于" value={entry.createdAt} />
              {entry.updatedAt && entry.updatedAt !== entry.createdAt ? (
                <DateTime prefix="修订于" value={entry.updatedAt} />
              ) : null}
            </div>
          </div>
          <EntryActions label={`第 ${index + 1} 条理解`} onDelete={onDelete} onEdit={onEdit} />
        </header>
        <MarkdownContent>{entry.content}</MarkdownContent>
      </div>
    </article>
  );
}

function SectionHeading({ eyebrow, title, count, actionLabel, onAction, id }) {
  return (
    <div className="section-heading section-heading--detail">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        <span>{count} 条记录</span>
      </div>
      <Button onClick={onAction} size="small" variant="secondary">
        <Icon name="plus" size={17} />
        {actionLabel}
      </Button>
    </div>
  );
}

export default function TopicDetailModule() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { refreshTopicIndex } = useOutletContext();
  const { notify } = useToast();
  const [topic, setTopic] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  usePageTitle(topic?.title ?? '主题详情');

  const load = useCallback((signal) => {
    setStatus('loading');
    setError('');
    return getTopic(topicId, { signal })
      .then((data) => {
        setTopic(data);
        setStatus('success');
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') {
          setError(getErrorMessage(loadError, '暂时无法读取这个主题。'));
          setStatus(loadError.status === 404 ? 'not-found' : 'error');
        }
      });
  }, [topicId]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const externalAnswers = useMemo(
    () => [...(topic?.externalAnswers ?? [])].sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    ),
    [topic?.externalAnswers],
  );
  const understandings = useMemo(
    () => [...(topic?.understandings ?? [])].sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    ),
    [topic?.understandings],
  );

  async function handleSaved(saved, { kind, editing }) {
    const collection = kind === 'answer' ? 'externalAnswers' : 'understandings';
    setTopic((current) => {
      const existing = current[collection] ?? [];
      const next = editing
        ? existing.map((item) => (item.id === saved.id ? saved : item))
        : [...existing, saved];
      return { ...current, [collection]: next, updatedAt: saved.updatedAt ?? current.updatedAt };
    });
    setEditor(null);
    notify(
      kind === 'answer'
        ? editing ? '外部解答已更新。' : '外部解答已添加。'
        : editing ? '理解记录已修订。' : '新的理解已加入时间线。',
    );
    void refreshTopicIndex();
  }

  async function confirmDelete() {
    if (deleteTarget.kind === 'topic') {
      await deleteTopic(topicId);
      setDeleteTarget(null);
      notify('主题及其全部记录已删除。');
      navigate('/', { replace: true });
      return;
    }

    if (deleteTarget.kind === 'answer') {
      await deleteExternalAnswer(topicId, deleteTarget.entry.id);
      try {
        setTopic(await getTopic(topicId));
      } catch {
        setTopic((current) => ({
          ...current,
          updatedAt: new Date().toISOString(),
          externalAnswers: (current.externalAnswers ?? []).filter(
            (item) => item.id !== deleteTarget.entry.id,
          ),
        }));
      }
      notify('外部解答已删除。');
    } else {
      await deleteUnderstanding(topicId, deleteTarget.entry.id);
      try {
        setTopic(await getTopic(topicId));
      } catch {
        setTopic((current) => ({
          ...current,
          updatedAt: new Date().toISOString(),
          understandings: (current.understandings ?? []).filter(
            (item) => item.id !== deleteTarget.entry.id,
          ),
        }));
      }
      notify('理解记录已删除。');
    }
    setDeleteTarget(null);
    void refreshTopicIndex();
  }

  function deleteDescription() {
    if (!deleteTarget) return null;
    if (deleteTarget.kind === 'topic') {
      return (
        <p>
          将同时删除原始问题、{externalAnswers.length} 个外部解答和 {understandings.length} 条理解记录。
          这个操作无法撤销。
        </p>
      );
    }
    if (deleteTarget.kind === 'answer') {
      return (
        <p>
          将永久删除来自“{deleteTarget.entry.source || '未注明来源'}”、记录于
          {formatDate(deleteTarget.entry.createdAt)} 的外部解答。
        </p>
      );
    }
    return (
      <p>
        将永久删除记录于 {formatDate(deleteTarget.entry.createdAt)} 的理解。这会让认知演进时间线缺少一条历史。
      </p>
    );
  }

  function moveToSection(sectionId) {
    const section = document.getElementById(sectionId);
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({ block: 'start' });
  }

  if (status === 'loading') {
    return <div className="page"><DetailSkeleton /></div>;
  }

  if (status === 'error' || status === 'not-found') {
    return (
      <div className="page page--narrow">
        <StatePanel
          action={status === 'error' ? () => load() : undefined}
          actionLabel={status === 'error' ? '重新读取' : '返回全部思考'}
          actionTo={status === 'not-found' ? '/' : undefined}
          description={status === 'not-found' ? '这个主题可能已被删除或移动。' : error}
          icon={status === 'error' ? 'refresh' : 'alert'}
          title={status === 'not-found' ? '没有找到这个主题' : '主题暂时无法读取'}
          tone={status === 'error' ? 'error' : 'neutral'}
        />
      </div>
    );
  }

  return (
    <div className="page topic-detail-page">
      <PageHeader
        actions={(
          <ButtonLink to={`/topics/${topicId}/edit`} variant="secondary">
            <Icon name="edit" size={17} />
            编辑主题
          </ButtonLink>
        )}
        description={`创建于 ${formatDate(topic.createdAt)} · 最近更新 ${formatDate(topic.updatedAt)}`}
        eyebrow="TOPIC / 思考主题"
        title={topic.title}
      />

      <div className="topic-detail-layout">
        <div className="topic-detail-main">
          <section aria-labelledby="question-heading" className="detail-section question-section" id="question" tabIndex="-1">
            <div className="section-heading section-heading--detail">
              <div>
                <p className="eyebrow">QUESTION</p>
                <h2 id="question-heading">原始问题</h2>
                <span>为什么会产生这个问题</span>
              </div>
            </div>
            <MarkdownContent>{topic.question}</MarkdownContent>
          </section>

          <section aria-labelledby="answers-heading" className="detail-section" id="external-answers" tabIndex="-1">
            <SectionHeading
              actionLabel="添加外部解答"
              count={externalAnswers.length}
              eyebrow="EXTERNAL ANSWERS"
              id="answers-heading"
              onAction={() => setEditor({ kind: 'answer', entry: null })}
              title="外部解答"
            />
            {externalAnswers.length ? (
              <div className="content-entry-list">
                {externalAnswers.map((entry) => (
                  <ExternalAnswerEntry
                    entry={entry}
                    key={entry.id}
                    onDelete={() => setDeleteTarget({ kind: 'answer', entry })}
                    onEdit={() => setEditor({ kind: 'answer', entry })}
                  />
                ))}
              </div>
            ) : (
              <StatePanel
                action={() => setEditor({ kind: 'answer', entry: null })}
                actionLabel="添加第一条解答"
                compact
                description="把来自模型、文章或技术社区的回答作为独立记录保存在这里。"
                icon="book"
                title="还没有外部解答"
              />
            )}
          </section>

          <section aria-labelledby="understandings-heading" className="detail-section" id="understandings" tabIndex="-1">
            <SectionHeading
              actionLabel="添加我的理解"
              count={understandings.length}
              eyebrow="MY UNDERSTANDINGS"
              id="understandings-heading"
              onAction={() => setEditor({ kind: 'understanding', entry: null })}
              title="我的理解"
            />
            <p className="section-introduction">新增理解会追加到时间线，不会覆盖过去的记录。</p>
            {understandings.length ? (
              <div className="understanding-timeline">
                {understandings.map((entry, index) => (
                  <UnderstandingEntry
                    entry={entry}
                    index={index}
                    key={entry.id}
                    onDelete={() => setDeleteTarget({ kind: 'understanding', entry })}
                    onEdit={() => setEditor({ kind: 'understanding', entry })}
                  />
                ))}
              </div>
            ) : (
              <StatePanel
                action={() => setEditor({ kind: 'understanding', entry: null })}
                actionLabel="记录第一版理解"
                compact
                description="当你形成阶段性判断后，把依据、不确定处和当前结论记录下来。"
                icon="lightbulb"
                title="尚未形成自己的理解"
              />
            )}
          </section>
        </div>

        <aside className="topic-detail-aside" aria-label="主题概览">
          <div className="topic-overview">
            <p className="eyebrow">OVERVIEW</p>
            <h2>本题概览</h2>
            <dl className="topic-overview__counts">
              <div><dt>外部解答</dt><dd>{externalAnswers.length}</dd></div>
              <div><dt>我的理解</dt><dd>{understandings.length}</dd></div>
            </dl>
            <dl className="topic-overview__dates">
              <div><dt>创建</dt><dd><DateTime value={topic.createdAt} /></dd></div>
              <div><dt>更新</dt><dd><DateTime value={topic.updatedAt} /></dd></div>
            </dl>
          </div>
          <nav aria-label="主题内容索引" className="topic-index">
            <button onClick={() => moveToSection('question')} type="button"><span>01</span>原始问题</button>
            <button onClick={() => moveToSection('external-answers')} type="button"><span>02</span>外部解答</button>
            <button onClick={() => moveToSection('understandings')} type="button"><span>03</span>我的理解</button>
          </nav>
          <div className="topic-quick-actions">
            <Button onClick={() => setEditor({ kind: 'understanding', entry: null })} variant="primary">
              <Icon name="plus" size={17} />添加我的理解
            </Button>
            <Button onClick={() => setEditor({ kind: 'answer', entry: null })} variant="secondary">
              <Icon name="plus" size={17} />添加外部解答
            </Button>
          </div>
          <button
            className="danger-text-button"
            onClick={() => setDeleteTarget({ kind: 'topic' })}
            type="button"
          >
            <Icon name="trash" size={17} />
            删除此主题
          </button>
        </aside>
      </div>

      <EntryDrawer
        entry={editor?.entry ?? null}
        kind={editor?.kind ?? 'answer'}
        onClose={() => setEditor(null)}
        onSaved={handleSaved}
        open={Boolean(editor)}
        topicId={topicId}
      />
      <ConfirmDialog
        confirmLabel={deleteTarget?.kind === 'topic' ? '永久删除主题' : '永久删除记录'}
        description={deleteDescription()}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        open={Boolean(deleteTarget)}
        title={deleteTarget?.kind === 'topic' ? `删除“${topic.title}”？` : '删除这条记录？'}
      />
    </div>
  );
}
