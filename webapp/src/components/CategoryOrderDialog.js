import { t } from '../i18n/index.js';
import React, { useEffect, useState } from 'react';
import { listCategories, reorderCategories } from '../services/topics.js';
import { getErrorMessage } from '../utils/format.js';
import Drawer from './Drawer.js';
import { Button } from './Button.js';

export default function CategoryOrderDialog({ open, onClose, onSaved }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [conflict, setConflict] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setConflict(false);
    listCategories({ signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setItems(data.items); })
      .catch((error) => { if (!controller.signal.aborted) { setError(getErrorMessage(error, t("分类读取失败。"))); setConflict(true); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, reload]);

  function move(index, offset) {
    setItems((current) => {
      const next = [...current];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  }
  async function save(event) {
    event.preventDefault();
    if (busy || loading || conflict) return;
    setBusy(true); setError('');
    try {
      const data = await reorderCategories(items.map((item) => item.id));
      onSaved(data.items);
      onClose();
    } catch (error) {
      setError(getErrorMessage(error, t("排序保存失败，请重试。")));
      if (error.status === 409) setConflict(true);
    } finally { setBusy(false); }
  }
  return <Drawer open={open} onClose={onClose} title={t("分类排序")} description={t("使用上移、下移调整顺序，保存后应用到导航和分类选择框。")} busy={busy} presentation="workspace-dialog">
    <form onSubmit={save}>
      {loading ? <p role="status">{t("正在读取分类…")}</p> : <ol className="category-order-list">
        {items.map((item, index) => <li key={item.id}>
          <span className="category-order-list__name">{item.name}</span>
          <Button type="button" size="small" aria-label={t("上移{p0}", {
  p0: item.name
})} disabled={busy || conflict || index === 0} onClick={() => move(index, -1)}>{t("上移")}</Button>
          <Button type="button" size="small" aria-label={t("下移{p0}", {
  p0: item.name
})} disabled={busy || conflict || index === items.length - 1} onClick={() => move(index, 1)}>{t("下移")}</Button>
        </li>)}
      </ol>}
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      {conflict ? <Button type="button" disabled={busy || loading} onClick={() => setReload((value) => value + 1)}>{t("重新读取分类")}</Button> : null}
      <div className="form-actions">
        <Button type="submit" variant="primary" busy={busy} disabled={loading || conflict || !items.length}>{t("保存顺序")}</Button>
        <Button type="button" disabled={busy} onClick={onClose}>{t("取消")}</Button>
      </div>
    </form>
  </Drawer>;
}
