const crypto = require("node:crypto");

const password = process.argv[2];
const salt = crypto.randomBytes(16);

const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512");

console.log({
  saltHex: salt.toString("base64"),
  hash: hash.toString("base64"),
});