const { PreparedStatement: PS } = require("pg-promise");
const UnauthorizedError = require("../../../public/errors/unauthorized.error");

class UserNotAlreadyAddedToCar {
  db = undefined;
  userId = undefined;
  carId = undefined;

  constructor(db, userId, carId) {
    this.db = db;
    this.userId = userId;
    this.carId = carId;
  }

  async authorize() {
    const alreadyAdded = new PS({
      name: "user-already-added-to-car",
      text: `select user_id from users_cars where user_id = $1 and car_id = $2;`,
      values: [this.userId, this.carId],
    });

    const user = await this.db.oneOrNone(alreadyAdded);

    if (user) {
      throw new UnauthorizedError("User already added to car");
    }
  }
}

module.exports = UserNotAlreadyAddedToCar;