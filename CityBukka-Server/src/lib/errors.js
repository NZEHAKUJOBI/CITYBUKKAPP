export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, 'bad_request', message, details);
  }

  static notFound(what) {
    return new ApiError(404, 'not_found', `${what} not found`);
  }

  static conflict(message) {
    return new ApiError(409, 'conflict', message);
  }

  /** The row is still referenced elsewhere and cannot be deleted. */
  static inUse(message) {
    return new ApiError(409, 'in_use', message);
  }

  static unauthorized() {
    return new ApiError(401, 'unauthorized', 'Missing or invalid credentials');
  }
}

/** Parse `data` with a zod schema or throw a 400 listing every issue. */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw ApiError.badRequest(
      'Validation failed',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}
