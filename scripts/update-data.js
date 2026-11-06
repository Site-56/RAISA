const fs = require("fs");

const action = process.env.DATA_ACTION;
const payload = JSON.parse(process.env.DATA_PAYLOAD || "{}");
const b64 = /^[A-Za-z0-9+/=]+$/;
const hex8 = /^[0-9a-f]{8}$/;
const today = () => new Date().toISOString().slice(0, 10);

function load(file, field) {
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  data[field] = data[field] || [];
  return data;
}
function save(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n"); }
function level(n) { n = Number(n); if (!Number.isInteger(n) || n < 1 || n > 6) throw new Error("bad level"); return n; }
function blob(s, name) { if (typeof s !== "string" || !b64.test(s) || s.length > 200000) throw new Error("bad " + name); return s; }
function date(s) { s = String(s || ""); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("bad date"); return s; }
// new-format files keep their body in files/<id>.json and only a small encrypted summary in files.json
function writeBody(fid, e) { fs.mkdirSync("files", { recursive: true }); fs.writeFileSync("files/" + fid + ".json", JSON.stringify({ iv: blob(e.bodyIv, "bodyIv"), data: blob(e.bodyData, "bodyData") }) + "\n"); }
function id(s) { s = String(s || "").toLowerCase(); if (!hex8.test(s)) throw new Error("bad id"); return s; }

const e = payload.entry || {};
function addFileEntry(data, e) {
  let entry;
  if (e.bodyIv) {
    entry = { id: id(e.id), level: level(e.level), sumIv: blob(e.sumIv, "sumIv"), sumData: blob(e.sumData, "sumData"), body: 1, rev: 1, added: today() };
    if (data.files.some((f) => f.id === entry.id)) throw new Error("file id already exists");
    writeBody(entry.id, e);
  } else {
    entry = { id: id(e.id), level: level(e.level), iv: blob(e.iv, "iv"), data: blob(e.data, "data"), added: today() };
    if (data.files.some((f) => f.id === entry.id)) throw new Error("file id already exists");
  }
  data.files.push(entry);
}
function updateFileEntry(data, e) {
  const f = data.files.find((x) => x.id === id(e.id));
  if (!f) throw new Error("no such file");
  f.level = level(e.level);
  if (e.bodyIv) {
    writeBody(f.id, e);
    f.sumIv = blob(e.sumIv, "sumIv"); f.sumData = blob(e.sumData, "sumData");
    delete f.iv; delete f.data;
    f.body = 1; f.rev = (Number(f.rev) || 1) + 1; f.edited = today();
  } else {
    f.iv = blob(e.iv, "iv"); f.data = blob(e.data, "data");
  }
}
function keyEntry(e) {
  const entry = { id: id(e.id), level: level(e.level), salt: blob(e.salt, "salt"), iv: blob(e.iv, "iv"), data: blob(e.data, "data"), granted: today() };
  if (e.agent === true) entry.agent = true;
  if (e.expires) entry.expires = date(e.expires);
  if (e.ownerIv || e.ownerData) { entry.ownerIv = blob(e.ownerIv, "ownerIv"); entry.ownerData = blob(e.ownerData, "ownerData"); }
  return entry;
}
if (action === "grant-key") {
  const data = load("keys.json", "keys");
  const entry = keyEntry(e);
  if (data.keys.some((k) => k.id === entry.id)) throw new Error("key id already exists");
  data.keys.push(entry);
  save("keys.json", data);
} else if (action === "grant-keys") {
  // many at once, from the role sync
  const data = load("keys.json", "keys");
  for (const raw of (payload.entries || []).slice(0, 50)) { const entry = keyEntry(raw); if (!data.keys.some((k) => k.id === entry.id)) data.keys.push(entry); }
  save("keys.json", data);
} else if (action === "revoke-keys") {
  const data = load("keys.json", "keys");
  const ids = new Set((payload.ids || []).slice(0, 200).map(id));
  data.keys = data.keys.filter((k) => !ids.has(k.id));
  save("keys.json", data);
} else if (action === "revoke-key") {
  const data = load("keys.json", "keys");
  const before = data.keys.length;
  data.keys = data.keys.filter((k) => k.id !== id(payload.id));
  if (data.keys.length === before) throw new Error("no such key");
  save("keys.json", data);
} else if (action === "update-key") {
  // only the expiry date can change here. a new level needs a new key
  const data = load("keys.json", "keys");
  const key = data.keys.find((k) => k.id === id(payload.id));
  if (!key) throw new Error("no such key");
  if (payload.expires) key.expires = date(payload.expires); else delete key.expires;
  save("keys.json", data);
} else if (action === "add-file") {
  const data = load("files.json", "files");
  addFileEntry(data, e);
  save("files.json", data);
} else if (action === "files-batch") {
  // many personnel files at once, from the department role sync
  const data = load("files.json", "files");
  for (const x of (payload.add || []).slice(0, 50)) if (!data.files.some((f) => f.id === String(x.id).toLowerCase())) addFileEntry(data, x);
  for (const x of (payload.update || []).slice(0, 50)) updateFileEntry(data, x);
  save("files.json", data);
} else if (action === "delete-file") {
  const data = load("files.json", "files");
  const before = data.files.length;
  const fid = id(payload.id);
  data.files = data.files.filter((f) => f.id !== fid);
  if (data.files.length === before) throw new Error("no such file");
  if (fs.existsSync("files/" + fid + ".json")) fs.unlinkSync("files/" + fid + ".json");
  save("files.json", data);
} else if (action === "add-request") {
  const data = load("requests.json", "requests");
  const entry = { id: id(e.id), status: "pending", iv: blob(e.iv, "iv"), data: blob(e.data, "data"), created: today() };
  if (data.requests.some((r) => r.id === entry.id)) throw new Error("request id already exists");
  data.requests.push(entry);
  data.requests = data.requests.slice(-200);
  save("requests.json", data);
} else if (action === "update-request") {
  const data = load("requests.json", "requests");
  const req = data.requests.find((r) => r.id === id(payload.id));
  if (!req) throw new Error("no such request");
  if (!["approved", "denied"].includes(payload.status)) throw new Error("bad status");
  req.status = payload.status;
  req.reviewed = today();
  req.reviewer = String(payload.reviewer || "").slice(0, 100);
  save("requests.json", data);
} else if (action === "add-department") {
  const data = load("departments.json", "departments");
  // level is which clearance can see the department exists at all
  const entry = { id: id(e.id), level: e.level ? level(e.level) : 1, iv: blob(e.iv, "iv"), data: blob(e.data, "data"), added: today() };
  if (data.departments.some((d) => d.id === entry.id)) throw new Error("department id already exists");
  data.departments.push(entry);
  data.departments = data.departments.slice(-100);
  save("departments.json", data);
} else if (action === "update-department") {
  const data = load("departments.json", "departments");
  const d = data.departments.find((x) => x.id === id(e.id));
  if (!d) throw new Error("no such department");
  d.iv = blob(e.iv, "iv"); d.data = blob(e.data, "data");
  d.level = e.level ? level(e.level) : (d.level || 1);
  save("departments.json", data);
} else if (action === "update-file") {
  const data = load("files.json", "files");
  updateFileEntry(data, e);
  save("files.json", data);
} else if (action === "remove-department") {
  const data = load("departments.json", "departments");
  const before = data.departments.length;
  data.departments = data.departments.filter((d) => d.id !== id(payload.id));
  if (data.departments.length === before) throw new Error("no such department");
  save("departments.json", data);
} else {
  throw new Error("unknown action " + action);
}
console.log(action, "done");
