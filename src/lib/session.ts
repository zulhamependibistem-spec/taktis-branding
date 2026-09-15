import { SignJWT, jwtVerify } from "jose";

export type SessionUser = {
  id: string;
  full_name: string;
  nip: string;
  role: "spg" | "tl" | "pic" | "admin";
  assigned_outlet_id: string | null;
};

const secretRaw = process.env.SESSION_SECRET;
if (!secretRaw) throw new Error("SESSION_SECRET belum di-set di environment.");
const secret = new TextEncoder().encode(secretRaw);

export async function createSessionToken(user: SessionUser) {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}
