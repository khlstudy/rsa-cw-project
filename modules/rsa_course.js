const fs = require("fs");
const crypto = require("crypto");
const { logAction } = require("./log");
const {
  INPUT_FILE_DEFAULT,
  CLOSE_FILE_DEFAULT,
  OUT_FILE_DEFAULT,
  TASK,
} = require("./config");

function bitLengthBigInt(n) {
  let bits = 0;
  while (n > 0n) {
    bits++;
    n >>= 1n;
  }

  return bits;
}

function decimalDigitsToBits(digits) {
  return Math.max(2, Math.ceil(digits * 3.32192809489)); // log2(10) ≈ 3.3219
}

function randomBigInt(bits) {
  // return random BigInt of exactly bits bits (highest bit =1)
  const bytes = Math.ceil(bits / 8);
  let buf = crypto.randomBytes(bytes);
  // ensure highest bit set
  const highestBitIndex = (bits - 1) % 8;
  buf[0] |= 1 << highestBitIndex;
  let res = 0n;
  for (let b of buf) res = (res << 8n) + BigInt(b);

  return res;
}

function modPow(base, exponent, modulus) {
  base = ((base % modulus) + modulus) % modulus;
  let result = 1n;
  while (exponent > 0n) {
    if (exponent & 1n) result = (result * base) % modulus;
    base = (base * base) % modulus;
    exponent >>= 1n;
  }

  return result;
}

function isProbablyPrime(n, k = 8) {
  if (n < 2n) return false;
  const smallPrimes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n];
  for (let p of smallPrimes) if (n === p) return true;
  for (let p of smallPrimes) if (n % p === 0n) return false;
  // write n-1 as d*2^s
  let d = n - 1n;
  let s = 0n;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    s++;
  }
  const witnesses = [2n, 3n, 5n, 7n, 11n];
  for (let i = 0; i < k; i++) {
    let a;
    if (i < witnesses.length) a = witnesses[i];
    else a = BigInt(2) + (randomBigInt(32) % (n - 3n));
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let cont = false;
    for (let r = 1n; r < s; r++) {
      x = (x * x) % n;
      if (x === n - 1n) {
        cont = true;
        break;
      }
    }
    if (cont) continue;
    return false;
  }
  return true;
}

function genPrimeWithBits(bits) {
  while (true) {
    let p = randomBigInt(bits);
    // make odd
    p |= 1n;

    if (isProbablyPrime(p, 12)) return p;
  }
}

function egcd(a, b) {
  if (b === 0n) return { g: a, x: 1n, y: 0n };
  const { g, x: x1, y: y1 } = egcd(b, a % b);

  return { g, x: y1, y: x1 - (a / b) * y1 };
}

function modInv(a, m) {
  const { g, x } = egcd(a, m);
  if (g !== 1n) return null;
  let res = x % m;
  if (res < 0n) res += m;

  return res;
}

function generateRSA_Rdec(R_dec_digits) {
  const bits = decimalDigitsToBits(R_dec_digits);
  // split bits approx in half for p and q
  const pbits = Math.floor(bits / 2);
  const qbits = bits - pbits;
  const p = genPrimeWithBits(pbits);
  const q = genPrimeWithBits(qbits);
  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  let e = 65537n;

  if (phi % e === 0n) {
    // choose small odd e
    for (let cand = 3n; cand < 65537n; cand += 2n) {
      if (egcd(cand, phi).g === 1n) {
        e = cand;
        break;
      }
    }
  }
  const d = modInv(e, phi);

  if (!d) throw new Error("Failed to compute d");

  return { p, q, n, e, d, bits: bitLengthBigInt(n) };
}

///// Block encode/decode bytes <-> BigInt blocks (for RSA) /////
function bytesToBigIntBlocks(buffer, n) {
  // max bytes per block = floor((bitlen(n)-1)/8)
  const maxBytes = Math.max(1, Math.floor((bitLengthBigInt(n) - 1) / 8));
  const blocks = [];

  for (let i = 0; i < buffer.length; i += maxBytes) {
    let block = 0n;
    const sl = buffer.slice(i, i + maxBytes);
    for (let b of sl) {
      block = (block << 8n) + BigInt(b);
    }
    blocks.push(block);
  }

  return { blocks, maxBytes };
}
function bigIntBlocksToBytes(blocks, maxBytes) {
  const chunks = [];

  for (let block of blocks) {
    let bArr = [];
    let x = block;
    while (x > 0n) {
      bArr.push(Number(x & 0xffn));
      x >>= 8n;
    }
    bArr = bArr.reverse();
    // possible leading zeros aren't preserved; that's OK
    for (let v of bArr) chunks.push(v);
  }

  return Buffer.from(chunks);
}

///// RSA encrypt/decrypt file using our RSA keys (course mode) /////
function rsaEncryptFile_course(
  inputFile = INPUT_FILE_DEFAULT,
  outFile = CLOSE_FILE_DEFAULT,
  R_digits = TASK.R_dec_digits,
) {
  if (!fs.existsSync(inputFile)) throw new Error("input.txt missing");
  const keys = generateRSA_Rdec(R_digits);
  // save keys
  fs.writeFileSync(
    "rsa_course_pub.json",
    JSON.stringify({ n: keys.n.toString(), e: keys.e.toString() }, null, 2),
  );
  fs.writeFileSync(
    "rsa_course_priv.json",
    JSON.stringify({ n: keys.n.toString(), d: keys.d.toString() }, null, 2),
  );
  console.log(
    `Generated RSA (course) keys: modulus ~ ${R_digits} dec digits (bits=${keys.bits})`,
  );
  logAction(`RSA_course keys generated R=${R_digits} bits=${keys.bits}`);

  // read input bytes
  const data = fs.readFileSync(inputFile);
  const { blocks, maxBytes } = bytesToBigIntBlocks(data, keys.n);
  // ensure m < n
  for (let m of blocks)
    if (m >= keys.n)
      throw new Error("Block >= n; choose smaller block size or larger n");

  const cipherBlocks = blocks.map((m) => modPow(m, keys.e, keys.n));
  // write out JSON with hex blocks and metadata
  const out = {
    R_digits,
    bits: keys.bits,
    maxBytes,
    blocks: cipherBlocks.map((b) => b.toString(16)),
  };
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), "utf8");
  logAction(`RSA_course encrypted ${inputFile} -> ${outFile}`);
  console.log(`Encrypted to ${outFile} (RSA course mode).`);
}

function saveKeysToFiles(
  keys,
  pubFile = "rsa_course_pub.json",
  privFile = "rsa_course_priv.json",
) {
  fs.writeFileSync(
    pubFile,
    JSON.stringify({ n: keys.n.toString(), e: keys.e.toString() }, null, 2),
  );
  fs.writeFileSync(
    privFile,
    JSON.stringify({ n: keys.n.toString(), d: keys.d.toString() }, null, 2),
  );
}

function rsaDecryptFile_course(
  inFile = CLOSE_FILE_DEFAULT,
  outFile = OUT_FILE_DEFAULT,
) {
  if (!fs.existsSync(inFile)) throw new Error("close.txt missing");
  if (!fs.existsSync("rsa_course_priv.json"))
    throw new Error("rsa_course_priv.json missing (private key)");
  const priv = JSON.parse(fs.readFileSync("rsa_course_priv.json", "utf8"));
  const n = BigInt(priv.n);
  const d = BigInt(priv.d);
  const blob = JSON.parse(fs.readFileSync(inFile, "utf8"));
  const maxBytes = blob.maxBytes;
  const cipherHex = blob.blocks;
  const cipherBlocks = cipherHex.map((h) => BigInt("0x" + h));
  const plainBlocks = cipherBlocks.map((c) => modPow(c, d, n));
  const bytes = bigIntBlocksToBytes(plainBlocks, maxBytes);
  fs.writeFileSync(outFile, bytes);
  logAction(`RSA_course decrypted ${inFile} -> ${outFile}`);
  console.log(`Decrypted to ${outFile}.`);
}

module.exports = {
  generateRSA_Rdec,
  rsaEncryptFile_course,
  rsaDecryptFile_course,
  bytesToBigIntBlocks,
  bigIntBlocksToBytes,
  modPow,
  saveKeysToFiles,
};
