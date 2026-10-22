import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { db } from "../server/db";
import { requireUser } from "../server/auth";

type GameType = "aviator" | "mines" | "sweet-bonanza";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MINOR = 9_223_372_036_854_775_807n;
const fail = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode });
const isGame = (v: unknown): v is GameType => v === "aviator" || v === "mines" || v === "sweet-bonanza";
function stakeMinor(v: unknown): bigint | null {
  const s = typeof v === "number" && Number.isFinite(v) ? String(v) : v;
  if (typeof s !== "string" || !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const n = BigInt(whole) * 100n + BigInt((frac + "00").slice(0,2));
  return n > 0n && n <= MAX_MINOR ? n : null;
}
function mulMinor(stake: bigint, multiplier: number): bigint {
  if (!Number.isFinite(multiplier) || multiplier < 0 || multiplier > 1_000_000) throw fail(422, "Invalid payout multiplier.");
  const scaled = BigInt(Math.floor(multiplier * 10000 + 0.5));
  const payout = (stake * scaled + 5000n) / 10000n;
  if (payout > MAX_MINOR) throw fail(422, "Payout exceeds database limits.");
  return payout;
}
function multiplierAt(startedAt: number, now: number): number {
  return Math.floor(Math.exp(Math.max(0, now - startedAt) / 10000) * 100) / 100;
}
function crashMultiplier(): number {
  // House edge 1%; cryptographically generated outcome. This is an original simple crash model, not a claim of audited provable fairness.
  const n = randomInt(0, 10_000);
  return n < 100 ? 1 : Math.min(1000, Math.max(1.01, Math.floor((9900 / (10000 - n)) * 100) / 100));
}
function chooseMines(count: number): number[] {
  const pool = Array.from({length:25},(_,i)=>i), chosen:number[]=[];
  for(let i=0;i<count;i++){const j=randomInt(i,pool.length);[pool[i],pool[j]]=[pool[j],pool[i]];chosen.push(pool[i]);}
  return chosen;
}
function minesMultiplier(mineCount:number, safeCount:number):number {
  let m=1;
  for(let i=0;i<safeCount;i++) m *= (25-i)/(25-mineCount-i);
  return Math.floor(m*0.97*10000)/10000;
}
const symbols = ["🍬","🍋","🍇","🍉","🍓","🍭","⭐"];
function slotSpin(stake:bigint) {
  let grid = Array.from({length:30},()=>symbols[randomInt(0,symbols.length)]);
  const cascadeGrids: string[][] = [];
  let totalPayout = 0n;
  // Original 6x5 cluster-pay cascade model: 8+ matching symbols anywhere pay; winning symbols tumble out and refill.
  for(let step=0;step<5;step++){
    const counts = new Map<string,number>();
    grid.forEach(s=>counts.set(s,(counts.get(s)??0)+1));
    const winners = new Set<string>();
    let stepMultiplier=0;
    for(const [symbol,count] of counts){
      if(count<8)continue;
      winners.add(symbol);
      stepMultiplier += count>=12?5:count>=10?2:1;
    }
    if(!winners.size)break;
    const stepPayout=mulMinor(stake,stepMultiplier);
    totalPayout+=stepPayout;
    if(totalPayout>MAX_MINOR)throw fail(422,"Spin payout exceeds database limits.");
    grid=grid.map(s=>winners.has(s)?symbols[randomInt(0,symbols.length)]:s);
    cascadeGrids.push([...grid]);
  }
  return {grid,cascadeGrids,multiplier:Number((Number(totalPayout)/Number(stake)).toFixed(4)),payout:totalPayout,cascades:cascadeGrids.length};
}
function publicRound(row:any, now=Date.now()) {
  const state = row.state ?? {};
  const base = { roundId:row.id, game:row.game_type, status:row.status, stakeMinor:String(row.stake_minor), currency:row.currency, payoutMinor:String(row.payout_minor), createdAt:row.created_at };
  if(row.game_type==="aviator"){
    const current = row.status==="active" ? Math.min(Number(state.crashAtMultiplier),multiplierAt(Number(state.startedAt),now)) : Number(state.finalMultiplier??state.crashAtMultiplier??1);
    return {...base, multiplier:Math.floor(current*100)/100, history:state.history??[], canCashout:row.status==="active" && now < Number(state.crashAt), ...(row.status!=="active"?{finalMultiplier:state.finalMultiplier??state.crashAtMultiplier}: {})};
  }
  if(row.game_type==="mines") return {...base, mineCount:Number(state.mineCount), selectedTiles:state.selectedTiles??[], safeCount:(state.selectedTiles??[]).length, multiplier:minesMultiplier(Number(state.mineCount), (state.selectedTiles??[]).length), revealedTiles:row.status==="lost"?(state.revealedTiles??[]):undefined, revealedMines:row.status==="lost"?(state.mines??[]):undefined};
  return {...base, grid:state.grid??[], cascadeGrids:state.cascadeGrids??[], multiplier:Number(state.multiplier??0), cascades:Number(state.cascades??0)};
}
async function getRound(client:any,userId:string,roundId:unknown) {
  if(typeof roundId!=="string"||!UUID.test(roundId)) throw fail(400,"roundId must be a valid UUID.");
  const r=await client.query("SELECT * FROM game_rounds WHERE id=$1 AND user_id=$2 FOR UPDATE",[roundId,userId]);
  if(!r.rowCount) throw fail(404,"Game round not found.");
  return r.rows[0];
}
async function settle(client:any,row:any,payout:bigint,status:"won"|"lost"|"cashed_out",state:any) {
  if(payout<0n||payout>MAX_MINOR) throw fail(422,"Invalid payout.");
  const wallet=await client.query("SELECT balance_minor::text AS balance_minor FROM wallet_accounts WHERE user_id=$1 FOR UPDATE",[row.user_id]);
  if(!wallet.rowCount) throw fail(404,"Wallet account not found.");
  const before=BigInt(wallet.rows[0].balance_minor),after=before+payout;
  if(after>MAX_MINOR) throw fail(422,"Wallet balance exceeds database limits.");
  if(payout>0n){
    await client.query("UPDATE wallet_accounts SET balance_minor=$2::bigint,updated_at=NOW() WHERE user_id=$1",[row.user_id,after.toString()]);
    await client.query(`INSERT INTO wallet_ledger(user_id,entry_type,amount_minor,balance_after_minor,currency,reference_type,reference_id,idempotency_key,metadata)
      VALUES($1,'settlement_credit',$2::bigint,$3::bigint,$4,'game_round',$5,$6,$7::jsonb)`,
      [row.user_id,payout.toString(),after.toString(),row.currency,row.id,"game-payout:"+row.id,JSON.stringify({game:row.game_type,status})]);
  }
  const updated=await client.query("UPDATE game_rounds SET status=$2,payout_minor=$3::bigint,state=$4::jsonb,updated_at=NOW(),settled_at=NOW() WHERE id=$1 RETURNING *",
    [row.id,status,payout.toString(),JSON.stringify(state)]);
  return updated.rows[0];
}
export default async function handler(req:any,res:any){
  res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");
  if(!["GET","POST"].includes(req.method)){res.setHeader("Allow","GET, POST");return res.status(405).json({error:"Method not allowed"});}
  let client:any;
  try{
    const userId=await requireUser(req);
    const body=typeof req.body==="string"?JSON.parse(req.body):req.body??{};
    const action=req.method==="GET"?"status":body.action;
    const game=req.method==="GET"?undefined:body.game;
    if(req.method==="POST"&&!isGame(game)) throw fail(400,"game must be aviator, mines, or sweet-bonanza.");
    client=await db.connect();await client.query("BEGIN");
    if(action==="start"){
      const amount=stakeMinor(body.stake);
      if(!amount) throw fail(400,"Stake must be between 0.01 and 99999999.99.");
      const key=req.headers?.["idempotency-key"];
      if(typeof key!=="string"||key.length<8||key.length>128) throw fail(400,"Provide an Idempotency-Key header (8–128 characters).");
      const prior=await client.query("SELECT * FROM game_rounds WHERE idempotency_key=$1 FOR UPDATE",[key]);
      if(prior.rowCount){if(prior.rows[0].user_id!==userId||prior.rows[0].game_type!==game||prior.rows[0].stake_minor!==amount.toString()) throw fail(409,"Idempotency key was used for another request.");await client.query("COMMIT");return res.status(200).json({round:publicRound(prior.rows[0]),idempotentReplay:true});}
      const active=await client.query("SELECT id FROM game_rounds WHERE user_id=$1 AND game_type=$2 AND status='active' LIMIT 1",[userId,game]);
      if(active.rowCount) throw fail(409,"Finish or cash out your active round first.");
      const wallet=await client.query("SELECT balance_minor::text AS balance_minor,currency FROM wallet_accounts WHERE user_id=$1 FOR UPDATE",[userId]);
      if(!wallet.rowCount) throw fail(404,"Wallet not found. Ask support to initialize your account.");
      const before=BigInt(wallet.rows[0].balance_minor);if(before<amount) throw fail(409,"Insufficient wallet balance.");
      const id=randomUUID(),now=Date.now();let state:any={};
      if(game==="aviator"){const crashAtMultiplier=crashMultiplier();state={startedAt:now,crashAt:now+Math.max(1,Math.log(crashAtMultiplier)*10000),crashAtMultiplier,history:[]};}
      if(game==="mines"){const count=Number(body.mineCount??3);if(!Number.isInteger(count)||count<1||count>24) throw fail(400,"mineCount must be between 1 and 24.");state={mineCount:count,mines:chooseMines(count),selectedTiles:[],revealedTiles:[]};}
      const created=await client.query("INSERT INTO game_rounds(id,user_id,game_type,stake_minor,currency,status,state,payout_minor,idempotency_key) VALUES($1,$2,$3,$4::bigint,$5,'active',$6::jsonb,0,$7) RETURNING *",
        [id,userId,game,amount.toString(),wallet.rows[0].currency,JSON.stringify(state),key]);
      await client.query("UPDATE wallet_accounts SET balance_minor=$2::bigint,updated_at=NOW() WHERE user_id=$1",[userId,(before-amount).toString()]);
      await client.query(`INSERT INTO wallet_ledger(user_id,entry_type,amount_minor,balance_after_minor,currency,reference_type,reference_id,idempotency_key,metadata)
        VALUES($1,'wager_debit',$2::bigint,$3::bigint,$4,'game_round',$5,$6,$7::jsonb)`,
        [userId,(-amount).toString(),(before-amount).toString(),wallet.rows[0].currency,id,"game-bet:"+id,JSON.stringify({game})]);
      await client.query("COMMIT");return res.status(201).json({round:publicRound(created.rows[0]),wallet:{balanceMinor:(before-amount).toString(),currency:wallet.rows[0].currency}});
    }
    if(action==="status"){
      const row=await getRound(client,userId,body.roundId);
      if(row.status==="active"&&row.game_type==="aviator"&&Date.now()>=Number(row.state.crashAt)){
        const state={...row.state,finalMultiplier:row.state.crashAtMultiplier};
        const updated=await settle(client,row,0n,"lost",state);await client.query("COMMIT");return res.status(200).json({round:publicRound(updated)});
      }
      await client.query("COMMIT");return res.status(200).json({round:publicRound(row)});
    }
    if(action==="reveal"){
      const row=await getRound(client,userId,body.roundId);
      if(row.game_type!=="mines") throw fail(400,"Reveal is only available in Mines.");
      if(row.status!=="active") throw fail(409,"Round is already finished.");
      const tile=Number(body.tile);if(!Number.isInteger(tile)||tile<0||tile>24) throw fail(400,"tile must be an integer from 0 to 24.");
      const state={...row.state,selectedTiles:[...row.state.selectedTiles],revealedTiles:[...row.state.revealedTiles]};
      if(state.selectedTiles.includes(tile)) throw fail(409,"Tile already selected.");
      state.revealedTiles.push(tile);
      if(state.mines.includes(tile)){
        const updated=await settle(client,row,0n,"lost",state);await client.query("COMMIT");return res.status(200).json({round:{...publicRound(updated),hitMine:true}});
      }
      state.selectedTiles.push(tile);
      const updated=await client.query("UPDATE game_rounds SET state=$2::jsonb,updated_at=NOW() WHERE id=$1 RETURNING *",[row.id,JSON.stringify(state)]);
      await client.query("COMMIT");return res.status(200).json({round:publicRound(updated.rows[0]),hitMine:false});
    }
    if(action==="cashout"){
      const row=await getRound(client,userId,body.roundId);
      if(row.status!=="active") throw fail(409,"Round is already finished.");
      let payout=0n,state={...row.state},status:"won"|"lost"|"cashed_out"="cashed_out";
      if(row.game_type==="aviator"){
        const now=Date.now(),crashAt=Number(state.crashAt),current=multiplierAt(Number(state.startedAt),now);
        if(now>=crashAt){state.finalMultiplier=state.crashAtMultiplier;status="lost";}else{state.finalMultiplier=Math.min(current,Number(state.crashAtMultiplier));payout=mulMinor(BigInt(row.stake_minor),state.finalMultiplier);}
      }else if(row.game_type==="mines"){
        if(!state.selectedTiles.length) throw fail(409,"Reveal at least one safe tile before cashing out.");
        payout=mulMinor(BigInt(row.stake_minor),minesMultiplier(Number(state.mineCount),state.selectedTiles.length));
        state.revealedTiles=Array.from({length:25},(_,i)=>i).filter(i=>state.mines.includes(i)||state.selectedTiles.includes(i));
      }else throw fail(400,"Sweet Bonanza settles automatically when you spin.");
      const updated=await settle(client,row,payout,status,state);
      const wallet=await client.query("SELECT balance_minor::text AS balance_minor,currency FROM wallet_accounts WHERE user_id=$1",[userId]);
      await client.query("COMMIT");return res.status(200).json({round:publicRound(updated),wallet:{balanceMinor:wallet.rows[0].balance_minor,currency:wallet.rows[0].currency}});
    }
    if(action==="spin"){
      const row=await getRound(client,userId,body.roundId);
      if(row.game_type!=="sweet-bonanza"||row.status!=="active") throw fail(409,"No active Sweet Bonanza spin found.");
      const result=slotSpin(BigInt(row.stake_minor));
      const state={...row.state,grid:result.grid,cascadeGrids:result.cascadeGrids,multiplier:result.multiplier,cascades:result.cascades};
      const updated=await settle(client,row,result.payout,result.payout>0n?"won":"lost",state);
      const wallet=await client.query("SELECT balance_minor::text AS balance_minor,currency FROM wallet_accounts WHERE user_id=$1",[userId]);
      await client.query("COMMIT");return res.status(200).json({round:publicRound(updated),wallet:{balanceMinor:wallet.rows[0].balance_minor,currency:wallet.rows[0].currency}});
    }
    throw fail(400,"Unknown game action.");
  }catch(error){if(client){try{await client.query("ROLLBACK");}catch{}}
    const status=Number((error as any)?.statusCode)||500;if(status>=500)console.error("native game API error",error);
    return res.status(status).json({error:status===500?"Native game service unavailable; verify database migration and server configuration.":(error as Error).message});
  }finally{client?.release();}
}
