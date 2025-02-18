const { PreparedStatement: PS } = require("pg-promise");
const { db } = require("../public/db/db");
const IllegalArgumentError = require("../public/errors/illegal-argument.error");

class UserService {
  getUserById(userId) {
    if (!userId) {
      throw new IllegalArgumentError("User id can not be null");
    }

    const findUser = new PS({
      name: "get-user-by-id",
      text: "select id, login, password_salt from users where id = $1",
      values: [userId],
    });

    return db.oneOrNone(findUser);
  }

  getUserByLogin(login) {
    if (!login) {
      throw new IllegalArgumentError("User login can not be null");
    }

    const findUser = new PS({
      name: "get-user-by-login",
      text: "select id, login, password_salt from users where login = $1",
      values: [login],
    });

    return db.oneOrNone(findUser);
  }
}

module.exports = new UserService();
