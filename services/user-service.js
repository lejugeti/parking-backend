const { PreparedStatement: PS } = require("pg-promise");
const { db } = require("../public/db/db");

class UserService {
  getUserById(userId) {
    if (!userId) {
      throw new Error("User id can not be null");
    }

    const findUser = new PS({
      name: "get-user-by-id",
      text: "select * from users where id = $1",
      values: [userId],
    });

    return db.oneOrNone(findUser);
  }
}

module.exports = new UserService();