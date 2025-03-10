const UnauthorizedError = require("../../../public/errors/unauthorized.error");

class UserTargetsItself {
  db = undefined;
  requesterId = undefined;
  targetId = undefined;

  constructor(db, requesterId, targetId) {
    this.db = db;
    this.requesterId = requesterId;
    this.targetId = targetId;
  }

  async authorize() {
    if (this.requesterId !== this.targetId) {
      throw new UnauthorizedError(
        "User can not target another user for this operation"
      );
    }
  }
}

module.exports = UserTargetsItself;