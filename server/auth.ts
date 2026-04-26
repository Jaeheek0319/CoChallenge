import { Request, Response, NextFunction } from 'express';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL;

const client = supabaseUrl
  ? jwksClient({
      jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 10 * 60 * 1000,
      rateLimit: true,
    })
  : null;

function getKey(header: JwtHeader, callback: SigningKeyCallback) {
  if (!client) return callback(new Error('SUPABASE_URL not set'));
  if (!header.kid) return callback(new Error('no kid in token header'));
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing bearer token' });
  }
  const token = header.slice(7);

  jwt.verify(
    token,
    getKey,
    {
      algorithms: ['ES256', 'RS256'],
      issuer: supabaseUrl ? `${supabaseUrl}/auth/v1` : undefined,
      audience: 'authenticated',
    },
    (err, decoded) => {
      if (err || !decoded || typeof decoded === 'string') {
        return res.status(401).json({ error: 'invalid token', detail: err?.message });
      }
      const claims = decoded as { sub?: string; email?: string };
      if (!claims.sub) return res.status(401).json({ error: 'invalid token: no sub claim' });
      req.userId = claims.sub;
      req.userEmail = claims.email;
      next();
    }
  );
}
