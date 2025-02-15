var express = require("express");
var router = express.Router();
const { PreparedStatement: PS } = require("pg-promise");
const createHttpError = require("http-errors");
const { isUUID } = require("../services/uuid-service");
const carService = require("../services/car-service");

router.get("/:carId", async (req, res, next) => {
  const carId = req.params.carId;

  if (!isUUID(carId)) {
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

  if (!isUUID(userId)) {
    next(createHttpError(400, "User id is invalid"));
    return;
  } else if (!carName || carName.length === 0) {
    next(createHttpError(400, "Car name must not be null or empty"));
    return;
  }

  try {
    await carService.createCar(carName, userId);

    res.send();
  } catch(err) {
    next(createHttpError(500, "Internal error while creating car"));
  }

});

module.exports = router;
