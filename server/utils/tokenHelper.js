import jwt from 'jsonwebtoken';

export function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'astraflare-jwt-secret-change-me',
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
}

export function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user._id,
      type: 'refresh',
    },
    process.env.JWT_REFRESH_SECRET || 'astraflare-refresh-secret-change-me',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || 'astraflare-jwt-secret-change-me');
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'astraflare-refresh-secret-change-me');
}

export function decodeToken(token) {
  return jwt.decode(token, { complete: true });
}