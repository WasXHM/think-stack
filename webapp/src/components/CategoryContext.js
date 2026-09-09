import React, { createContext, useContext, useEffect, useState } from 'react';
import { createCategory, listCategories } from '../services/topics.js';
import { getErrorMessage } from '../utils/format.js';
import Drawer from './Drawer.js';
import { Button } from './Button.js';

const Context = createContext(null);
export const useCategories = () => useContext(Context);

export function CategoryProvider({ children }) {
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
      const category = await createCategory({ name: name.trim() });
      setCategories((current) => [...current, category]);
      select(category.id); setOpen(false);
    } catch (error) { setError(getErrorMessage(error, '分类创建失败')); }
    finally { setBusy(false); }
  }
  return <Context.Provider value={{ categories, selectedCategoryId, selectCategory: select, expanded,
    toggleCategory: (id) => setExpanded((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]),
    openCreateCategory: () => { setName(''); setError(''); setOpen(true); }, loadError, refresh }}>
    {children}
    <Drawer open={open} onClose={() => setOpen(false)} title="新建分类" description="分类仅支持单层结构。" busy={busy} presentation="workspace-dialog">
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="category-name">分类名称</label>
          <input id="category-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} autoComplete="off" disabled={busy} />
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="form-actions"><Button busy={busy} type="submit" variant="primary">创建分类</Button><Button disabled={busy} onClick={() => setOpen(false)} type="button">取消</Button></div>
      </form>
    </Drawer>
  </Context.Provider>;
}
