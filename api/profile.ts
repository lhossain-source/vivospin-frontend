import { db } from "../server/db";
import { requireUser } from "../server/auth";
export default async function handler(req:any,res:any) {
  res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"});}
  try {
    const id=await requireUser(req);
    const r=await db.query("SELECT id,phone,role,created_at FROM app_users WHERE id=$1",[id]);
    if(!r.rowCount)return res.status(404).json({error:"Profile not found."});
    return res.status(200).json({user:r.rows[0]});
  } catch(e) {
    const status=Number((e as any)?.statusCode)||500;if(status>=500)console.error("Profile API error",e);
    return res.status(status).json({error:status===500?"Unable to load profile.":(e as Error).message});
  }
}
