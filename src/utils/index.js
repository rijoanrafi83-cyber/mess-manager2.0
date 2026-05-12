// src/utils/index.js

export const TODAY = new Date().toISOString().split("T")[0];
export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const MEAL_TYPES = ["breakfast","lunch","dinner"];
export const COLORS = ["#6366f1","#22d3ee","#f59e0b","#10b981","#f43f5e","#a78bfa","#34d399","#fb923c"];

export const fmtCurrency = (n) => "৳" + (Number(n) || 0).toFixed(2);
export const fmtDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
export const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
export const daysInMonth = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

// ─── Billing computation ──────────────────────────────────────────────────────
export function calcMonth(ym, members, meals, bazaar, deposits, extraCharges = [], guestMeals = []) {
  const activeMembers = members.filter((m) => m.status !== "inactive");
  const monthBazaar = bazaar.filter((b) => (b.date || "").startsWith(ym));
  const monthGuests = guestMeals.filter((g) => (g.date || "").startsWith(ym));

  const totalBazaarRaw = monthBazaar.reduce((s, b) => s + Number(b.amount || 0), 0);

  let totalMeals = 0;
  const memberMeals = {};
  activeMembers.forEach((m) => { memberMeals[m.id] = 0; });

  Object.entries(meals).forEach(([key, entry]) => {
    const datePart = key.split("_")[0];
    if (!datePart.startsWith(ym)) return;
    const mid = entry.memberId;
    if (!memberMeals.hasOwnProperty(mid)) return;
    const cnt = (entry.breakfast ? 1 : 0) + (entry.lunch ? 1 : 0) + (entry.dinner ? 1 : 0);
    memberMeals[mid] = (memberMeals[mid] || 0) + cnt;
    totalMeals += cnt;
  });

  const totalGuestMeals = monthGuests.reduce((s, g) => s + Number(g.mealCount || 0), 0);
  const grandTotalMeals = totalMeals + totalGuestMeals;
  const mealRate = grandTotalMeals > 0 ? totalBazaarRaw / grandTotalMeals : 0;

  const memberSummary = activeMembers.map((m) => {
    const mealCount = memberMeals[m.id] || 0;
    const mealCost = mealCount * mealRate;
    const extras = extraCharges
      .filter((e) => e.memberId === m.id && (e.date || "").startsWith(ym))
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalCost = mealCost + extras;
    const deposited = deposits
      .filter((d) => d.memberId === m.id && (d.date || "").startsWith(ym))
      .reduce((s, d) => s + Number(d.amount || 0), 0);
    const balance = deposited - totalCost;
    return { ...m, meals: mealCount, mealCost, extras, cost: totalCost, deposited, balance };
  });

  return { totalBazaar: totalBazaarRaw, totalMeals, mealRate, memberSummary, monthBazaar, totalGuestMeals };
}

// ─── PDF generation ───────────────────────────────────────────────────────────
export function generateBillHTML(member, ym, mealRate, bazaarEntries, depositEntries, extraEntries, guestEntries, totalBazaar, totalMeals) {
  const [y, m] = ym.split("-").map(Number);
  const monthName = `${MONTHS[m - 1]} ${y}`;
  const extras = extraEntries.filter((e) => e.memberId === member.id);
  const extrasTotal = extras.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalCost = member.mealCost + extrasTotal;
  const balance = member.deposited - totalCost;

  const depositRows = depositEntries
    .filter((d) => d.memberId === member.id && (d.date || "").startsWith(ym))
    .map((d) => `<tr><td>${fmtDate(d.date)}</td><td>Deposit</td><td style="color:#16a34a">+${fmtCurrency(d.amount)}</td></tr>`)
    .join("");

  const extraRows = extras
    .map((e) => `<tr><td>${fmtDate(e.date)}</td><td>${e.note || "Extra charge"}</td><td style="color:#dc2626">-${fmtCurrency(e.amount)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Bill — ${member.name} — ${monthName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;color:#1f2937;background:#f9fafb;padding:32px}
    .card{background:#fff;border-radius:16px;padding:32px;max-width:680px;margin:0 auto;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .header{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid #e5e7eb}
    .logo{font-size:40px}
    .header h1{font-size:24px;font-weight:700}
    .header p{color:#6b7280;font-size:13px;margin-top:2px}
    .section{margin-top:24px}
    .section h2{font-size:14px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .meta-item{background:#f3f4f6;border-radius:10px;padding:12px 16px}
    .meta-item .label{font-size:11px;color:#9ca3af;margin-bottom:2px}
    .meta-item .value{font-size:18px;font-weight:700;color:#1f2937}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:#f3f4f6;font-size:12px;font-weight:600;color:#6b7280;padding:10px 12px;text-align:left;text-transform:uppercase}
    td{padding:10px 12px;font-size:13px;border-bottom:1px solid #f3f4f6}
    .total-row{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-radius:12px;margin-top:6px}
    .balance-ok{background:#ecfdf5;color:#16a34a}
    .balance-due{background:#fef2f2;color:#dc2626}
    .footer{margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
    @media print{body{padding:0;background:#fff}.card{box-shadow:none}}
  </style></head><body>
  <div class="card">
    <div class="header">
      <span class="logo">🍛</span>
      <div><h1>MessManager</h1><p>Monthly Bill — ${monthName}</p></div>
    </div>
    <div style="display:flex;align-items:center;gap:14px;padding:16px;background:#f3f4f6;border-radius:12px">
      <div style="width:48px;height:48px;border-radius:50%;background:#6366f1;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">${member.name[0].toUpperCase()}</div>
      <div>
        <p style="font-size:18px;font-weight:700">${member.name}</p>
        <p style="color:#6b7280;font-size:13px">${member.email || ""} ${member.room ? "| Room " + member.room : ""}</p>
      </div>
    </div>
    <div class="section">
      <h2>Summary</h2>
      <div class="meta-grid">
        <div class="meta-item"><div class="label">Total Meals</div><div class="value">${member.meals}</div></div>
        <div class="meta-item"><div class="label">Meal Rate</div><div class="value">${fmtCurrency(mealRate)}</div></div>
        <div class="meta-item"><div class="label">Meal Cost</div><div class="value">${fmtCurrency(member.mealCost)}</div></div>
        <div class="meta-item"><div class="label">Extra Charges</div><div class="value" style="color:#dc2626">${fmtCurrency(extrasTotal)}</div></div>
        <div class="meta-item"><div class="label">Total Cost</div><div class="value">${fmtCurrency(totalCost)}</div></div>
        <div class="meta-item"><div class="label">Total Deposited</div><div class="value" style="color:#16a34a">${fmtCurrency(member.deposited)}</div></div>
      </div>
    </div>
    ${depositRows ? `<div class="section"><h2>Deposits</h2><table><tr><th>Date</th><th>Description</th><th>Amount</th></tr>${depositRows}</table></div>` : ""}
    ${extraRows ? `<div class="section"><h2>Extra Charges</h2><table><tr><th>Date</th><th>Description</th><th>Amount</th></tr>${extraRows}</table></div>` : ""}
    <div class="total-row ${balance >= 0 ? "balance-ok" : "balance-due"}" style="margin-top:20px">
      <span style="font-weight:600;font-size:15px">${balance >= 0 ? "Advance Balance" : "Amount Due"}</span>
      <span style="font-size:20px;font-weight:700">${balance >= 0 ? "+" : "-"}${fmtCurrency(Math.abs(balance))}</span>
    </div>
    <div style="margin-top:16px;padding:12px 16px;background:#eff6ff;border-radius:10px;font-size:12px;color:#3b82f6">
      📊 Mess Stats: Total bazaar ৳${totalBazaar.toFixed(2)} | ${totalMeals} total meals | Rate ৳${mealRate.toFixed(2)}/meal
    </div>
    <div class="footer">Generated by MessManager • ${new Date().toLocaleString()}</div>
  </div></body></html>`;
}

export function printBill(html) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 600);
}