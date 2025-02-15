const pgp = require('pg-promise')();
const { TransactionMode, isolationLevel } = pgp.txMode;

const fs = require("fs");

const pgConfig = {
  host: "localhost",
  database: "postgres",
  user: "user",
  password: "password",
  port: "5432",
  ssl: {
    ca: fs.readFileSync(
      "/Users/antmoute/Documents/dev/parking/parking-backend/config/security/ca.crt"
    ),
    cert: fs.readFileSync(
      "/Users/antmoute/Documents/dev/parking/parking-backend/config/security/parking_app_cert.pem"
    ),
    key: fs.readFileSync(
      "/Users/antmoute/Documents/dev/parking/parking-backend/config/security/parking_app_key.pem"
    ),
    passphrase: "password",
    rejectUnauthorized: true,
  },
};

const db = pgp(pgConfig);

const transactionMode = new TransactionMode({
  tiLevel: isolationLevel.serializable,
  readOnly: true,
  deferrable: true,
});

module.exports = {
  db,
  transactionMode,
};
