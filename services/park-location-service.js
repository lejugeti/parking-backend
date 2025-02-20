const { db } = require("../public/db/db");
const { PreparedStatement: PS } = require("pg-promise");
const IllegalArgumentError = require("../public/errors/illegal-argument.error");
const NotFoundError = require("../public/errors/not-found.error");
const carService = require("./car-service");
const crypto = require("node:crypto");
const uuidService = require("../services/uuid-service");

class ParkLocationService {
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

    const carUsers = await carService.getCarUsers(carId);
    const creatorOwnsCar = carUsers.some(
      (user) => user.user_id === parkingCreator.id
    );
    const parkerOwnsCar = carUsers.some(
      (user) => user.user_id === userWhoParkId
    );

    if (!creatorOwnsCar) {
      throw new IllegalArgumentError("User does not own the car");
    } else if (!parkerOwnsCar) {
      throw new IllegalArgumentError("User who parks does not own the car");
    }

    const parkingId = crypto.randomUUID();
    const parkingBeginning = new Date(beginTime);
    const parkingTimeLimit = new Date(timeLimit);

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

    const carUsers = await carService.getCarUsers(carId);
    const updaterOwnsCar = carUsers.some(
      (user) => user.user_id === parkingUpdater.id
    );
    const parkerOwnsCar = carUsers.some(
      (user) => user.user_id === userWhoParkId
    );

    if (!updaterOwnsCar) {
      throw new IllegalArgumentError("Updater does not own the car");
    } else if (!parkerOwnsCar) {
      throw new IllegalArgumentError("User who parks does not own the car");
    }

    const parkingBeginning = new Date(beginTime);
    const parkingTimeLimit = new Date(timeLimit);
    console.log({
      parkingBeginning,
      parkingTimeLimit,
      cond: parkingBeginning > parkingTimeLimit,
    });
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

module.exports = new ParkLocationService();
