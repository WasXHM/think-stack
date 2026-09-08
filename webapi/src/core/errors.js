export class AppError extends Error {
  constructor({ status = 500, code = 'INTERNAL_ERROR', message, details, expose, cause } = {}) {
    super(message ?? 'Internal server error', { cause });
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = expose ?? status < 500;
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super({
      status: 400,
      code: 'VALIDATION_ERROR',
      message,
      details,
      expose: true,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message, code = 'NOT_FOUND') {
    super({ status: 404, code, message, expose: true });
  }
}

export class StorageError extends AppError {
  constructor(message, cause) {
    super({
      status: 500,
      code: 'STORAGE_ERROR',
      message,
      expose: false,
      cause,
    });
  }
}
