import { AppError, ValidationError } from '../../core/errors.js';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export function filterImageType(contentType = '') {
  const type = contentType.split(';')[0].trim().toLowerCase();
  if (!IMAGE_TYPES[type]) {
    throw new AppError({ status: 415, code: 'UNSUPPORTED_IMAGE', message: '请上传 PNG、JPEG 或 WebP 图片。' });
  }
  return type;
}

export function imageTooLarge() {
  return new AppError({ status: 413, code: 'IMAGE_TOO_LARGE', message: '单张图片不能超过 10 MB。' });
}

export function validateImage(buffer, type) {
  if (buffer.length > MAX_IMAGE_BYTES) throw imageTooLarge();
  const png = buffer.length >= 45
    && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    && buffer.toString('ascii', 12, 16) === 'IHDR'
    && buffer.readUInt32BE(16) > 0 && buffer.readUInt32BE(20) > 0
    && buffer.toString('ascii', buffer.length - 8, buffer.length - 4) === 'IEND';
  const jpeg = buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8
    && buffer[2] === 0xff && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  const webp = buffer.length >= 20 && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
    && ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.toString('ascii', 12, 16))
    && buffer.readUInt32LE(4) + 8 === buffer.length;
  if (!({ 'image/png': png, 'image/jpeg': jpeg, 'image/webp': webp })[type]) {
    throw new ValidationError('图片内容与格式不符，或图片文件不完整。');
  }
}

export function filterImageName(name) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/.test(name ?? '')) {
    throw new ValidationError('无效的图片资源标识。');
  }
  return name;
}
