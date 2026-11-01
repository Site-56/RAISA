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
function level(n) { n = Number(n); if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error("bad level"); return n; }
function blob(s, name) { if (typeof s !== "string" || !b64.test(s) || s.length > 200000) throw new Error("bad " + name); return s; }
function id(s) { s = String(s || "").toLowerCase(); if (!hex8.test(s)) throw new Error("bad id"); return s; }

const e = payload.entry || {};
if (action === "grant-key") {
  const data = load("keys.json", "keys");
  const entry = { id: id(e.id), level: level(e.level), salt: blob(e.salt, "salt"), iv: blob(e.iv, "iv"), data: blob(e.data, "data"), granted: today() };
  if (e.agent === true) entry.agent = true;
  if (e.ownerIv || e.ownerData) { entry.ownerIv = blob(e.ownerIv, "ownerIv"); entry.ownerData = blob(e.ownerData, "ownerData"); }
  if (data.keys.some((k) => k.id === entry.id)) throw new Error("key id already exists");
  data.keys.push(entry);
  save("keys.json", data);
} else if (action === "revoke-key") {
  const data = load("keys.json", "keys");
  const before = data.keys.length;
  data.keys = data.keys.filter((k) => k.id !== id(payload.id));
  if (data.keys.length === before) throw new Error("no such key");
  save("keys.json", data);
} else if (action === "add-file") {
  const data = load("files.json", "files");
  const entry = { id: id(e.id), level: level(e.level), iv: blob(e.iv, "iv"), data: blob(e.data, "data"), added: today() };
  if (data.files.some((f) => f.id === entry.id)) throw new Error("file id already exists");
  data.files.push(entry);
  save("files.json", data);
} else if (action === "delete-file") {
  const data = load("files.json", "files");
  const before = data.files.length;
  data.files = data.files.filter((f) => f.id !== id(payload.id));
  if (data.files.length === before) throw new Error("no such file");
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
} else {
  throw new Error("unknown action " + action);
}
console.log(action, "done");
