export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';

export function validateImageFile(file) {
  if (!IMAGE_ACCEPT.split(',').includes(file.type)) throw new Error('请使用 PNG、JPEG 或 WebP 图片。');
  if (!file.size) throw new Error('图片为空，请重新截图后粘贴。');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('单张图片不能超过 10 MB。');
}

export function clipboardImages(clipboard) {
  const files = Array.from(clipboard?.items ?? [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile()).filter(Boolean);
  return files.length ? files : Array.from(clipboard?.files ?? []).filter((file) => file.type.startsWith('image/'));
}

export function insertMarkdownImages(value, start, end, urls, maxLength = 500000) {
  const images = urls.map((url) => {
    if (typeof url !== 'string' || !/^(https?:\/\/|\/(?!\/))/.test(url)) throw new Error('上传服务返回了无效的图片地址。');
    return `![截图](${url.replace(/[\s()<>\\]/g, (character) => encodeURIComponent(character).replace(/\(/g, '%28').replace(/\)/g, '%29'))})`;
  }).join('\n\n');
  const before = value.slice(0, start);
  const after = value.slice(end);
  const inserted = `${before && !before.endsWith('\n') ? '\n' : ''}${images}${after && !after.startsWith('\n') ? '\n' : ''}`;
  const nextValue = before + inserted + after;
  if (nextValue.length > maxLength) throw new Error('插入图片后超过正文长度限制，请缩短内容后重试。');
  return { value: nextValue, caret: before.length + inserted.length };
}
