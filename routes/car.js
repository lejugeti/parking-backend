var express = require("express");
var router = express.Router();
const createHttpError = require("http-errors");
const uuidService = require("../services/uuid-service");
const carService = require("../services/car-service");
const parkLocationService = require("../services/park-location-service");
const authenticationService = require("../services/authentication-service");
const userService = require("../services/user-service");
const IllegalArgumentError = require("../public/errors/illegal-argument.error");

router.get("/:carId", async (req, res, next) => {
  const carId = req.params.carId;

  if (!uuidService.isUUID(carId)) {
    next(createHttpError(400, "UUID is not valid"));
    return;
  }

  const car = await carService.getCar(carId);

  if (!car) {
    next(createHttpError(404, "Car not found"));
    return;
  }

  res.send(car);
});

router.post("/", async (req, res, next) => {
  const { userId, carName } = req.body;

  if (!uuidService.isUUID(userId)) {
    next(createHttpError(400, "User id is invalid"));
    return;
  } else if (!carName || carName.length === 0) {
    next(createHttpError(400, "Car name must not be null or empty"));
    return;
  }

  try {
    await carService.createCar(carName, userId);

    res.send();
  } catch (err) {
    next(createHttpError(500, "Internal error while creating car"));
  }
});

router.post("/:carId/park-location", async (req, res, next) => {
  try {
    const { carId } = req.params;
    const { login } = authenticationService.getAuthFromRequest(req);
    const creatorUser = await userService.getUserByLogin(login);
    await parkLocationService.createParkLocation(carId, creatorUser, req.body);

    res.status(201);
    res.send();
  } catch (err) {
    if (err instanceof IllegalArgumentError) {
      next(createHttpError(400, err.message));
      return;
    }

    console.error(err);

    next(
      createHttpError(
        500,
        "Internal error occured while creating parking location"
      )
    );
  }
});


module.exports = router;
