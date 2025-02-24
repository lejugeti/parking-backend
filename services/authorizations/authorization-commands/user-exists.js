const { PreparedStatement: PS } = require("pg-promise");
const UnauthorizedError = require("../../../public/errors/unauthorized.error");

class UserExists {
  db = undefined;
  userId = undefined;

  constructor(db, userId) {
    this.db = db;
    this.userId = userId;
  }

  async authorize() {
    const selectUserById = new PS({
        name: "user-by-id",
        text: `select id from users where id = $1;`,
        values: [this.userId],
    }); 

    const user = await this.db.oneOrNone(selectUserById);

    if(!user) {
      throw new UnauthorizedError("User does not exist");
    }
  }
}

module.exports = UserExists;