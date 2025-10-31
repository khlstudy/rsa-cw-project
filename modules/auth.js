const fs = require("fs");
const { readPlainUsers } = require("./users");
const { logAction } = require("./log");
const { TASK, ASK_FILE } = require("./config");

function identifyUser(username, password) {
  const users = readPlainUsers();
  const u = users.find(
    (x) => x.username === username && x.password === password,
  );

  if (!u) {
    logAction(`IDENTIFY FAIL ${username}`);

    return { success: false };
  }

  logAction(`IDENTIFY success ${username}`);
  return { success: true, rights: u.rights };
}

function getUserLevel(rights) {
  return rights.includes("E") || rights.includes("2") ? 2 : 1;
}

async function simulateAccessControl(username, rights) {
  const level = getUserLevel(rights);
  console.log(`\n[Access simulation for ${username}]`);
  console.log(`Access level: ${level} of ${TASK.S_levels}`);
  logAction(`ACCESS_START ${username} level=${level}`);

  const allCatalogs = ["System", "Docs", "AdminPanel", "Logs", "Media"];
  const allowedCatalogs =
    level === 2
      ? allCatalogs
      : allCatalogs.filter((c) => c !== "AdminPanel" && c !== "Logs");

  console.log("Visible catalogs:");
  for (const c of allowedCatalogs) console.log("  ✅ " + c);
  for (const c of allCatalogs)
    if (!allowedCatalogs.includes(c)) console.log("  🚫 " + c);

  console.log(`\nPeriodic authentication will occur every ${TASK.T} cycles.`);

  let counter = 0;
  let running = true;

  const nextCycle = async () => {
    if (!running) return;
    counter++;

    if (counter % TASK.T === 0) {
      console.log(
        `\n⏱️ [Cycle ${counter}] Performing periodic check (T=${TASK.T})`,
      );
      const ok = await stepAuthentication(username);

      if (!ok) {
        console.log(`User ${username} failed periodic check.`);
        logAction(`AUTH_CHECK_FAILED ${username} at cycle ${counter}`);
      } else {
        console.log(`User ${username} passed periodic check.`);
      }
    } else {
      console.log(`Cycle ${counter}: User ${username} active.`);
    }

    process.stdin.once("data", (data) => {
      if (data.toString().trim().toLowerCase() === "q") {
        console.log("Session closed by user input.");
        running = false;
        process.exit(0);
      }
    });

    setTimeout(nextCycle, 1000);
  };

  setTimeout(nextCycle, 1000);
}

function issueChallengeForUser(username) {
  const users = readPlainUsers();

  if (!users.find((u) => u.username === username))
    throw new Error("User not found");
  const X = Math.floor(Math.random() * 5) + 1; // 1..5
  logAction(`Challenge issued to ${username} X=${X}`);

  return X;
}

function computeFofX(x) {
  return Math.floor(Math.exp(TASK.a * x));
}

function verifyChallengeResponse(username, X, responseY) {
  const expected = computeFofX(X);
  const ok = Number(responseY) === expected;
  logAction(`Challenge verify ${username} X=${X} resp=${responseY} ok=${ok}`);

  return ok;
}

async function stepAuthentication(username) {
  if (!fs.existsSync(ASK_FILE)) throw new Error("ask.txt missing");

  const lines = fs
    .readFileSync(ASK_FILE, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  const [question, expectedRaw] =
    lines[Math.floor(Math.random() * lines.length)].split("|");
  const expected = (expectedRaw || "").trim();

  console.log(`\nQuestion for ${username}: ${question}`);
  process.stdout.write("Your answer: ");

  const answer = await new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      process.stdin.pause();
      resolve(data.toString().trim());
    });
  });

  if (answer.toLowerCase() === expected.toLowerCase()) {
    console.log("✅ Correct. Access remains active.");
    logAction(`STEP OK ${username} Q="${question}"`);

    return true;
  } else {
    console.log("❌ Incorrect. Access revoked — re-login required.");
    logAction(`STEP FAIL ${username} Q="${question}" A="${answer}"`);

    return false;
  }
}

module.exports = {
  identifyUser,
  getUserLevel,
  simulateAccessControl,
  issueChallengeForUser,
  computeFofX,
  verifyChallengeResponse,
  stepAuthentication,
};
