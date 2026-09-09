import { useCategories } from '../../components/CategoryContext.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';

import { Button, ButtonLink } from '../../components/Button.js';
import ConfirmDialog from '../../components/ConfirmDialog.js';
import DateTime from '../../components/DateTime.js';
import Icon from '../../components/Icon.js';
import PageHeader from '../../components/PageHeader.js';
import StatePanel, { TopicListSkeleton } from '../../components/StatePanel.js';
import { useToast } from '../../components/ToastProvider.js';
import usePageTitle from '../../hooks/usePageTitle.js';
import { deleteTopic, listTopics } from '../../services/topics.js';
import { getErrorMessage, summarizeText } from '../../utils/format.js';

function CountStrip({ topics, total, filtered }) {
  const externalAnswers = topics.reduce(
    (sum, topic) => sum + Number(topic.externalAnswerCount ?? topic.externalAnswers?.length ?? 0),
    0,
  );
  const understandings = topics.reduce(
    (sum, topic) => sum + Number(topic.understandingCount ?? topic.understandings?.length ?? 0),
    0,
  );
  const metrics = [
    { label: filtered ? '匹配主题' : '思考主题', value: total },
    { label: '外部解答', value: externalAnswers },
    { label: '理解记录', value: understandings },
  ];

  return (
    <dl className="count-strip" aria-label="思考记录统计">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TopicRow({ topic, onDelete }) {
  const answerCount = Number(topic.externalAnswerCount ?? topic.externalAnswers?.length ?? 0);
  const understandingCount = Number(topic.understandingCount ?? topic.understandings?.length ?? 0);
  const summary = topic.questionSummary || summarizeText(topic.question);

  return (
    <article className="topic-row">
      <div className="topic-row__body">
        <Link className="topic-row__title" to={`/topics/${topic.id}`}>
          {topic.title}
        </Link>
        <p className="topic-row__summary">{summary || '尚未记录原始问题摘要。'}</p>
        <div className="topic-row__meta">
          <span>{answerCount} 个外部解答</span>
          <span aria-hidden="true">·</span>
          <span>{understandingCount} 条我的理解</span>
          <span aria-hidden="true">·</span>
          <DateTime prefix="更新于" value={topic.updatedAt} />
        </div>
      </div>
      <div className="topic-row__actions">
        <Link
          aria-label={`编辑“${topic.title}”`}
          className="icon-button"
          title="编辑主题"
          to={`/topics/${topic.id}/edit`}
        >
          <Icon name="edit" size={18} />
        </Link>
        <button
          aria-label={`删除“${topic.title}”`}
          className="icon-button icon-button--danger"
          onClick={() => onDelete(topic)}
          title="删除主题"
          type="button"
        >
          <Icon name="trash" size={18} />
        </button>
        <Link
          aria-label={`打开“${topic.title}”`}
          className="topic-row__open"
          to={`/topics/${topic.id}`}
        >
          <span>查看</span>
          <Icon name="arrowRight" size={18} />
        </Link>
      </div>
    </article>
  );
}

export default function HomeModule() {
  usePageTitle('思考主题');
  const { notify } = useToast();
  const { refreshTopicIndex } = useOutletContext();
  const { openCreateCategory } = useCategories();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [searchValue, setSearchValue] = useState(query);
  const [result, setResult] = useState({ items: [], total: 0, query: '' });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

  useEffect(() => {
    if (searchParams.get('search') === '1') {
      searchInputRef.current?.focus();
    }
  }, [searchParams]);

  const load = useCallback((signal) => {
    setStatus('loading');
    setError('');
    return listTopics({ query, signal })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setResult({
          items,
          total: Number(data?.total ?? items.length),
          query: data?.query ?? query,
        });
        setStatus('success');
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') {
          setError(getErrorMessage(loadError, '暂时无法读取思考主题。'));
          setStatus('error');
        }
      });
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function submitSearch(event) {
    event.preventDefault();
    const nextQuery = searchValue.trim();
    setSearchParams(nextQuery ? { q: nextQuery } : {});
  }

  function clearSearch() {
    setSearchValue('');
    setSearchParams({});
    searchInputRef.current?.focus();
  }

  async function confirmDelete() {
    await deleteTopic(deleteTarget.id);
    const deletedTitle = deleteTarget.title;
    setDeleteTarget(null);
    notify(`已删除“${deletedTitle}”。`);
    await load();
    void refreshTopicIndex();
  }

  return (
    <div className="page home-page">
      <PageHeader
        actions={(
          <div className="navigation-create-actions">
          <ButtonLink to="/topics/new" variant="primary">
            <Icon name="plus" size={18} />
            新建思考
          </ButtonLink>
          <Button onClick={openCreateCategory} variant="secondary">新建分类</Button>
          </div>
        )}
        description="按问题保存外部资料与自己的阶段性理解。"
        eyebrow="THINKSTACK / 思栈"
        title="思考主题"
      />

      <form className="topic-search" onSubmit={submitSearch} role="search">
        <label htmlFor="topic-search-input">搜索思考记录</label>
        <div className="topic-search__control">
          <Icon name="search" size={19} />
          <input
            id="topic-search-input"
            maxLength={200}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="输入 Topic 标题或原始问题关键词"
            ref={searchInputRef}
            type="search"
            value={searchValue}
          />
          {searchValue ? (
            <button className="topic-search__clear" onClick={clearSearch} type="button">
              清除
            </button>
          ) : null}
        </div>
        <Button type="submit" variant="secondary">搜索</Button>
      </form>

      {status === 'loading' ? <TopicListSkeleton /> : null}

      {status === 'error' ? (
        <StatePanel
          action={() => load()}
          actionLabel="重新读取"
          description={error}
          icon="refresh"
          title="思考主题暂时不可用"
          tone="error"
        />
      ) : null}

      {status === 'success' ? (
        <>
          <CountStrip filtered={Boolean(query)} topics={result.items} total={result.total} />
          {result.items.length > 0 ? (
            <section aria-labelledby="topic-list-heading" className="topic-list-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">TOPICS</p>
                  <h2 id="topic-list-heading">{query ? `“${query}”的搜索结果` : '最近更新'}</h2>
                </div>
                <span>{result.total} 项</span>
              </div>
              <div className="topic-list">
                {result.items.map((topic) => (
                  <TopicRow key={topic.id} onDelete={setDeleteTarget} topic={topic} />
                ))}
              </div>
            </section>
          ) : query ? (
            <StatePanel
              action={clearSearch}
              actionLabel="清除搜索"
              description={`标题和原始问题中没有找到“${query}”。你可以换一个关键词再试。`}
              icon="search"
              title="没有匹配的思考主题"
            />
          ) : (
            <StatePanel
              actionLabel="新建思考"
              actionTo="/topics/new"
              description="先记录一个真实问题，再逐步补充外部解答和自己的理解。"
              icon="book"
              title="还没有思考主题"
            />
          )}
        </>
      ) : null}

      <ConfirmDialog
        confirmLabel="永久删除主题"
        description={deleteTarget ? (
          <p>
            将删除原始问题、{deleteTarget.externalAnswerCount ?? 0} 个外部解答和
            {deleteTarget.understandingCount ?? 0} 条理解记录。这个操作无法撤销。
          </p>
        ) : null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        open={Boolean(deleteTarget)}
        title={deleteTarget ? `删除“${deleteTarget.title}”？` : '删除主题？'}
      />
    </div>
  );
}
