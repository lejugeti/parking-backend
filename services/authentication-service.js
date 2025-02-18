const IllegalArgumentError = require("../public/errors/illegal-argument.error");
const encryptionService = require("./encryption-service");
const userService = require("./user-service");
const { Buffer } = require("node:buffer");
const { db } = require("../public/db/db");
const { PreparedStatement: PS } = require("pg-promise");

class AuthenticationService {
  getAuthFromRequest(request) {
    if (!request) {
      throw new IllegalArgumentError("Request must be defined");
    }

    const authHeader = request.header("authorization");

    if (!authHeader) {
      return {};
    }

    const credentials = authHeader.replace("Basic ", "");
    const decodedCredentials = encryptionService.decodeBase64(credentials);
    const splited = decodedCredentials.split(":");

    return { login: splited[0], password: splited[1] };
  }

  async reqIsAllowed(request) {
    if (!request) {
      throw new IllegalArgumentError("Request must be defined");
    }

    const credentials = this.getAuthFromRequest(request);

    return this.isLoggedIn(credentials.login, credentials.password);
  }

  async isLoggedIn(login, password) {
    const user = await userService.getUserByLogin(login);

    if (!user) {
      return false;
    }

    const salt = Buffer.from(user.password_salt, "base64");
    let passwordHashed = encryptionService.hashPasswordWithSalt(password, salt);

    const userAuthIsCorrect = new PS({
      name: "verify-auth",
      text: "select count(*) from users where id = $1 and login = $2 and password_hash = $3 and password_salt = $4",
      values: [user.id, login, passwordHashed, user.password_salt],
    });

    const userNumberWithSameAuth = await db.one(userAuthIsCorrect);

    return parseInt(userNumberWithSameAuth.count) === 1;
  }
}

module.exports = new AuthenticationService();
