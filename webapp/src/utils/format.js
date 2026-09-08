const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatDate(value, { withTime = false } = {}) {
  if (!value) {
    return '时间未记录';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '时间未记录';
  }
  return (withTime ? dateTimeFormatter : dateFormatter)
    .format(date)
    .replaceAll('/', '-');
}

export function summarizeText(value, maxLength = 150) {
  const plainText = String(value ?? '')
    .replace(/```[\s\S]*?```/g, ' 代码片段 ')
    .replace(/[`*_>#\[\]()|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }
  return `${plainText.slice(0, maxLength).trim()}…`;
}

export function getErrorMessage(error, fallback = '暂时无法完成此操作，请重新尝试。') {
  if (error?.name === 'AbortError') {
    return '';
  }
  return error?.message || fallback;
}

