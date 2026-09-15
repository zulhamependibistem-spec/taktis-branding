import { SignJWT, jwtVerify } from "jose";

export type SessionUser = {
  id: string;
  full_name: string;
  nip: string;
  role: "spg" | "tl" | "pic" | "admin";
  assigned_outlet_id: string | null;
};

let cachedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const secretRaw = process.env.SESSION_SECRET;
  if (!secretRaw) throw new Error("SESSION_SECRET belum di-set di environment.");
  cachedSecret = new TextEncoder().encode(secretRaw);
  return cachedSecret;
}

export async function createSessionToken(user: SessionUser) {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}
