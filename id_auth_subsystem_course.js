#!/usr/bin/env node
const { initAdmin, registerUser, deleteUser } = require("./modules/admin");
const {
  identifyUser,
  simulateAccessControl,
  issueChallengeForUser,
  verifyChallengeResponse,
} = require("./modules/auth");
const {
  rsaEncryptFile_course,
  rsaDecryptFile_course,
  generateRSA_Rdec,
  saveKeysToFiles,
} = require("./modules/rsa_course");
const {
  INPUT_FILE_DEFAULT,
  CLOSE_FILE_DEFAULT,
  OUT_FILE_DEFAULT,
  TASK,
} = require("./modules/config");

function usage() {
  console.log("Usage: node id_auth_subsystem_course.js <command> [args]");
  console.log("Commands:");
  console.log("  init <adminName> <adminPassword>");
  console.log(
    "  register <adminName> <adminPassword> <username> <password> <rights>",
  );
  console.log("  deleteUser <adminName> <adminPassword> <username>");
  console.log("  identify <username> <password>");
  console.log("  issueChallenge <username>    -> prints X");
  console.log("  verifyChallenge <username> <X> <Y>   -> prints true/false");
  console.log(
    "  gen_rsa_course [R_dec_digits]  -> generate keys and print params (used by encryptFile below)",
  );
  console.log("  encryptFile_course [input.txt] [close.txt] [R_dec_digits]");
  console.log("  decryptFile_course [close.txt] [out.txt]");
  console.log("");
  console.log("Defaults: R_dec_digits default 16 (per task).");
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    usage();
    return;
  }
  const cmd = argv[0];

  try {
    switch (cmd) {
      case "init":
        initAdmin(argv[1], argv[2]);
        break;

      case "register":
        registerUser(argv[1], argv[2], argv[3], argv[4], argv[5]);
        break;

      case "deleteUser":
        deleteUser(argv[1], argv[2], argv[3]);
        break;

      case "identify":
        const r = identifyUser(argv[1], argv[2]);
        console.log("Identify result:", r);
        if (r.success) simulateAccessControl(argv[1], r.rights);
        break;

      case "issueChallenge":
        console.log("X =", issueChallengeForUser(argv[1]));
        break;

      case "verifyChallenge":
        console.log(
          "OK =",
          verifyChallengeResponse(argv[1], Number(argv[2]), argv[3]),
        );
        break;

      case "gen_rsa_course":
        const R = argv[1] ? Number(argv[1]) : TASK.R_dec_digits;
        const keys = generateRSA_Rdec(R);
        saveKeysToFiles(keys);
        console.log("Generated RSA keys; n bits:", keys.bits);
        console.log(
          "Keys saved to rsa_course_pub.json and rsa_course_priv.json",
        );
        break;

      case "encryptFile_course":
        rsaEncryptFile_course(
          argv[1] || INPUT_FILE_DEFAULT,
          argv[2] || CLOSE_FILE_DEFAULT,
          argv[3] ? Number(argv[3]) : TASK.R_dec_digits,
        );
        break;

      case "decryptFile_course":
        rsaDecryptFile_course(
          argv[1] || CLOSE_FILE_DEFAULT,
          argv[2] || OUT_FILE_DEFAULT,
        );
        break;

      default:
        usage();
        break;
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

main();
