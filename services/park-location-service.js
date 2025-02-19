const { db } = require("../public/db/db");
const { PreparedStatement: PS } = require("pg-promise");
const IllegalArgumentError = require("../public/errors/illegal-argument.error");
const carService = require("./car-service");
const crypto = require("node:crypto");
const uuidService = require("../services/uuid-service");
const dateService = require("./date-service");

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

    const parkingBeginning = dateService.formatDateTimeString(beginTime);
    const parkingTimeLimit = dateService.formatDateTimeString(timeLimit);

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
        parkingBeginning,
        parkingTimeLimit,
        location,
        reminder,
      ],
    });

    return db.none(createParkLocation);
  }
}

module.exports = new ParkLocationService();
