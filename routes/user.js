var express = require('express');
var router = express.Router();
const createHttpError = require("http-errors");
const uuidService = require("../services/uuid-service");
const carService = require("../services/car-service");

router.delete("/:userId/car/:carId", async (req, res, next) => {
  const { userId, carId } = req.params;

  if (!uuidService.isUUID(userId)) {
    next(createHttpError(400, "User id is invalid"));
    return;
  } else if (!uuidService.isUUID(carId)) {
    next(createHttpError(400, "Car id is invalid"));
    return;
  }

  try {
    await carService.deleteCarForUser(userId, carId);
    res.send();
  } catch (err) {
    next(createHttpError(500, "Internal error while deleting car"));
  }
});

module.exports = router;
