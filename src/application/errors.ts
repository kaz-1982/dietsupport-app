// Application 層の例外(D-14 のエラーコードに対応)。
// 契約スタブと同名・同階層を踏襲する(テストが instanceof で判定するため)。
export class ValidationError extends Error {
  constructor(m = 'ValidationError') {
    super(m);
    this.name = 'ValidationError';
  } // VAL-*
}
export class PersistenceError extends Error {
  constructor(m = 'PersistenceError') {
    super(m);
    this.name = 'PersistenceError';
  } // PER-001
}
export class NetworkError extends Error {
  constructor(m = 'NetworkError') {
    super(m);
    this.name = 'NetworkError';
  } // SYN-001/002
}
export class AuthError extends Error {
  constructor(m = 'AuthError') {
    super(m);
    this.name = 'AuthError';
  } // AUT-001(401)
}
export class RateLimitError extends Error {
  constructor(m = 'RateLimitError') {
    super(m);
    this.name = 'RateLimitError';
  } // AUT-002(429)
}
export class ConflictError extends Error {
  constructor(m = 'ConflictError') {
    super(m);
    this.name = 'ConflictError';
  } // AUT-004(409)
}

// HTTP ステータス → ドメイン例外(D-13 / D-14)。
export function mapHttpError(e: any): Error {
  const status = e?.status;
  if (status === 401) return new AuthError();
  if (status === 429) return new RateLimitError();
  if (status === 409) return new ConflictError();
  if (status === 400) return new ValidationError();
  if (e instanceof Error) return e;
  return new NetworkError();
}
