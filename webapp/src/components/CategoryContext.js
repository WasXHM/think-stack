import ConfirmDialog from './ConfirmDialog.js';
import CategoryOrderDialog from './CategoryOrderDialog.js';
import { useToast } from './ToastProvider.js';
import { useAuth } from './AuthContext.js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { createCategory, listCategories, renameCategory, deleteCategory } from '../services/topics.js';
import { getErrorMessage } from '../utils/format.js';
import Drawer from './Drawer.js';
import { Button } from './Button.js';

const Context = createContext(null);
export const useCategories = () => useContext(Context);

export function CategoryProvider({ children }) {
  const { canEdit } = useAuth();
  const { notify } = useToast();
  const [orderOpen, setOrderOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [categoryRevision, setCategoryRevision] = useState(0);
  useEffect(() => { if (!canEdit) { setOrderOpen(false); setOpen(false); setDeleteTarget(null); } }, [canEdit]);
  const [categories, setCategories] = useState([{ id: 'default', name: '默认分类' }]);
  const [selectedCategoryId, selectCategory] = useState('default');
  const [expanded, setExpanded] = useState(['default']);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    try { const data = await listCategories(); setCategories(data.items); setLoadError(''); }
    catch (error) { setLoadError(getErrorMessage(error, '分类读取失败')); }
  }
  useEffect(() => { void refresh(); }, []);
  function select(id) {
    selectCategory(id);
    setExpanded((current) => current.includes(id) ? current : [...current, id]);
  }
  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) { setError('请输入分类名称。'); return; }
    setBusy(true); setError('');
    try {
      const category = editingCategory
        ? await renameCategory(editingCategory.id, { name: name.trim() })
        : await createCategory({ name: name.trim() });
      setCategories((current) => editingCategory ? current.map((item) => item.id === category.id ? category : item) : [...current, category]);
      select(category.id); setOpen(false);
      notify(editingCategory ? '分类名称已更新。' : '分类已创建。');
    } catch (error) { setError(getErrorMessage(error, '分类创建失败')); }
    finally { setBusy(false); }
  }
  async function confirmDelete() {
    const deletedId = deleteTarget.id;
    const data = await deleteCategory(deletedId);
    setCategories(data.items);
    setExpanded((current) => [...new Set([...current.filter((id) => id !== deletedId), 'default'])]);
    selectCategory((current) => current === deletedId ? 'default' : current);
    setCategoryRevision((current) => current + 1);
    setDeleteTarget(null);
    notify('分类已删除，其下主题已转移到默认分类。');
  }
  return <Context.Provider value={{ categoryRevision, categories, selectedCategoryId, selectCategory: select, expanded,
    toggleCategory: (id) => setExpanded((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]),
    openCategoryOrder: () => setOrderOpen(true),
    openEditCategory: (category) => { setEditingCategory(category); setName(category.name); setError(''); setOpen(true); },
    openDeleteCategory: setDeleteTarget,
    openCreateCategory: () => { setEditingCategory(null); setName(''); setError(''); setOpen(true); }, loadError, refresh }}>
    {children}
    <ConfirmDialog open={canEdit && Boolean(deleteTarget)} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} title={`删除“${deleteTarget?.name ?? ''}”？`} description="该分类下的所有主题将转移到默认分类，主题内容、外部解答和理解记录都会保留。" confirmLabel="删除分类并转移主题" />
    <CategoryOrderDialog open={canEdit && orderOpen} onClose={() => setOrderOpen(false)} onSaved={(items) => { setCategories(items); setLoadError(''); notify('分类顺序已保存。'); }} />
    <Drawer open={canEdit && open} onClose={() => setOpen(false)} title={editingCategory ? "编辑分类" : "新建分类"} description="分类仅支持单层结构。" busy={busy} presentation="workspace-dialog">
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="category-name">分类名称</label>
          <input id="category-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} autoComplete="off" disabled={busy} />
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="form-actions"><Button busy={busy} type="submit" variant="primary">{editingCategory ? "保存名称" : "创建分类"}</Button><Button disabled={busy} onClick={() => setOpen(false)} type="button">取消</Button></div>
      </form>
    </Drawer>
  </Context.Provider>;
}
