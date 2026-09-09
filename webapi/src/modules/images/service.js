import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../../core/errors.js';
import { IMAGE_TYPES, validateImage } from './filter.js';

export function createImageService(resourcesDir) {
  const directory = join(resourcesDir, 'images');
  return {
    async create(buffer, type) {
      validateImage(buffer, type);
      const name = `${randomUUID()}.${IMAGE_TYPES[type]}`;
      const temporary = join(directory, `.${name}.tmp`);
      await mkdir(directory, { recursive: true });
      try {
        await writeFile(temporary, buffer, { flag: 'wx' });
        await rename(temporary, join(directory, name));
      } finally {
        await unlink(temporary).catch(() => {});
      }
      return { path: `/images/${name}`, size: buffer.length, contentType: type };
    },
    async get(name) {
      try {
        const buffer = await readFile(join(directory, name));
        const type = Object.entries(IMAGE_TYPES).find(([, extension]) => name.endsWith(`.${extension}`))[0];
        return { buffer, type };
      } catch (error) {
        if (error.code === 'ENOENT') throw new NotFoundError('图片不存在。', 'IMAGE_NOT_FOUND');
        throw error;
      }
    },
  };
}
