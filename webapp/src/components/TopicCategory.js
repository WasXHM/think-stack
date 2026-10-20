import { t } from '../i18n/index.js';
import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from './AuthContext.js';
import { useCategories } from './CategoryContext.js';
import { useToast } from './ToastProvider.js';
import { Button } from './Button.js';
import Drawer from './Drawer.js';
import { updateTopic } from '../services/topics.js';
import { getErrorMessage } from '../utils/format.js';

export default function TopicCategory({ topic, onSaved }) {
  const { canEdit } = useAuth();
  const { categories, selectCategory, loadError, refresh } = useCategories();
  const { refreshTopicIndex } = useOutletContext();
  const { notify } = useToast();
  const currentId = topic.categoryId ?? 'default';
  const currentName = categories.find((category) => category.id === currentId)?.name ?? t("分类暂不可用");
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(currentId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!canEdit) setOpen(false); }, [canEdit]);

  function openDialog() {
    setCategoryId(currentId);
    setError('');
    setOpen(true);
    void refresh();
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || !canEdit || categoryId === currentId || loadError) return;
    setBusy(true);
    setError('');
    try {
      const saved = await updateTopic(topic.id, { categoryId });
      onSaved(saved);
      selectCategory(saved.categoryId ?? 'default');
      setOpen(false);
      notify(t("主题分类已更新。"));
      await refreshTopicIndex();
    } catch (error) {
      setError(getErrorMessage(error, t("分类修改失败，请重试。")));
    } finally {
      setBusy(false);
    }
  }

  return <div className="topic-category">
    <dl className="topic-overview__dates"><div><dt>{t("所属分类")}</dt><dd>{currentName}</dd></div></dl>
    {canEdit ? <Button size="small" onClick={openDialog}>{t("更改分类")}</Button> : null}
    <Drawer open={canEdit && open} onClose={() => setOpen(false)} title={t("更改主题分类")} description={t("选择目标分类，主题及其全部内容将保留。")} busy={busy} presentation="workspace-dialog">
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="move-topic-category">{t("目标分类")}</label>
          <select id="move-topic-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={busy}>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        {loadError ? <div role="alert"><p>{loadError}</p><Button type="button" onClick={refresh} disabled={busy}>{t("重新读取分类")}</Button></div> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="form-actions">
          <Button type="submit" variant="primary" busy={busy} disabled={Boolean(loadError) || categoryId === currentId || !categories.some((category) => category.id === categoryId)}>{t("保存分类")}</Button>
          <Button type="button" disabled={busy} onClick={() => setOpen(false)}>{t("取消")}</Button>
        </div>
      </form>
    </Drawer>
  </div>;
}
