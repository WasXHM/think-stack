import { AppError } from '../../core/errors.js';
import { filterImageName, filterImageType, imageTooLarge, MAX_IMAGE_BYTES } from './filter.js';

// Drain oversized requests without retaining their bytes or destroying the response socket.
function readImage(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_IMAGE_BYTES) {
        chunks.length = 0;
        reject(imageTooLarge());
      } else {
        chunks.push(chunk);
      }
    });
    request.once('end', () => resolve(Buffer.concat(chunks)));
    request.once('error', reject);
    request.once('aborted', () => reject(new AppError({ status: 400, message: '图片上传已中断。' })));
  });
}

export async function uploadImage(ctx) {
  const type = filterImageType(ctx.get('content-type'));
  if (Number(ctx.get('content-length')) > MAX_IMAGE_BYTES) {
    ctx.req.resume();
    throw imageTooLarge();
  }
  const buffer = await readImage(ctx.req);
  ctx.body = { data: await ctx.imageService.create(buffer, type) };
  ctx.status = 201;
}

export async function getImage(ctx) {
  const { buffer, type } = await ctx.imageService.get(filterImageName(ctx.params.name));
  ctx.set('X-Content-Type-Options', 'nosniff');
  ctx.set('Cache-Control', 'public, max-age=31536000, immutable');
  ctx.type = type;
  ctx.body = buffer;
}
