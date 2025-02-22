const uuidService = require("../services/uuid-service");
const { PreparedStatement: PS } = require("pg-promise");
const { db } = require("../public/db/db");
const IllegalArgumentError = require("../public/errors/illegal-argument.error");
const NotFoundError = require("../public/errors/not-found.error");

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

  async modifyUsername(userId, username) {
    if (!uuidService.isUUID(userId)) {
      throw new IllegalArgumentError("User id is invalid");
    } else if (!username || username.length === 0) {
      throw new IllegalArgumentError("Username can not be null or blank");
    }

    const user = await this.getUserById(userId);

    if (!user) {
      throw new NotFoundError("User does not exist");
    }

    const updateUserName = new PS({
      name: "update-user-name",
      text: `update users set username = $1 where id = $2;`,
      values: [username, userId],
    });

    await db.none(updateUserName);
  }
}

module.exports = new UserService();
