import XLSX from "xlsx";
import { writeFileSync } from "fs";
const raw = "D:/TAKTIS/raw_data/";
const T = (s) => String(s || "").trim();
const esc = (s) => String(s ?? "").replace(/'/g, "''");

const wbList = XLSX.readFile(raw + "LIST TOKO EXPAND GMM MT - TO MT & GT AMJ2026.xlsx");
const ws = wbList.Sheets["KODE OUTLET TOKO"];
const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:"" });
const master=[];
for(let i=1;i<rows.length;i++){const r=rows[i];if(!r)continue;const n=T(r[2]);if(!n)continue;master.push({grsm:T(r[0]),area:T(r[1]),name:n,code:T(r[4]),channel:T(r[5])});}

// ---- mapping W34 -> outlet / NEW ----
const OVER={
  "TRIO WONOSOBO":"CV TRIO JAYA(M2)",
  "TRIO JAYA WONOSOBO":"CV TRIO JAYA(M2)",
  "TOP SWALAYAN":"CV TOP",
  "EKA SURYA PLAZA":"__NEW__",
  "BASA BANJARAN":"BASA 30",
  "RITA MALL TEGAL":"RITA MALL RITA TEGAL",
  "LANGGAN MAJALAYA":"LANGGAN MM",
  "ISTANA TOSERBA":"ISTANA LAMONGAN",
  "KAIRO MAJALAYA":"KAIRO SEMBAKO",
  "ASIA TOSERBA CIHIDENG":"ASIA TOSERBA",
  "KAIRO":"LANGGAN MM",
  "SAMI LARIS CILACAP":"__NEW__",
  "PRATAMA PUTRA CIHUNI":"__NEW__",
  "TRIO PLAZA":"__NEW__",
  "YOVA GUNUNG MALANG":"YOVA SUPERMART GN MALANG",
  "GUNASALMA 3":"GUNASALMA 3 PANUMBANGAN",
  "GUNASALMA 1 KAWALI":"GUNASALMA1 KAWALI",
  "ADIJAYA TELUK":"ADI JAYA",
};
// area per outlet baru (diambil dari user SPG pertama)
const NEWAREA={};
// mapping nama outlet baru -> kode sintetis (konsisten per nama)
const NEWCODE={};
let newSeq=0;
// resolve: return {kind:'new', name, code} or {kind:'master', name, code}
function resolve(w34name){
  if(OVER[w34name]==="__NEW__") return newTarget(w34name);
  const target = OVER[w34name] || w34name;
  const hit = master.find(o=>o.name===target);
  if(hit) return {kind:"master", name:hit.name, code:hit.code};
  return newTarget(target);
}
function newTarget(name){
  if(NEWCODE[name]===undefined){ newSeq++; NEWCODE[name]="NEW"+String(newSeq).padStart(3,"0"); }
  return {kind:"new", name, code:NEWCODE[name]};
}

// ---- W34 plotting ----
const wbW = XLSX.readFile(raw + "Report WOW GMM JSM W34 (21-23 Agustus).xlsx");
const wsW = wbW.Sheets["DAILY REPORT"];
const wrows = XLSX.utils.sheet_to_json(wsW, { header:1, defval:"" });
const spgMap={}; // name -> {toko:Set, tl}
for(let i=1;i<wrows.length;i++){const r=wrows[i];if(!r)continue;
  const tl=T(r[4]), toko=T(r[8]), spg=T(r[9]);
  if(!spg||!toko)continue;
  if(!spgMap[spg])spgMap[spg]={toko:new Set(), tl};
  spgMap[spg].toko.add(toko);
  spgMap[spg].tl=tl||spgMap[spg].tl;
}

// ---- M4 users ----
const wbM = XLSX.readFile(raw + "DATABASE M4 WOW GMM MT JSM.xlsx");
const wsM = wbM.Sheets["AKTIF"];
const mrows = XLSX.utils.sheet_to_json(wsM, { header:1, defval:"" });
const users=[]; const nipUsed={};
for(let i=1;i<mrows.length;i++){const r=mrows[i];if(!r)continue;
  let nip=T(r[0]), nama=T(r[4]);
  if(!nip&&!nama)continue;
  if(!nip) continue;
  if(nipUsed[nip]){ if(nama==="ADE NOVILIANTI") nip="20503"; else continue; }
  nipUsed[nip]=true;
  users.push({nip, pic:T(r[1]), nama, regional:T(r[19]), area:T(r[20]), jabatan:T(r[21]), nama_toko:T(r[44])});
}
// 2 SPG/B tanpa NIP (belum release HR) -> nip null, tetap masuk DB
users.push(
  {nip:"", pic:"NENDEN/ZULHAM", nama:"SRI YULI ASTUTI", regional:"JAWA TENGAH", area:"BLORA", jabatan:"SPG/B", nama_toko:""},
  {nip:"", pic:"NENDEN/ZULHAM", nama:"MARTHA KRISTINA NOYA", regional:"JAWA TENGAH", area:"CEPU JATENG", jabatan:"SPG/B", nama_toko:""},
);
users.forEach(u=>{ if(u.nip==="") u.nip=null; });

// ---- build roles & supervisors ----
// TL names (from W34) -> their NIP (from M4 jabatan TL SENIOR)
const TL_NIP = {};
for(const u of users){ if(/TL SENIOR/i.test(u.jabatan)) TL_NIP[u.nama] = u.nip; }
// fix FAHMI has comma/suffix; normalize lookup by contains
function findTLNip(tlW34){
  if(!tlW34) return null;
  // normalize: strip comma+suffix, compare lowercase
  const q = tlW34.toLowerCase().replace(/[^a-z ]/g,"").trim();
  for(const [name,nip] of Object.entries(TL_NIP)){
    if(name.toLowerCase().replace(/[^a-z ]/g,"").includes(q) || q.includes(name.toLowerCase().replace(/[^a-z ]/g,""))) return nip;
  }
  return null;
}
function roleFor(u){
  if(/TL SENIOR/i.test(u.jabatan)) return "tl";
  return "spg";
}

// ---- build user_outlets & assigned outlet ----
const userOutlets=[]; // {nip, code} for W34 plotted stores
const assigned={};    // nip -> code (first/active store, take any; W34=active)
// Also include stores NOT in W34? Only W34 stores.
for(const u of users){
  const w=spgMap[u.nama]; if(!w) continue;
  const list=[...w.toko];
  list.forEach(t=>{
    const r=resolve(t);
    if(r.kind==="new"){
      NEWAREA[r.name] = NEWAREA[r.name] || u.area;
    }
    userOutlets.push({nip:u.nip, code:r.code, toko:t});
    if(assigned[u.nip]===undefined) assigned[u.nip]=r.code;
  });
}
// SPG di master yang tidak tampil relatif tak masalah; assigned tetap null.

// ---- collect new outlets (dedup by code) ----
const newOutlets = [];
const seenNew = new Set();
for(const x of userOutlets){
  if(seenNew.has(x.code)) continue;
  const r = resolve(x.toko);
  if(r.kind!=="new") continue;
  seenNew.add(x.code);
  newOutlets.push({code:r.code, name:r.name, area:NEWAREA[r.name]||""});
}

// =========================================================
// EMIT SQL
// =========================================================
let sql = "";
sql += "-- TAKTIS TSJ import data REAL\n-- Generated automatically. Review sebelum dijalankan.\n\n";
sql += "BEGIN;\n\n";

// 1. hapus dummy + reset (import idempoten: hapus semua dulu, insert ulang)
sql += "-- 1. Reset: hapus seluruh data lama (dummy dkk)\n";
sql += "DELETE FROM daily_stock_reports; DELETE FROM daily_sales_reports; DELETE FROM attendance;\n";
sql += "DELETE FROM outlet_product_prices;\n";
sql += "DELETE FROM user_outlets;\n";
sql += "DELETE FROM users;\n";
sql += "DELETE FROM outlets;\n\n";

// 2. outlets
sql += "-- 2. Insert outlets ("+(master.length+newOutlets.length)+")\n";
for(const o of master){
  sql += `INSERT INTO outlets (code_subdist, code_outlet, name, area, grsm, channel_group) VALUES (${null}, '${esc(o.code)}', '${esc(o.name)}', '${esc(o.area)}', ${o.grsm?("'"+esc(o.grsm)+"'"):null}, ${o.channel?("'"+esc(o.channel)+"'"):null}) ON CONFLICT (code_outlet) DO NOTHING;\n`;
}
for(const o of newOutlets){
  sql += `INSERT INTO outlets (code_outlet, name, area) VALUES ('${esc(o.code)}', '${esc(o.name)}', '${esc(o.area)}') ON CONFLICT (code_outlet) DO NOTHING;\n`;
}
sql += "\n";

// 3. users (all, incl PIC/Admin)
sql += "-- 3. Insert users ("+(users.length+3)+") -- tanpa supervisor dulu\n";
const picUsers = [
  {nip:"9001", full:"ZULHAM", role:"admin"},
  {nip:"9002", full:"SUCAHYONO", role:"pic"},
  {nip:"9003", full:"NENDEN", role:"pic"},
];
const allUsers = users.concat([]);
const roleMap={}; allUsers.forEach(u=>roleMap[u.nip]=roleFor(u));
for(const u of allUsers){
  const r = roleFor(u);
  const nipCol = u.nip?("'"+esc(u.nip)+"'"):"NULL";
  sql += `INSERT INTO users (full_name, nip, role, status, area, regional, jabatan, pic, tl_name, nama_toko) VALUES ('${esc(u.nama)}', ${nipCol}, '${r}', 'active', ${u.area?("'"+esc(u.area)+"'"):null}, ${u.regional?("'"+esc(u.regional)+"'"):null}, ${u.jabatan?("'"+esc(u.jabatan)+"'"):null}, ${u.pic?("'"+esc(u.pic)+"'"):null}, ${spgMap[u.nama]?.tl?("'"+esc(spgMap[u.nama].tl)+"'"):null}, ${u.nama_toko?("'"+esc(u.nama_toko)+"'"):null}) ON CONFLICT (nip) DO NOTHING;\n`;
}
for(const p of picUsers){
  sql += `INSERT INTO users (full_name, nip, role, status) VALUES ('${esc(p.full)}', '${esc(p.nip)}', '${p.role}', 'active') ON CONFLICT (nip) DO NOTHING;\n`;
}
sql += "\n";

// 3b. Set supervisor_id (SPG -> TL) AFTER semua user ada
sql += "-- 3b. Set supervisor_id (SPG -> TL)\n";
for(const u of allUsers){
  const sup = findTLNip(spgMap[u.nama]?.tl);
  if(!sup) continue;
  const r = roleFor(u);
  if(r!=="spg") continue;
  sql += `UPDATE users SET supervisor_id = (SELECT id FROM users WHERE nip='${esc(sup)}') WHERE nip='${esc(u.nip)}';\n`;
}
sql += "\n";

// 4. user_outlets
sql += "-- 4. Insert user_outlets (multi-toko)\n";
for(const x of userOutlets){
  sql += `INSERT INTO user_outlets (user_id, outlet_id, is_active) VALUES ((SELECT id FROM users WHERE nip='${esc(x.nip)}'), (SELECT id FROM outlets WHERE code_outlet='${esc(x.code)}'), true) ON CONFLICT (user_id, outlet_id) DO NOTHING;\n`;
}
sql += "\n";

// 5. assigned_outlet_id
sql += "-- 5. Set assigned_outlet_id (toko aktif W34)\n";
for(const [nip,code] of Object.entries(assigned)){
  sql += `UPDATE users SET assigned_outlet_id = (SELECT id FROM outlets WHERE code_outlet='${esc(code)}') WHERE nip='${esc(nip)}';\n`;
}
sql += "\nCOMMIT;\n";

writeFileSync("D:/TAKTIS/database/import_real.sql", sql);

console.log("=== Ringkasan ===");
console.log("Master outlets:", master.length, "| New outlets:", newOutlets.length, "=> total", master.length+newOutlets.length);
console.log("Users:", allUsers.length, "+ PIC/admin 3 =", allUsers.length+3);
console.log("user_outlets rows:", userOutlets.length);
console.log("SPG dengan assigned (user_outlets):", new Set(userOutlets.map(x=>x.nip)).size);
console.log("\n=== Outlet BARU ===");
newOutlets.forEach(o=>console.log("  "+o.code+" | "+o.name+" | area="+o.area));
console.log("\n=== User tanpa plot (NO W34, tapi TL = wajar) ===");
for(const u of allUsers){ if(!spgMap[u.nama]) console.log("  "+u.nip+" | "+u.nama+" | "+u.jabatan); }
console.log("\n=== Distribusi per TL (SPG->TL) ===");
const d={}; for(const u of allUsers){ const t=spgMap[u.nama]?.tl; if(t&&roleFor(u)==="spg"){d[t]=(d[t]||0)+1;} }
console.log(d);
