const { db, transactionMode,  } = require("../public/db/db");
const { PreparedStatement: PS } = require("pg-promise");
const userService = require("./user-service");
const uuidService = require("./uuid-service");
const crypto = require("node:crypto");

const IllegalArgumentError = require("../public/errors/illegal-argument.error");
const NotFoundError = require("../public/errors/not-found.error");
const UnauthorizedError = require("../public/errors/unauthorized.error");

class CarService {
  async getCar(carId) {
    return await db.tx(transactionMode, async () => {
      const findCar = new PS({
        name: "find-single-car",
        text: "SELECT * FROM cars WHERE id = $1",
        values: [carId],
      });

      const car = await db.oneOrNone(findCar);

      if (!car) {
        throw new NotFoundError("Car not found");
      }

      const carUsers = await this.getCarUsers(carId);
      const currentParking = await this.getCurrentParkLocation(carId);

      car.users = carUsers;
      car.parkLocation = currentParking;

      return car;
    });
  }

  async getCarUsers(carId) {
    const retrieveCarUsers = new PS({
      name: "get-users-using-a-car",
      text: `select id, login, username from users_cars uc
              inner join users u on (uc.user_id = u.id)
              where uc.car_id = $1`,
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
    if (!usersForCar.some((u) => u.id === creatorUserId)) {
      throw new UnauthorizedError("Creator does not own car");
    } else if (usersForCar.some((u) => u.id === userAddedId)) {
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
    if (!usersForCar.some((u) => u.id === updaterId)) {
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

  async createParkLocation(carId, parkingCreator, parkLocation) {
    const { userWhoParkId, beginTime, timeLimit, location, reminder } =
      parkLocation;

    if (!parkingCreator) {
      throw new IllegalArgumentError("Creator can not be null");
    } else if (!uuidService.isUUID(carId)) {
      throw new IllegalArgumentError("Car parked id is invalid");
    } else if (!uuidService.isUUID(userWhoParkId)) {
      throw new IllegalArgumentError("User id is invalid");
    } else if (!beginTime || beginTime.length === 0) {
      throw new IllegalArgumentError("Parking time is invalid");
    } else if (!location || location.length === 0) {
      throw new IllegalArgumentError("Location is invalid");
    }

    const carUsers = await this.getCarUsers(carId);
    const creatorOwnsCar = carUsers.some(
      (user) => user.id === parkingCreator.id
    );
    const parkerOwnsCar = carUsers.some((user) => user.id === userWhoParkId);
    console.log({ carUsers });

    if (!creatorOwnsCar) {
      throw new IllegalArgumentError("User does not own the car");
    } else if (!parkerOwnsCar) {
      throw new IllegalArgumentError("User who parks does not own the car");
    }

    const parkingId = crypto.randomUUID();
    const parkingBeginning = new Date(beginTime);
    const parkingTimeLimit = new Date(timeLimit);
    if (parkingBeginning > parkingTimeLimit) {
      throw new IllegalArgumentError(
        "Parking beginning can not be later than end time"
      );
    }

    const createParkLocation = new PS({
      name: "create-park-location",
      text: `insert into park_location
        (id, car_id, user_who_park_id, creator_user_id, park_start_time, park_end_time, location, reminder)
        values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      values: [
        parkingId,
        carId,
        userWhoParkId,
        parkingCreator.id,
        parkingBeginning.toISOString(),
        parkingTimeLimit.toISOString(),
        location,
        reminder,
      ],
    });

    return db.none(createParkLocation);
  }

  async updateParkLocation(carId, parkingId, parkingUpdater, parkLocation) {
    const currentParkingState = await this.getParkLocationById(parkingId);

    if (!currentParkingState) {
      throw new NotFoundError("Parking location does not exists");
    }

    const { userWhoParkId, beginTime, timeLimit, location, reminder } =
      parkLocation;

    if (!parkingUpdater) {
      throw new IllegalArgumentError("Updater user can not be null");
    } else if (!uuidService.isUUID(carId)) {
      throw new IllegalArgumentError("Car parked id is invalid");
    } else if (!uuidService.isUUID(parkingId)) {
      throw new IllegalArgumentError("Parking location id is invalid");
    } else if (!uuidService.isUUID(userWhoParkId)) {
      throw new IllegalArgumentError("User id is invalid");
    } else if (!beginTime || beginTime.length === 0) {
      throw new IllegalArgumentError("Parking time is invalid");
    } else if (!location || location.length === 0) {
      throw new IllegalArgumentError("Location is invalid");
    }

    const carUsers = await this.getCarUsers(carId);
    const updaterOwnsCar = carUsers.some(
      (user) => user.id === parkingUpdater.id
    );
    const parkerOwnsCar = carUsers.some((user) => user.id === userWhoParkId);

    if (!updaterOwnsCar) {
      throw new IllegalArgumentError("Updater does not own the car");
    } else if (!parkerOwnsCar) {
      throw new IllegalArgumentError("User who parks does not own the car");
    }

    const parkingBeginning = new Date(beginTime);
    const parkingTimeLimit = new Date(timeLimit);
    if (parkingBeginning > parkingTimeLimit) {
      throw new IllegalArgumentError(
        "Parking beginning can not be later than end time"
      );
    }

    const updateParkLocation = new PS({
      name: "update-park-location",
      text: `update park_location
        set user_who_park_id = $1,
          creator_user_id = $2,
          park_start_time = $3,
          park_end_time = $4,
          location = $5,
          reminder = $6
        where id = $7;`,
      values: [
        userWhoParkId,
        parkingUpdater.id,
        parkingBeginning.toISOString(),
        parkingTimeLimit.toISOString(),
        location,
        reminder,
        parkingId,
      ],
    });

    return db.none(updateParkLocation);
  }

  getCurrentParkLocation(carId) {
    if (!uuidService.isUUID(carId)) {
      throw new IllegalArgumentError("Car id is invalid");
    }

    const carCurrentLocationRequest = new PS({
      name: "get-car-current-parking-location",
      text: `select * from park_location 
        where car_id = $1
        order by park_start_time  desc
        limit 1;`,
      values: [carId],
    });

    return db.oneOrNone(carCurrentLocationRequest);
  }

  getParkLocationById(parkLocationId) {
    if (!uuidService.isUUID(parkLocationId)) {
      throw new IllegalArgumentError("Park location id is invalid");
    }

    const carCurrentLocationRequest = new PS({
      name: "get-parking-location-by-id",
      text: `select * from park_location where id = $1;`,
      values: [parkLocationId],
    });

    return db.oneOrNone(carCurrentLocationRequest);
  }
}

module.exports = new CarService();