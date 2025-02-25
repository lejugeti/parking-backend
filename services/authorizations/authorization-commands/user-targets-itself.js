const { PreparedStatement: PS } = require("pg-promise");
const UnauthorizedError = require("../../../public/errors/unauthorized.error");

class UserTargetsItself {
  authService = undefined;
  db = undefined;
  request = undefined;
  targetId = undefined;

  constructor(authService, db, request, targetId) {
    this.authService = authService;
    this.db = db;
    this.request = request;
    this.targetId = targetId;
  }

  async authorize() {
    const login = this.authService.getAuthFromRequest(this.request).login;

    const selectUserByLogin = new PS({
      name: "user-by-login",
      text: `select id from users where login = $1;`,
      values: [login],
    });

    const user = await this.db.oneOrNone(selectUserByLogin);

    if (user && user.id !== this.targetId) {
      throw new UnauthorizedError("User can not target another user for this operation");
    }
  }
}

module.exports = UserTargetsItself;