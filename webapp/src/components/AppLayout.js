import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { CategoryProvider, useCategories } from './CategoryContext.js';
import useDialogFocus from '../hooks/useDialogFocus.js';
import { listTopics } from '../services/topics.js';
import { getErrorMessage } from '../utils/format.js';
import { Button, IconButton } from './Button.js';
import Icon from './Icon.js';
import { ThemeToggle } from './ThemeProvider.js';

function Brand() {
  return (
    <NavLink aria-label="ThinkStack 首页" className="brand" to="/">
      <span className="brand__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>
        <strong>ThinkStack</strong>
        <small>思栈</small>
      </span>
    </NavLink>
  );
}

function compareTopicsByCreatedAt(left, right) {
  const leftTime = Date.parse(left.createdAt);
  const rightTime = Date.parse(right.createdAt);

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  if (Number.isFinite(leftTime) !== Number.isFinite(rightTime)) {
    return Number.isFinite(leftTime) ? -1 : 1;
  }
  return String(left.id ?? '').localeCompare(String(right.id ?? ''));
}

function TopicNavigation({ error, items, onNavigate, onRetry, status }) {
  const { categories, selectedCategoryId, selectCategory, expanded, toggleCategory, loadError, refresh } = useCategories();
  return (
    <div className="navigation-topics">
      <div className="navigation-topics__heading">
        <span>已添加主题</span>
        <span>{status === 'success' ? items.length : '—'}</span>
      </div>

      {status === 'loading' ? (
        <div aria-label="正在读取已添加的主题" className="navigation-topics__skeleton" role="status">
          {[0, 1, 2, 3].map((item) => (
            <span className="skeleton navigation-topics__skeleton-row" key={item} />
          ))}
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="navigation-topics__state" role="alert">
          <p>{error}</p>
          <Button onClick={onRetry} size="small" type="button">重新读取</Button>
        </div>
      ) : null}

      {loadError ? <div role="alert" className="navigation-topics__state">{loadError}<Button onClick={refresh}>重试</Button></div> : null}
      {status === 'success' ? (
        <ul aria-label="主题分类" className="navigation-topic-list">
          {categories.map((category) => {
            const topics = items.filter((topic) => (topic.categoryId ?? 'default') === category.id);
            const isExpanded = expanded.includes(category.id);
            return <li key={category.id}>
              <div className={`navigation-category ${selectedCategoryId === category.id ? 'is-selected' : ''}`}>
                <button type="button" className="category-toggle" aria-label={`${isExpanded ? '收起' : '展开'}${category.name}`} aria-expanded={isExpanded} onClick={() => toggleCategory(category.id)}>{isExpanded ? '▾' : '▸'}</button>
                <button type="button" className="category-select" aria-pressed={selectedCategoryId === category.id} onClick={() => selectCategory(category.id)}><span>{category.name}</span><small>{topics.length}</small></button>
              </div>
              {isExpanded ? <ul className="navigation-category-topics">
                {topics.map((topic, index) => <li key={topic.id}>
                  <NavLink className={({ isActive }) => `navigation-topic-link ${isActive ? 'is-active' : ''}`} onClick={() => { selectCategory(category.id); onNavigate?.(); }} title={topic.title} to={`/topics/${topic.id}`}>
                    <span aria-hidden="true" className="navigation-topic-link__index">{String(index + 1).padStart(2, '0')}</span><span className="navigation-topic-link__title">{topic.title}</span>
                  </NavLink>
                </li>)}
                {!topics.length ? <li className="navigation-topics__empty">暂无主题</li> : null}
              </ul> : null}
            </li>;
          })}
        </ul>
      ) : null}
    </div>
  );
}

function Navigation({ onNavigate, onRetryTopics, topicIndex }) {
  const { openCreateCategory } = useCategories();
  return (
    <nav aria-label="主导航" className="primary-navigation">
      <p className="navigation-label">工作区</p>
      <NavLink
        className={({ isActive }) => `navigation-link ${isActive ? 'is-active' : ''}`}
        end
        onClick={onNavigate}
        to="/"
      >
        <Icon name="home" size={19} />
        <span>全部思考</span>
      </NavLink>
      <TopicNavigation
        error={topicIndex.error}
        items={topicIndex.items}
        onNavigate={onNavigate}
        onRetry={onRetryTopics}
        status={topicIndex.status}
      />
      <div className="navigation-create-actions">
      <NavLink
        className={({ isActive }) => `navigation-link ${isActive ? 'is-active' : ''}`}
        onClick={onNavigate}
        to="/topics/new"
      >
        <Icon name="plus" size={19} />
        <span>新建思考</span>
      </NavLink>
      <button type="button" className="navigation-link" onClick={() => { onNavigate?.(); openCreateCategory(); }}>新建分类</button>
      </div>
    </nav>
  );
}

function Sidebar({ collapsed, onToggle, onRetryTopics, topicIndex }) {
  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand-row"><Brand /><IconButton icon={collapsed ? 'chevronRight' : 'chevronLeft'} label={collapsed ? '展开导航栏' : '收起导航栏'} onClick={onToggle} /></div>
      <Navigation onRetryTopics={onRetryTopics} topicIndex={topicIndex} />
      <div className="sidebar__note">
        <p>问题留下来，理解继续生长。</p>
        <span>个人技术思考工作台</span>
      </div>
    </aside>
  );
}

function MobileNavigation({ open, onClose, onRetryTopics, topicIndex }) {
  const panelRef = useRef(null);
  useDialogFocus({ open, containerRef: panelRef, onClose });

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="mobile-navigation-layer">
      <button
        aria-label="关闭导航"
        className="overlay-backdrop"
        onClick={onClose}
        tabIndex="-1"
        type="button"
      />
      <aside
        aria-label="移动导航"
        aria-modal="true"
        className="mobile-navigation"
        ref={panelRef}
        role="dialog"
        tabIndex="-1"
      >
        <div className="mobile-navigation__header">
          <Brand />
          <IconButton data-autofocus icon="close" label="关闭导航" onClick={onClose} />
        </div>
        <Navigation
          onNavigate={onClose}
          onRetryTopics={onRetryTopics}
          topicIndex={topicIndex}
        />
        <div className="mobile-navigation__footer">
          <span>界面主题</span>
          <ThemeToggle />
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function useTopicIndex(pathname) {
  const [topicIndex, setTopicIndex] = useState({
    items: [],
    status: 'loading',
    error: '',
  });
  const activeRequestRef = useRef(null);
  const hasLoadedRef = useRef(false);

  const refreshTopicIndex = useCallback(async ({ showLoading } = {}) => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const shouldShowLoading = showLoading ?? !hasLoadedRef.current;

    if (shouldShowLoading) {
      setTopicIndex((current) => ({ ...current, status: 'loading', error: '' }));
    }

    try {
      const data = await listTopics({ signal: controller.signal });
      if (controller.signal.aborted) {
        return;
      }
      const receivedItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const items = [...receivedItems].sort(compareTopicsByCreatedAt);
      hasLoadedRef.current = true;
      setTopicIndex({ items, status: 'success', error: '' });
    } catch (loadError) {
      if (loadError.name !== 'AbortError' && !hasLoadedRef.current) {
        setTopicIndex({
          items: [],
          status: 'error',
          error: getErrorMessage(loadError, '主题列表暂时不可用。'),
        });
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    void refreshTopicIndex();
    return () => activeRequestRef.current?.abort();
  }, [pathname, refreshTopicIndex]);

  return { refreshTopicIndex, topicIndex };
}

function getLocationLabel(pathname) {
  if (pathname === '/') return '全部思考';
  if (pathname === '/topics/new') return '新建思考';
  if (pathname.endsWith('/edit')) return '编辑主题';
  if (pathname.startsWith('/topics/')) return '主题详情';
  return '页面未找到';
}

function GlobalSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [value, setValue] = useState(location.pathname === '/' ? searchParams.get('q') ?? '' : '');

  useEffect(() => {
    if (location.pathname === '/') {
      setValue(searchParams.get('q') ?? '');
    }
  }, [location.pathname, searchParams]);

  function submit(event) {
    event.preventDefault();
    const query = value.trim();
    navigate(query ? `/?q=${encodeURIComponent(query)}` : '/');
  }

  return (
    <form className="global-search" onSubmit={submit} role="search">
      <label className="sr-only" htmlFor="global-search-input">搜索思考主题</label>
      <Icon name="search" size={17} />
      <input
        id="global-search-input"
        maxLength={200}
        onChange={(event) => setValue(event.target.value)}
        placeholder="搜索标题或原始问题"
        type="search"
        value={value}
      />
    </form>
  );
}

function AppLayoutContent() {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const location = useLocation();
  const { refreshTopicIndex, topicIndex } = useTopicIndex(location.pathname);
  const closeNavigation = useCallback(() => setNavigationOpen(false), []);
  const retryTopics = useCallback(
    () => refreshTopicIndex({ showLoading: true }),
    [refreshTopicIndex],
  );
  const outletContext = useMemo(() => ({ refreshTopicIndex }), [refreshTopicIndex]);

  useEffect(() => {
    setNavigationOpen(false);
  }, [location.pathname]);

  function skipToMainContent(event) {
    event.preventDefault();
    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: true });
    main?.scrollIntoView({ block: 'start' });
  }

  return (
    <div className={`app-shell${navigationCollapsed ? ' app-shell--navigation-collapsed' : ''}`}>
      <a
        className="skip-link"
        href={`${window.location.pathname}${window.location.search}#main-content`}
        onClick={skipToMainContent}
      >
        跳到主要内容
      </a>
      <Sidebar collapsed={navigationCollapsed} onToggle={() => setNavigationCollapsed((value) => !value)} onRetryTopics={retryTopics} topicIndex={topicIndex} />
      <MobileNavigation
        onClose={closeNavigation}
        onRetryTopics={retryTopics}
        open={navigationOpen}
        topicIndex={topicIndex}
      />
      <div className="app-workspace">
        <header className="topbar">
          <div className="topbar__location">
            <IconButton
              className="topbar__menu"
              icon="menu"
              label="打开导航"
              onClick={() => setNavigationOpen(true)}
            />
            <span className="topbar__context">ThinkStack</span>
            <span aria-hidden="true">/</span>
            <strong>{getLocationLabel(location.pathname)}</strong>
          </div>
          <div className="topbar__actions">
            <GlobalSearch />
            <NavLink
              aria-label="在首页搜索"
              className="icon-button topbar__mobile-search"
              to="/?search=1"
            >
              <Icon name="search" size={18} />
            </NavLink>
            <ThemeToggle />
          </div>
        </header>
        <main className="main-content" id="main-content" tabIndex="-1">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return <CategoryProvider><AppLayoutContent /></CategoryProvider>;
}
