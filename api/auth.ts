import { db } from "../server/db";
import { requireUser } from "../server/auth";
import { issueAccessToken } from "../server/tokens";

const errorWithStatus = (statusCode:number,message:string) => Object.assign(new Error(message),{statusCode});
function config() {
  const sid=process.env.TWILIO_ACCOUNT_SID, token=process.env.TWILIO_AUTH_TOKEN, service=process.env.TWILIO_VERIFY_SERVICE_SID;
  if(!sid||!token||!service) throw errorWithStatus(503,"SMS OTP is not configured. Add Twilio Verify credentials to Railway.");
  return {sid,token,service};
}
async function twilio(action:"Verifications"|"VerificationCheck", fields:Record<string,string>) {
  const c=config(); const response=await fetch(`https://verify.twilio.com/v2/Services/${c.service}/${action}`,{
    method:"POST",headers:{Authorization:"Basic "+Buffer.from(c.sid+":"+c.token).toString("base64"),"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},
    body:new URLSearchParams(fields),signal:AbortSignal.timeout(10000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){console.error("Twilio Verify error",{status:response.status,code:data.code});throw errorWithStatus(response.status===429?429:502,response.status===429?"Too many OTP requests. Try later.":"SMS provider request failed.");}
  return data;
}
export default async function handler(req:any,res:any) {
  res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");
  try {
    const action=String(req.params?.action||""); const body=typeof req.body==="string"?JSON.parse(req.body):req.body||{};
    if(req.method==="GET"&&action==="me"){
      const id=await requireUser(req);const r=await db.query("SELECT id,phone,role,created_at FROM app_users WHERE id=$1",[id]);
      if(!r.rowCount)return res.status(404).json({error:"Account not found."});
      return res.status(200).json({user:r.rows[0]});
    }
    if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return res.status(405).json({error:"Method not allowed"});}
    if(action==="send-otp"){
      const phone=String(body.phone||"").trim();if(!/^\+[1-9]\d{7,14}$/.test(phone))return res.status(400).json({error:"Enter a valid phone number with country code."});
      const result=await twilio("Verifications",{To:phone,Channel:"sms"});
      return res.status(200).json({ok:true,status:result.status});
    }
    if(action==="verify-otp"){
      const phone=String(body.phone||"").trim(),code=String(body.code||"").trim();
      if(!/^\+[1-9]\d{7,14}$/.test(phone)||!/^\d{4,10}$/.test(code))return res.status(400).json({error:"Enter a valid phone number and OTP."});
      const verified=await twilio("VerificationCheck",{To:phone,Code:code});
      if(verified.status!=="approved")return res.status(401).json({error:"OTP is incorrect or expired."});
      const r=await db.query(`INSERT INTO app_users(phone) VALUES($1) ON CONFLICT(phone) DO UPDATE SET updated_at=NOW() RETURNING id,phone,role,created_at`,[phone]);
      const user=r.rows[0];
      await db.query(`INSERT INTO wallet_accounts(user_id,currency,balance_minor) VALUES($1,'VSC',0) ON CONFLICT(user_id) DO NOTHING`,[user.id]);
      return res.status(200).json({accessToken:await issueAccessToken(user.id),user});
    }
    return res.status(404).json({error:"Unknown auth action."});
  } catch(e) {
    const status=Number((e as any)?.statusCode)||500;if(status>=500)console.error("Auth API error",e);
    return res.status(status).json({error:status===500?"Authentication service unavailable.":(e as Error).message});
  }
}
