const { db, transactionMode,  } = require("../public/db/db");
const { PreparedStatement: PS } = require("pg-promise");
const userService = require("./user-service");
const IllegalArgumentError = require("../public/errors/illegal-argument.error");
const NotFoundError = require("../public/errors/not-found.error");
const UnauthorizedError = require("../public/errors/unauthorized.error");
const uuidService = require("./uuid-service");

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

  async createCarForUser(carName, userId) {
    const user = await userService.getUserById(userId);

    if (!user) {
      throw new NotFoundError("User does not exist");
    } else if (!carName || carName.length === 0) {
      throw new IllegalArgumentError("Car name is invalid");
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

    if (!uuidService.isUUID(carId)) {
      throw new IllegalArgumentError("Car id is invalid");
    } else if (!carName || carName.length === 0) {
      throw new IllegalArgumentError("Car name can not be null or blank");
    }

    const car = await this.getCar(carId);
    if (!car) {
      throw new NotFoundError("Car does not exist");
    }

    const updateCarReq = new PS({
      name: "update-car",
      text: "update cars set name = $1 where id = $2",
      values: [carName, carId],
    });

    await db.none(updateCarReq);
  }

  async addUserOnCar(userAddedId, carId, creatorUserId) {
    if (!uuidService.isUUID(carId)) {
      throw new IllegalArgumentError("Car UUID is not valid");
    } else if (!uuidService.isUUID(userAddedId)) {
      throw new IllegalArgumentError("User UUID is not valid");
    } else if (!uuidService.isUUID(creatorUserId)) {
      throw new IllegalArgumentError("Creator user UUID is not valid");
    }

    const user = await userService.getUserById(userAddedId);
    if (!user) {
      throw new NotFoundError("User added does not exist");
    }

    const usersForCar = await this.getCarUsers(carId);
    if (!usersForCar.some((u) => u.user_id === creatorUserId)) {
      throw new UnauthorizedError("Creator does not own car");
    } else if (usersForCar.some((u) => u.user_id === userAddedId)) {
      throw new UnauthorizedError("User is already added to car");
    } else if (userAddedId === creatorUserId) {
      throw new UnauthorizedError("Creator can not add himself to car");
    }

    const insertUserCarReq = new PS({
      name: "insert-user-car-relationship",
      text: "insert into users_cars (user_id, car_id) values ($1, $2)",
      values: [userAddedId, carId],
    });

    await db.none(insertUserCarReq);
  }

  async deleteUserForCar(userIdToDelete, carId, updaterId) {
    if (!uuidService.isUUID(carId)) {
      throw new IllegalArgumentError("Car UUID is not valid");
    } else if (!uuidService.isUUID(userIdToDelete)) {
      throw new IllegalArgumentError("User to delete UUID is not valid");
    } else if (!uuidService.isUUID(updaterId)) {
      throw new IllegalArgumentError("Updater user UUID is not valid");
    }

    let usersForCar = await this.getCarUsers(carId);
    if (!usersForCar.some((u) => u.user_id === updaterId)) {
      throw new UnauthorizedError("Updater does not own car");
    }

    const deleteUserForCar = new PS({
      name: "delete-user-for-car",
      text: "delete from users_cars where user_id = $1 and car_id = $2",
      values: [userIdToDelete, carId],
    });

    await db.none(deleteUserForCar);

    usersForCar = await getCarUsers(carId);

    if (usersForCar.length === 0) {
      await deleteCar(carId);
    }
  }
}

module.exports = new CarService();