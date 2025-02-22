var express = require('express');
var router = express.Router();
const createHttpError = require("http-errors");
const uuidService = require("../services/uuid-service");
const carService = require("../services/car-service");
const userService = require("../services/user-service");
const IllegalArgumentError = require("../public/errors/illegal-argument.error");
const NotFoundError = require("../public/errors/not-found.error");

router.put("/:userId/username", async (req, res, next) => {
  const { userId } = req.params;
  const { username } = req.body;

  if (!uuidService.isUUID(userId)) {
    next(createHttpError(400, "User id is invalid"));
    return;
  } else if (!username || username.length === 0) {
    next(createHttpError(400, "Username is invalid"));
    return;
  }

  try {
    await userService.modifyUsername(userId, username);
    res.send();
  } catch (err) {
    if (err instanceof IllegalArgumentError) {
      next(createHttpError(400, err.message));
      return;
    } else if (err instanceof NotFoundError) {
      next(createHttpError(404, err.message));
      return;
    }

    console.error(err);

    next(createHttpError(500, "Internal error occured updating user"));
  }
});

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
