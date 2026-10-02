// Swapboard: a barter network for neighbouring businesses. Trades are recorded as credits, so nobody needs a perfect match.
import { useState } from "react";
import { uid, useStored } from "./lib/store";
import { useShared } from "./lib/useShared";
import { Section, ShareBox, Stat, Stats } from "./ui/kit";

const T = "swapboard";
type Member = { id: string; name: string; trade: string; phone: string; offers: string; wants: string; limit: number };
type Trade = { id: string; from: string; to: string; credits: number; what: string; date: string };
type Board = { network: string; members: Member[]; balances: Record<string, number>; updated: string };

const SM: Member[] = [
  { id: "m1", name: "Boulangerie Nour", trade: "Bakery", phone: "", offers: "Bread, pastries, catering trays", wants: "Flyers, van repairs", limit: 300 },
  { id: "m2", name: "Print Express", trade: "Printing", phone: "", offers: "Flyers, menus, signs", wants: "Lunch for staff, accounting help", limit: 300 },
  { id: "m3", name: "Garage Slim", trade: "Mechanic", phone: "", offers: "Van service, tyres", wants: "Website, printing", limit: 400 },
  { id: "m4", name: "Compta Plus", trade: "Accountant", phone: "", offers: "Bookkeeping, tax returns", wants: "Car service, coffee", limit: 300 },
];
const ST: Trade[] = [
  { id: "t1", from: "m2", to: "m1", credits: 120, what: "500 flyers", date: "2026-09-02" },
  { id: "t2", from: "m1", to: "m3", credits: 80, what: "Catering tray for garage open day", date: "2026-09-10" },
  { id: "t3", from: "m3", to: "m1", credits: 200, what: "Delivery van service", date: "2026-09-15" },
  { id: "t4", from: "m4", to: "m2", credits: 150, what: "Quarterly bookkeeping", date: "2026-09-20" },
];

export default function Swapboard() {
  const shared = useShared<Board>();
  const [network, setNetwork] = useStored(T, "network", "Lafayette Trade Circle");
  const [members, setMembers] = useStored<Member[]>(T, "members", SM);
  const [trades, setTrades] = useStored<Trade[]>(T, "trades", ST);
  const [d, setD] = useState({ from: "", to: "", credits: "", what: "" });
  const [err, setErr] = useState("");
  const [nm, setNm] = useState({ name: "", trade: "", offers: "", wants: "" });

  // Positive balance = has given more than received (can spend). Mutual credit always sums to zero.
  const bal = (id: string, ts: Trade[] = trades) => ts.reduce((a, t) => a + (t.from === id ? t.credits : 0) - (t.to === id ? t.credits : 0), 0);
  const name = (id: string) => (shared.data?.members ?? members).find(m => m.id === id)?.name ?? "Former member";
  const volume = trades.reduce((a, t) => a + t.credits, 0);

  if (shared.loading) return <p className="empty-note">Loading board…</p>;
  if (shared.data) {
    const b = shared.data;
    return (
      <div className="stack">
        <Section title={b.network} aside={<span className="note">Board as of {b.updated}</span>}>
          <div className="sw-grid">{b.members.map(m => (
            <div key={m.id} className="sw-card"><strong>{m.name}</strong> <span className="pill">{m.trade}</span>
              <p><span className="eyebrow">Offers</span> {m.offers}</p><p><span className="eyebrow">Wants</span> {m.wants}</p>
              <p className="note">Balance {b.balances[m.id] > 0 ? "+" : ""}{b.balances[m.id] ?? 0} credits</p></div>
          ))}</div>
        </Section>
        <style>{css}</style>
      </div>
    );
  }

  const record = (e: React.FormEvent) => {
    e.preventDefault();
    const c = Math.round(parseFloat(d.credits) || 0);
    if (!d.from || !d.to || d.from === d.to) return setErr("Choose two different members.");
    if (c <= 0) return setErr("Enter the credits for this trade.");
    const buyer = members.find(m => m.id === d.to)!;
    if (bal(d.to) - c < -buyer.limit) return setErr(`${buyer.name} would go past their limit of −${buyer.limit} credits. They need to sell something first.`);
    setTrades([{ id: uid(), from: d.from, to: d.to, credits: c, what: d.what, date: new Date().toISOString().slice(0, 10) }, ...trades]);
    setD({ from: "", to: "", credits: "", what: "" }); setErr("");
  };
  // Suggest matches: a member's wants against another's offers, by shared words.
  const words = (s: string) => new Set(s.toLowerCase().split(/[^a-zÀ-ɏ]+/).filter(w => w.length > 3));
  const matches = members.flatMap(a => members.filter(b => b.id !== a.id).map(b => ({ a, b, hit: [...words(a.wants)].filter(w => [...words(b.offers)].some(o => o.startsWith(w.slice(0, 5)))) }))).filter(x => x.hit.length);
  const board: Board = { network, members, balances: Object.fromEntries(members.map(m => [m.id, bal(m.id)])), updated: new Date().toISOString().slice(0, 10) };

  return (
    <div className="stack">
      <Section title={network}>
        <Stats><Stat value={members.length} label="Members" /><Stat value={trades.length} label="Trades" /><Stat value={volume} label="Credits traded" /><Stat value={matches.length} label="Possible matches" tone="good" /></Stats>
        <p className="note" style={{ marginTop: 10 }}>One credit is worth one dinar of goods or services. A member who gives earns credits, a member who receives spends them.</p>
      </Section>
      <div className="grid2">
        <Section title="Record a trade">
          <form className="stack" style={{ gap: 10 }} onSubmit={record}>
            <div className="row"><label className="field"><span>Gave (earns credits)</span><select id="sw-from" className="input" value={d.from} onChange={e => setD({ ...d, from: e.target.value })}><option value="">Choose</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
              <label className="field"><span>Received (spends credits)</span><select id="sw-to" className="input" value={d.to} onChange={e => setD({ ...d, to: e.target.value })}><option value="">Choose</option>{members.map(m => <option key={m.id} value={m.id}>{m.name} ({bal(m.id)})</option>)}</select></label></div>
            <div className="row" style={{ alignItems: "flex-end" }}><label className="field" style={{ flexGrow: 2 }}><span>What</span><input id="sw-what" className="input" value={d.what} onChange={e => setD({ ...d, what: e.target.value })} /></label>
              <label className="field"><span>Credits</span><input id="sw-cr" className="input num" value={d.credits} onChange={e => setD({ ...d, credits: e.target.value })} /></label><button className="btn primary" type="submit">Record</button></div>
            {err && <p className="pill bad">{err}</p>}
          </form>
        </Section>
        <Section title="Balances">
          <table className="t"><tbody>{[...members].sort((a, b) => bal(b.id) - bal(a.id)).map(m => { const v = bal(m.id); return (
            <tr key={m.id}><td>{m.name}</td><td className="r" style={{ color: v > 0 ? "var(--good)" : v < 0 ? "var(--bad)" : undefined }}>{v > 0 ? "+" : ""}{v}</td><td className="r note">limit −{m.limit}</td></tr>); })}</tbody></table>
        </Section>
      </div>
      {matches.length > 0 && <Section title="Suggested swaps">
        <div className="stack" style={{ gap: 6 }}>{matches.slice(0, 10).map((x, i) => <p key={i}><strong>{x.a.name}</strong> wants {x.hit.join(", ")}, and <strong>{x.b.name}</strong> offers it.</p>)}</div>
      </Section>}
      <Section title="Members">
        <div className="sw-grid">{members.map(m => (
          <div key={m.id} className="sw-card">
            <div className="row" style={{ gap: 6 }}><input className="input" aria-label="Name" value={m.name} onChange={e => setMembers(members.map(x => x.id === m.id ? { ...x, name: e.target.value } : x))} /><input className="input" style={{ width: 110 }} aria-label="Trade" value={m.trade} onChange={e => setMembers(members.map(x => x.id === m.id ? { ...x, trade: e.target.value } : x))} /></div>
            <label className="field"><span>Offers</span><input className="input" value={m.offers} onChange={e => setMembers(members.map(x => x.id === m.id ? { ...x, offers: e.target.value } : x))} /></label>
            <label className="field"><span>Wants</span><input className="input" value={m.wants} onChange={e => setMembers(members.map(x => x.id === m.id ? { ...x, wants: e.target.value } : x))} /></label>
            <div className="row" style={{ alignItems: "flex-end" }}><label className="field"><span>Credit limit</span><input className="input num" value={m.limit} onChange={e => setMembers(members.map(x => x.id === m.id ? { ...x, limit: Math.max(0, parseInt(e.target.value) || 0) } : x))} /></label><button className="btn ghost small danger" onClick={() => setMembers(members.filter(x => x.id !== m.id))} disabled={bal(m.id) !== 0} title="Settle the balance first">Remove</button></div>
          </div>
        ))}</div>
        <form className="row" style={{ marginTop: 14, alignItems: "flex-end" }} onSubmit={e => { e.preventDefault(); if (!nm.name.trim()) return; setMembers([...members, { id: uid(), ...nm, phone: "", limit: 300 }]); setNm({ name: "", trade: "", offers: "", wants: "" }); }}>
          <label className="field"><span>New member</span><input id="sw-nn" className="input" value={nm.name} onChange={e => setNm({ ...nm, name: e.target.value })} /></label>
          <label className="field"><span>Trade</span><input id="sw-nt" className="input" value={nm.trade} onChange={e => setNm({ ...nm, trade: e.target.value })} /></label>
          <label className="field"><span>Offers</span><input id="sw-no" className="input" value={nm.offers} onChange={e => setNm({ ...nm, offers: e.target.value })} /></label>
          <label className="field"><span>Wants</span><input id="sw-nw" className="input" value={nm.wants} onChange={e => setNm({ ...nm, wants: e.target.value })} /></label>
          <button className="btn small" type="submit">Add</button>
        </form>
      </Section>
      <Section title="Share the board with members">
        <div className="row" style={{ marginBottom: 10 }}><label className="field" style={{ maxWidth: 360 }}><span>Network name</span><input id="sw-net" className="input" value={network} onChange={e => setNetwork(e.target.value)} /></label></div>
        <ShareBox slug={T} data={board} label="Copy board link" message={`${network}: who offers what, and current balances`} />
      </Section>
      <Section title="Trade history">
        <div className="table-wrap"><table className="t"><tbody>{trades.map(t => <tr key={t.id}><td className="num">{t.date}</td><td>{name(t.from)} → {name(t.to)}</td><td>{t.what}</td><td className="r">{t.credits}</td><td><button className="btn ghost small danger" onClick={() => setTrades(trades.filter(x => x.id !== t.id))}>Undo</button></td></tr>)}</tbody></table></div>
      </Section>
      <style>{css}</style>
    </div>
  );
}
const css = `.sw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.sw-card{border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px}.sw-card .eyebrow{font-size:10px;margin-right:4px}`;
