import { SignJWT } from "jose";
export async function issueAccessToken(userId:string) {
  const secret=process.env.AUTH_JWT_SECRET||process.env.JWT_SECRET;
  if(!secret||new TextEncoder().encode(secret).byteLength<32)throw Object.assign(new Error("JWT secret must be at least 32 bytes."),{statusCode:503});
  const jwt=new SignJWT({}).setProtectedHeader({alg:"HS256"}).setSubject(userId).setIssuedAt().setExpirationTime("8h");
  if(process.env.AUTH_JWT_ISSUER)jwt.setIssuer(process.env.AUTH_JWT_ISSUER);
  return jwt.sign(new TextEncoder().encode(secret));
}
