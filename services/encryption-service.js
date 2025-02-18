const crypto = require("node:crypto");
const { Buffer } = require("node:buffer");
const IllegalArgumentError = require("../public/errors/illegal-argument.error");

class EncryptionService {
  encoder = new TextEncoder();

  createSalt() {
    return crypto.randomBytes(16);
  }

  hashPasswordWithSalt(password, salt) {
    if (typeof salt === "string") {
      salt = Buffer.from(salt, "base64");
    } else if (!Buffer.isBuffer(salt)) {
      throw new IllegalArgumentError("Salt invalid");
    }

    return crypto
      .pbkdf2Sync(password, salt, 100000, 64, "sha512")
      .toString("base64");
  }

  decodeBase64(encoded) {
    return Buffer.from(encoded, "base64").toString();
  }
}

module.exports = new EncryptionService();
