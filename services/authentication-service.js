const encryptionService = require("./encryption-service");
const userService = require("./user-service");
const { Buffer } = require("node:buffer");

class AuthenticationService {
  async reqIsAllowed(request) {
    const authHeader = request.header("authorization");
    const credentials = authHeader.replace("Basic ", "");
    const decodedCredentials = encryptionService.decodeBase64(credentials);
    const splited = decodedCredentials.split(":");
    const login = splited[0];
    const password = splited[1];

    return this.isLoggedIn(login, password);
  }

  async isLoggedIn(login, password) {
    const user = await userService.getUserByLogin(login);

    if (!user) {
      return false;
    }

    const salt = Buffer.from(user.password_salt, "base64");
    let passwordHashed = encryptionService.hashPasswordWithSalt(password, salt);

    return passwordHashed === user.password_hash;
  }
}

module.exports = new AuthenticationService();