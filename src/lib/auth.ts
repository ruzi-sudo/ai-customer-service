import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const ALG = 'HS256';
const COOKIE_NAME = 'admin_token';

function getSecret() {
  const secret = process.env.JWT_SECRET || 'change-me-in-production';
  return new TextEncoder().encode(secret);
}

export async function createToken(payload: { userId: string; username: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { userId: string; username: string };
  } catch {
    return null;
  }
}

export async function getTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function getAuthUser() {
  const token = await getTokenFromCookies();
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };
