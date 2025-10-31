const {
  readPlainUsers,
  writePlainUsers,
  readMeta,
  writeMeta,
} = require("./users");
const { logAction, nowISO } = require("./log");
const { TASK } = require("./config");

function initAdmin(adminName, adminPassword) {
  const arr = [{ username: adminName, password: adminPassword, rights: "E" }];
  writePlainUsers(arr);

  const meta = {};
  meta[adminName] = { created: nowISO(), pwd_created: nowISO() };
  writeMeta(meta);

  logAction(`INIT admin ${adminName}`);
  console.log("Initialized admin and stores.");
}

function requireAdmin(adminName, adminPassword) {
  const users = readPlainUsers();
  const u = users.find(
    (x) => x.username === adminName && x.password === adminPassword,
  );
  if (!u) throw new Error("Admin authentication failed");
  if (!u.rights.includes("E")) throw new Error("Admin lacks E right");
}

function registerUser(adminName, adminPassword, username, password, rights) {
  requireAdmin(adminName, adminPassword);
  const users = readPlainUsers();
  if (users.length >= TASK.N) throw new Error(`Max users N=${TASK.N} reached`);
  if (users.find((x) => x.username === username))
    throw new Error("User exists");

  users.push({ username, password, rights });
  writePlainUsers(users);

  const meta = readMeta();
  meta[username] = { created: nowISO(), pwd_created: nowISO() };
  writeMeta(meta);

  logAction(`REGISTER ${username} by admin ${adminName}`);
  console.log("User registered (plain).");
}

function deleteUser(adminName, adminPassword, username) {
  requireAdmin(adminName, adminPassword);
  let users = readPlainUsers();
  users = users.filter((u) => u.username !== username);
  writePlainUsers(users);

  const meta = readMeta();
  delete meta[username];
  writeMeta(meta);

  logAction(`DELETE ${username} by admin ${adminName}`);
  console.log("User deleted if existed.");
}

module.exports = { initAdmin, requireAdmin, registerUser, deleteUser };
