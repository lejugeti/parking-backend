const { db, transactionMode,  } = require("../public/db/db");
const { PreparedStatement: PS } = require("pg-promise");
const userService = require("./user-service");
const IllegalArgumentError = require("../public/errors/illegal-argument.error");

class CarService {
  async getCar(carId) {
    const findCar = new PS({
      name: "find-single-car",
      text: "SELECT * FROM cars WHERE id = $1",
      values: [carId],
    });

    return db.oneOrNone(findCar);
  }

  async getCarUsers(carId) {
    const retrieveCarUsers = new PS({
      name: "get-users-using-a-car",
      text: "select user_id from users_cars where car_id = $1",
      values: [carId],
    });

    return db.manyOrNone(retrieveCarUsers);
  }

  async createCar(carName, userId) {
    const user = await userService.getUserById(userId);

    if (!user) {
      throw new Error("User does not exist");
    }

    return db.tx(transactionMode, async (transaction) => {
      const carId = crypto.randomUUID();

      const insertCar = new PS({
        name: "insert-car",
        text: "insert into cars (id, name) values ($1, $2)",
        values: [carId, carName],
      });

      await transaction.none(insertCar);

      const insertUserCar = new PS({
        name: "insert-user-car-relationship",
        text: "insert into users_cars (user_id, car_id) values ($1, $2)",
        values: [userId, carId],
      });

      await transaction.none(insertUserCar);

      return true;
    });
  }

  async deleteCar(carId) {
    const deleteCarReq = new PS({
      name: "delete-car",
      text: "delete from cars where id = $1",
      values: [carId],
    });

    await db.none(deleteCarReq);
  }

  async updateCar(carId, carUpdated) {
    const { carName } = carUpdated;

    if (!carName || carName.length === 0) {
      throw new IllegalArgumentError("Car name can not be null or blank");
    }

    const updateCarReq = new PS({
      name: "update-car",
      text: "update cars set name = $1 where id = $2",
      values: [carName, carId],
    });

    await db.none(updateCarReq);
  }

  async deleteCarForUser(userId, carId) {
    const deleteCarForUser = new PS({
      name: "delete-car-for-user",
      text: "delete from users_cars where user_id = $1 and car_id = $2",
      values: [userId, carId],
    });

    await db.none(deleteCarForUser);

    const usersForCar = await getCarUsers(carId);

    if (usersForCar.length === 0) {
      await deleteCar(carId);
    }
  }
}

module.exports = new CarService();