import { useEffect, useState, type FormEvent } from "react";
import OddsBoard from "./OddsBoard";
import "./app-shell.css";

type User = { id: string; phone: string; role: string; created_at?: string };
type Wallet = { currency: string; balanceMinor: string; updatedAt?: string };
type Entry = { id: string; entry_type: string; amount_minor: string; balance_after_minor: string; currency: string; created_at: string };
const TOKEN = "vivospin_access_token";
async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers); headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = sessionStorage.getItem(TOKEN); if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers }); const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`); return data as T;
}
const money = (v: string | number) => (Number(v) / 100).toFixed(2);

export default function App() {
  const [phone, setPhone] = useState(""); const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false); const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null); const [entries, setEntries] = useState<Entry[]>([]);
  const [tab, setTab] = useState<"profile" | "wallet">("profile");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");

  async function refresh() {
    const p = await api<{ user: User }>("/api/profile"); setUser(p.user);
    const w = await api<{ wallet: Wallet | null; entries: Entry[] }>("/api/wallet");
    setWallet(w.wallet); setEntries(w.entries || []);
  }
  useEffect(() => {
    let alive = true;
    if (sessionStorage.getItem(TOKEN)) void api<{user:User}>("/api/auth/me").then(async r => {
      if (alive) setUser(r.user); await refresh();
    }).catch(() => { sessionStorage.removeItem(TOKEN); if (alive) setUser(null); });
    const listener = () => { void refresh().catch(() => undefined); };
    window.addEventListener("vivospin-wallet-refresh", listener);
    return () => { alive = false; window.removeEventListener("vivospin-wallet-refresh", listener); };
  }, []);

  async function sendOtp(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { await api("/api/auth/send-otp", {method:"POST", body:JSON.stringify({phone:phone.trim()})});
      setOtpSent(true); setMessage("OTP request sent. Check your phone."); }
    catch (x) { setError(x instanceof Error ? x.message : "Could not send OTP."); }
    finally { setBusy(false); }
  }
  async function verifyOtp(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const r = await api<{accessToken:string;user:User}>("/api/auth/verify-otp",{method:"POST",body:JSON.stringify({phone:phone.trim(),code:code.trim()})});
      sessionStorage.setItem(TOKEN,r.accessToken); window.dispatchEvent(new Event("vivospin-auth-change"));
      setUser(r.user); await refresh(); setCode(""); setMessage("Signed in successfully.");
    } catch (x) { setError(x instanceof Error ? x.message : "OTP verification failed."); }
    finally { setBusy(false); }
  }
  function logout() {
    sessionStorage.removeItem(TOKEN); setUser(null); setWallet(null); setEntries([]);
    setOtpSent(false); setCode(""); setMessage("Signed out."); setError("");
    window.dispatchEvent(new Event("vivospin-auth-change"));
  }

  return <div className="app-shell">
    <header className="app-header"><a className="brand" href="/">VivoSpin</a>
      <nav className="app-nav" aria-label="Account">
        {user ? <><button className={tab==="profile"?"nav-active":""} onClick={()=>setTab("profile")}>Profile</button>
          <button className={tab==="wallet"?"nav-active":""} onClick={()=>setTab("wallet")}>Wallet</button>
          <span className="signed-in-phone">{user.phone}</span><button onClick={logout}>Log out</button></> :
          <a href="#account-login">Sign in</a>}
      </nav>
    </header>
    {!user && <section className="account-panel" id="account-login"><h2>Sign in / Create account</h2>
      <p>Use your phone number and SMS verification code.</p>
      {!otpSent ? <form className="account-form" onSubmit={sendOtp}>
        <label htmlFor="phone">Phone number with country code</label>
        <input id="phone" type="tel" autoComplete="tel" placeholder="+8801XXXXXXXXX" value={phone} onChange={e=>setPhone(e.target.value)} required />
        <button disabled={busy}>{busy?"Sending...":"Send SMS OTP"}</button>
      </form> : <form className="account-form" onSubmit={verifyOtp}>
        <label htmlFor="otp">SMS verification code</label><input id="otp" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)} required />
        <button disabled={busy}>{busy?"Verifying...":"Verify and sign in"}</button>
        <button type="button" className="secondary-button" onClick={()=>{setOtpSent(false);setCode("");}}>Change phone</button>
      </form>}
    </section>}
    {error && <p className="app-error" role="alert">{error}</p>}{message && <p className="app-message" role="status">{message}</p>}
    {user && <section className="account-panel">
      {tab==="profile" ? <><h2>My Profile</h2><dl className="profile-details">
        <div><dt>Phone</dt><dd>{user.phone}</dd></div><div><dt>Account ID</dt><dd>{user.id}</dd></div><div><dt>Account type</dt><dd>{user.role}</dd></div>
      </dl><button onClick={()=>setTab("wallet")}>View wallet</button></> :
      <><h2>My Wallet</h2><p className="wallet-total">{wallet?money(wallet.balanceMinor)+" "+wallet.currency:"Wallet not available"}</p>
        <p className="muted-text">Balance is loaded from the server.</p><h3>Recent activity</h3>
        {!entries.length?<p className="muted-text">No wallet transactions yet.</p>:<div className="ledger-list">{entries.map(x=><article className="ledger-row" key={x.id}>
          <div><strong>{x.entry_type.replaceAll("_"," ")}</strong><small>{new Date(x.created_at).toLocaleString()}</small></div>
          <div className="ledger-amount"><strong>{Number(x.amount_minor)>0?"+":""}{money(x.amount_minor)} {x.currency}</strong><small>Balance: {money(x.balance_after_minor)}</small></div>
        </article>)}</div>}
        <button className="secondary-button" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{await refresh();setMessage("Wallet refreshed.");}catch(x){setError(x instanceof Error?x.message:"Refresh failed.");}finally{setBusy(false);}}}>Refresh wallet</button>
      </>}
    </section>}
    <OddsBoard />
  </div>;
}
