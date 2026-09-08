function defaultErrorCode(status, error) {
  if (status === 400 && error instanceof SyntaxError) {
    return 'INVALID_JSON';
  }

  if (status === 405) {
    return 'METHOD_NOT_ALLOWED';
  }

  if (status === 413) {
    return 'PAYLOAD_TOO_LARGE';
  }

  return status < 500 ? 'REQUEST_ERROR' : 'INTERNAL_ERROR';
}

export async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (error) {
    const candidateStatus = Number.isInteger(error.status) ? error.status : 500;
    const status = candidateStatus >= 400 && candidateStatus <= 599 ? candidateStatus : 500;
    const expose = error.expose === true || status < 500;

    ctx.status = status;
    ctx.type = 'application/json';
    ctx.body = {
      error: {
        code: error.code ?? defaultErrorCode(status, error),
        message: expose ? error.message : 'Internal server error',
        ...(expose && error.details !== undefined ? { details: error.details } : {}),
      },
    };

    if (status >= 500) {
      ctx.app.emit('error', error, ctx);
    }
  }
}
