import { t } from '../i18n/index.js';
import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.js';
import { useCategories } from './CategoryContext.js';

export default function CategoryMenu({ category, onNavigate }) {
  const { canEdit } = useAuth();
  const { selectCategory, openEditCategory, openDeleteCategory } = useCategories();
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector('[role="menuitem"]')?.focus();
    const outside = (event) => {
      if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) setPosition(null);
    };
    const close = () => setPosition(null);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [position]);
  useEffect(() => { if (!canEdit) setPosition(null); }, [canEdit]);
  if (!canEdit) return null;
  function toggle() {
    if (position) { setPosition(null); return; }
    const bounds = trigger.current.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(bounds.right - 164, window.innerWidth - 172)), top: Math.max(8, Math.min(bounds.bottom + 4, window.innerHeight - 150)) });
  }
  function run(action) {
    setPosition(null);
    trigger.current?.focus();
    onNavigate?.();
    action();
  }
  function keyDown(event) {
    const items = [...menu.current.querySelectorAll('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement);
    if (event.key === 'Escape' || event.key === 'Tab') {
      setPosition(null);
      if (event.key === 'Escape') { event.preventDefault(); trigger.current?.focus(); }
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  }
  return <>
    <button ref={trigger} type="button" className="category-menu-trigger" aria-label={t("{p0}分类操作", {
  p0: category.name
})} aria-haspopup="menu" aria-expanded={Boolean(position)} aria-controls={position ? id : undefined} onClick={toggle}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true"><circle cx="9" cy="4" r="1.5" /><circle cx="9" cy="9" r="1.5" /><circle cx="9" cy="14" r="1.5" /></svg>
    </button>
    {position ? createPortal(<div ref={menu} id={id} role="menu" aria-label={t("{p0}分类操作", {
  p0: category.name
})} className="category-menu" style={position} onKeyDown={keyDown}>
      <button type="button" role="menuitem" onClick={() => run(() => { selectCategory(category.id); navigate(`/topics/new?categoryId=${encodeURIComponent(category.id)}`); })}>{t("新建思考")}</button>
      {category.id !== 'default' ? <>
        <button type="button" role="menuitem" onClick={() => run(() => openEditCategory(category))}>{t("编辑")}</button>
        <button type="button" role="menuitem" className="category-menu__danger" onClick={() => run(() => openDeleteCategory(category))}>{t("删除")}</button>
      </> : null}
    </div>, document.body) : null}
  </>;
}
