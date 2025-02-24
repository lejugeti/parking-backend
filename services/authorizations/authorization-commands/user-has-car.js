const { PreparedStatement: PS } = require("pg-promise");
const UnauthorizedError = require("../../../public/errors/unauthorized.error");

class UserHasCar {
  db = undefined;
  userId = undefined;
  carId = undefined;

  constructor(db, userId, carId) {
    this.db = db;
    this.userId = userId;
    this.carId = carId;
  }

  async authorize() {
    const userHasCar = new PS({
        name: "user-has-car",
        text: `select user_id from users_cars where user_id = $1 and car_id = $2;`,
        values: [this.userId, this.carId],
    }); 

    const user = await this.db.oneOrNone(userHasCar);

    if(!user) {
      throw new UnauthorizedError("User does not own this car");
    }
  }
}

module.exports = UserHasCar