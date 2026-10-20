import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { LANGUAGE_KEY, setLanguage, t, hasPendingWrites, subscribeWrites } from './index.js';

const Context = createContext(null);
export const useLanguage = () => useContext(Context);
export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState('zh');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let saved = 'zh';
    try { saved = window.localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'zh'; } catch {}
    setLanguage(saved); setLocale(saved); setReady(true);
    document.documentElement.lang = saved === 'en' ? 'en' : 'zh-CN';
  }, []);
  function changeLanguage(value) {
    if (value === locale || hasPendingWrites()) return;
    const editing = document.querySelector('textarea, [role="dialog"] input, .topic-form-layout');
    if (editing && !window.confirm(t('切换语言将关闭当前编辑页面，未保存的修改不会保留。是否继续？'))) return;
    setLanguage(value); setLocale(value);
    document.documentElement.lang = value === 'en' ? 'en' : 'zh-CN';
    try { window.localStorage.setItem(LANGUAGE_KEY, value); } catch {}
  }
  return <Context.Provider value={{ locale, changeLanguage }}>{ready ? children : null}</Context.Provider>;
}
export function LanguageSwitch() {
  const { locale, changeLanguage } = useLanguage();
  const busy = useSyncExternalStore(subscribeWrites, hasPendingWrites, () => false);
  return <select disabled={busy} className="language-switch" aria-label={t('界面语言')} value={locale} onChange={(event) => changeLanguage(event.target.value)}>
    <option value="zh">中文</option><option value="en">English</option>
  </select>;
}
export function EditingLanguageNotice() {
  const { locale } = useLanguage();
  return <p className="field__help">{t(locale === 'en' ? '编辑语言：英文。保存时仅更新英文版本。' : '编辑语言：中文。保存时仅更新中文版本。')}</p>;
}
