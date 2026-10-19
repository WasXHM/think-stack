import { resourcesDir } from '../../../../lib/resources.js';
import { createImageService } from '../../../../webapi/src/modules/images/service.js';
import { filterImageName } from '../../../../webapi/src/modules/images/filter.js';

export const runtime = 'nodejs';

export async function GET(_request, { params }) {
  const { buffer, type } = await createImageService(resourcesDir).get(filterImageName(params.name));
  return new Response(buffer, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
}
