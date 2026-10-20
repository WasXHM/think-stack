import { t } from '../../i18n/index.js';
import { useAuth } from '../../components/AuthContext.js';
import { useCategories } from '../../components/CategoryContext.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';

import { Button } from '../../components/Button.js';
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
    { label: filtered ? t("匹配主题") : t("思考主题"), value: total },
    { label: t("外部解答"), value: externalAnswers },
    { label: t("理解记录"), value: understandings },
  ];

  return (
    <dl className="count-strip" aria-label={t("思考记录统计")}>
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
  const { canEdit } = useAuth();
  const answerCount = Number(topic.externalAnswerCount ?? topic.externalAnswers?.length ?? 0);
  const understandingCount = Number(topic.understandingCount ?? topic.understandings?.length ?? 0);
  const summary = topic.questionSummary || summarizeText(topic.question);

  return (
    <article className="topic-row">
      <div className="topic-row__body">
        <Link className="topic-row__title" to={`/topics/${topic.id}`}>
          {topic.title}
        </Link>
        <p className="topic-row__summary">{summary || t("尚未记录原始问题摘要。")}</p>
        <div className="topic-row__meta">
          <span>{answerCount} {t("个外部解答")}</span>
          <span aria-hidden="true">·</span>
          <span>{understandingCount} {t("条我的理解")}</span>
          <span aria-hidden="true">·</span>
          <DateTime prefix={t("更新于")} value={topic.updatedAt} />
        </div>
      </div>
      <div className="topic-row__actions">
        {canEdit && <><Link
          aria-label={t("编辑“{p0}”", {
  p0: topic.title
})}
          className="icon-button"
          title={t("编辑主题")}
          to={`/topics/${topic.id}/edit`}
        >
          <Icon name="edit" size={18} />
        </Link>
        <button
          aria-label={t("删除“{p0}”", {
  p0: topic.title
})}
          className="icon-button icon-button--danger"
          onClick={() => onDelete(topic)}
          title={t("删除主题")}
          type="button"
        >
          <Icon name="trash" size={18} />
        </button></>}
        <Link
          aria-label={t("打开“{p0}”", {
  p0: topic.title
})}
          className="topic-row__open"
          to={`/topics/${topic.id}`}
        >
          <span>{t("查看")}</span>
          <Icon name="arrowRight" size={18} />
        </Link>
      </div>
    </article>
  );
}

export default function HomeModule() {
  const { canEdit } = useAuth();
  usePageTitle(t("思考主题"));
  const { notify } = useToast();
  const { refreshTopicIndex } = useOutletContext();
  const { openCreateCategory, categoryRevision } = useCategories();
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
          setError(getErrorMessage(loadError, t("暂时无法读取思考主题。")));
          setStatus('error');
        }
      });
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, categoryRevision]);

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
    notify(t("已删除“{p0}”。", {
  p0: deletedTitle
}));
    await load();
    void refreshTopicIndex();
  }

  return (
    <div className="page home-page">
      <PageHeader
        actions={canEdit && (
          <div className="navigation-create-actions">
          <Button onClick={openCreateCategory} variant="secondary">{t("新建分类")}</Button>
          </div>
        )}
        description={t("按问题保存外部资料与自己的阶段性理解。")}
        eyebrow={t("THINKSTACK / 思栈")}
        title={t("思考主题")}
      />

      <form className="topic-search" onSubmit={submitSearch} role="search">
        <label htmlFor="topic-search-input">{t("搜索思考记录")}</label>
        <div className="topic-search__control">
          <Icon name="search" size={19} />
          <input
            id="topic-search-input"
            maxLength={200}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("输入 Topic 标题或原始问题关键词")}
            ref={searchInputRef}
            type="search"
            value={searchValue}
          />
          {searchValue ? (
            <button className="topic-search__clear" onClick={clearSearch} type="button"> {t("清除")} </button>
          ) : null}
        </div>
        <Button type="submit" variant="secondary">{t("搜索")}</Button>
      </form>

      {status === 'loading' ? <TopicListSkeleton /> : null}

      {status === 'error' ? (
        <StatePanel
          action={() => load()}
          actionLabel={t("重新读取")}
          description={error}
          icon="refresh"
          title={t("思考主题暂时不可用")}
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
                  <h2 id="topic-list-heading">{query ? t("“{p0}”的搜索结果", {
  p0: query
}) : t("最近更新")}</h2>
                </div>
                <span>{result.total} {t("项")}</span>
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
              actionLabel={t("清除搜索")}
              description={t("标题和原始问题中没有找到“{p0}”。你可以换一个关键词再试。", {
  p0: query
})}
              icon="search"
              title={t("没有匹配的思考主题")}
            />
          ) : (
            <StatePanel
              description={t("先记录一个真实问题，再逐步补充外部解答和自己的理解。")}
              icon="book"
              title={t("还没有思考主题")}
            />
          )}
        </>
      ) : null}

      <ConfirmDialog
        confirmLabel={t("永久删除主题")}
        description={deleteTarget ? (
          <p>{t("将删除原始问题、{answers} 个外部解答和 {notes} 条理解记录。这个操作无法撤销。", { answers: deleteTarget.externalAnswerCount ?? 0, notes: deleteTarget.understandingCount ?? 0 })}</p>
        ) : null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        open={canEdit && Boolean(deleteTarget)}
        title={deleteTarget ? t("删除“{p0}”？", {
  p0: deleteTarget.title
}) : t("删除主题？")}
      />
    </div>
  );
}
