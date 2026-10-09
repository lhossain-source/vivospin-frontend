import { jwtVerify } from "jose";

export async function requireUser(req: any): Promise<string> {
  const header = req.headers?.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    throw Object.assign(new Error("Authentication required."), { statusCode: 401 });
  }

  const secretText = process.env.AUTH_JWT_SECRET;
  if (!secretText || new TextEncoder().encode(secretText).byteLength < 32) {
    throw Object.assign(new Error("Authentication is not configured."), { statusCode: 503 });
  }

  try {
    const { payload } = await jwtVerify(
      header.slice("Bearer ".length),
      new TextEncoder().encode(secretText),
      { algorithms: ["HS256"], issuer: process.env.AUTH_JWT_ISSUER },
    );
    if (typeof payload.sub !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.sub)) {
      throw new Error("Invalid subject");
    }
    return payload.sub;
  } catch {
    throw Object.assign(new Error("Invalid or expired access token."), { statusCode: 401 });
  }
}

export function requireSettlementService(req: any): void {
  const expected = process.env.SETTLEMENT_SERVICE_TOKEN;
  const header = req.headers?.authorization;
  if (!expected || expected.length < 32) {
    throw Object.assign(new Error("Settlement service is not configured."), { statusCode: 503 });
  }
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    throw Object.assign(new Error("Service authentication required."), { statusCode: 401 });
  }

  const actual = header.slice("Bearer ".length);
  // Constant-time comparison for same-length tokens.
  const { timingSafeEqual } = require("node:crypto") as typeof import("node:crypto");
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw Object.assign(new Error("Invalid service token."), { statusCode: 401 });
  }
}
