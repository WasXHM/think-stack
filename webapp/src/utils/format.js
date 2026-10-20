import { t, getLanguage } from '../i18n/index.js';
export function formatDate(value, { withTime = false } = {}) {
  if (!value) {
    return t("时间未记录");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("时间未记录");
  }
  return new Intl.DateTimeFormat(getLanguage() === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(date);
}

export function summarizeText(value, maxLength = 150) {
  const plainText = String(value ?? '')
    .replace(/```[\s\S]*?```/g, t(" 代码片段 "))
    .replace(/[`*_>#\[\]()|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }
  return `${plainText.slice(0, maxLength).trim()}…`;
}

export function getErrorMessage(error, fallback = t("暂时无法完成此操作，请重新尝试。")) {
  if (error?.name === 'AbortError') {
    return '';
  }
  return error?.message ? t(error.message) : fallback;
}

