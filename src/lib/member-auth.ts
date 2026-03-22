import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface MemberPayload {
  id: string;
  username: string;
  level: string;
  store_id?: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify a member JWT token and return the payload, or null if invalid.
 */
export function verifyMemberToken(token: string): MemberPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as MemberPayload;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract member info from a member_token cookie value.
 * Returns { id, username, store_id } or null.
 */
export function getMemberFromToken(token: string): { id: string; username: string; store_id?: string } | null {
  const payload = verifyMemberToken(token);
  if (!payload) return null;
  return {
    id: payload.id,
    username: payload.username,
    store_id: payload.store_id,
  };
}
