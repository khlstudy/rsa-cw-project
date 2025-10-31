const fs = require("fs");
const { PLAINTXT, META } = require("./config");

function readPlainUsers() {
  if (!fs.existsSync(PLAINTXT)) return [];

  return fs
    .readFileSync(PLAINTXT, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      const [u, p, r] = l.split("|");

      return { username: u, password: p, rights: r };
    });
}

function writePlainUsers(arr) {
  const lines = arr.map((u) => `${u.username}|${u.password}|${u.rights}`);
  fs.writeFileSync(PLAINTXT, lines.join("\n"), "utf8");
}
function readMeta() {
  try {
    return JSON.parse(fs.readFileSync(META, "utf8"));
  } catch (e) {
    return {};
  }
}
function writeMeta(obj) {
  fs.writeFileSync(META, JSON.stringify(obj, null, 2), "utf8");
}

module.exports = { readPlainUsers, writePlainUsers, readMeta, writeMeta };
