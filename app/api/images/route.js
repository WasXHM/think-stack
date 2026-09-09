import { createImageService } from '../../../webapi/src/modules/images/service.js';
import { filterImageType, MAX_IMAGE_BYTES } from '../../../webapi/src/modules/images/filter.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const type = filterImageType(request.headers.get('content-type') ?? '');
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_IMAGE_BYTES) return Response.json({ error: { code: 'IMAGE_TOO_LARGE', message: '单张图片不能超过 10 MB。' } }, { status: 413 });
  const buffer = Buffer.from(await request.arrayBuffer());
  const data = await createImageService(`${process.cwd()}/webapi/resources`).create(buffer, type);
  return Response.json({ data }, { status: 201 });
}
