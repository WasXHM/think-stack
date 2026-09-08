export async function notFound(ctx) {
  if (ctx.status === 404 && ctx.body == null) {
    ctx.status = 404;
    ctx.type = 'application/json';
    ctx.body = {
      error: {
        code: 'NOT_FOUND',
        message: `No route matches ${ctx.method} ${ctx.path}`,
      },
    };
  }
}
