const fs = require("fs");
const { US_BOOK } = require("./config");

function nowISO() {
  return new Date().toISOString();
}

function logAction(line) {
  const s = `[${nowISO()}] ${line}\n`;
  fs.appendFileSync(US_BOOK, s);
}

module.exports = { nowISO, logAction };
