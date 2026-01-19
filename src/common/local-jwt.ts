import { createHmac } from 'crypto';

export type LocalJwtPayload = {
  sub: string;
  email: string;
  role?: string;
  permissions?: string[];
  iat: number;
  exp: number;
  iss: 'local';
};

const TOKEN_PREFIX = 'Local';

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode<T>(input: string): T {
  return JSON.parse(Buffer.from(input, 'base64url').toString('utf8')) as T;
}

function sign(data: string, secret: string) {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function createLocalToken(
  payload: Omit<LocalJwtPayload, 'iat' | 'exp' | 'iss'>,
  expiresInSeconds: number,
) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: LocalJwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
    iss: 'local',
  };

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = sign(`${header}.${body}`, secret);

  return `${header}.${body}.${signature}`;
}

export function verifyLocalToken(token: string): LocalJwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`, secret);
  if (signature !== expected) {
    throw new Error('Invalid token signature');
  }

  const payload = base64UrlDecode<LocalJwtPayload>(body);
  if (payload.iss !== 'local') {
    throw new Error('Invalid token issuer');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token expired');
  }

  return payload;
}

export function withLocalAuthPrefix(token: string) {
  return `${TOKEN_PREFIX} ${token}`;
}
