var express = require("express");
var router = express.Router();
const createHttpError = require("http-errors");
const uuidService = require("../services/uuid-service");
const carService = require("../services/car-service");
const parkLocationService = require("../services/park-location-service");
const authenticationService = require("../services/authentication-service");
const userService = require("../services/user-service");
const IllegalArgumentError = require("../public/errors/illegal-argument.error");
const NotFoundError = require("../public/errors/not-found.error");
const UnauthorizedError = require("../public/errors/unauthorized.error");

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

router.put("/:carId", async (req, res, next) => {
  const { carId } = req.params;

  if (!uuidService.isUUID(carId)) {
    next(createHttpError(400, "Car id is invalid"));
    return;
  }

  try {
    const login = authenticationService.getAuthFromRequest(req).login;
    const user = await userService.getUserByLogin(login);
    const carUsers = await carService.getCarUsers(carId);

    if (!carUsers.some((carUser) => carUser.user_id === user.id)) {
      next(createHttpError(403, "User does not own the car"));
      return;
    }

    await carService.updateCar(carId, req.body);
    res.send();
  } catch (err) {
    if (err instanceof IllegalArgumentError) {
      next(createHttpError(400, err.message));
      return;
    } else if (err instanceof NotFoundError) {
      next(createHttpError(404, err.message));
      return;
    }

    next(createHttpError(500, "Internal error while updating car"));
  }
});

router.post("/:carId/user", async (req, res, next) => {
  const { carId } = req.params;
  const { userId } = req.body;

  try {
    const login = authenticationService.getAuthFromRequest(req).login;
    const creatorUser = await userService.getUserByLogin(login);

    await carService.addUserOnCar(userId, carId, creatorUser.id);
    res.status(201);
    res.send();
  } catch (err) {
    if (err instanceof IllegalArgumentError) {
      next(createHttpError(400, err.message));
      return;
    } else if (err instanceof UnauthorizedError) {
      next(createHttpError(403, err.message));
      return;
    } else if (err instanceof NotFoundError) {
      next(createHttpError(404, err.message));
      return;
    }

    console.error(err);

    next(
      createHttpError(500, "Internal error occured while adding user to car")
    );
  }
});

router.delete("/:carId/user/:userId", async (req, res, next) => {
  const { carId, userId } = req.params;

  try {
    const login = authenticationService.getAuthFromRequest(req).login;
    const updaterUser = await userService.getUserByLogin(login);

    await carService.deleteUserForCar(userId, carId, updaterUser.id);
    res.status(200);
    res.send();
  } catch (err) {
    if (err instanceof IllegalArgumentError) {
      next(createHttpError(400, err.message));
      return;
    } else if (err instanceof UnauthorizedError) {
      next(createHttpError(403, err.message));
      return;
    } else if (err instanceof NotFoundError) {
      next(createHttpError(404, err.message));
      return;
    }

    console.error(err);

    next(
      createHttpError(500, "Internal error occured while adding user to car")
    );
  }
});

router.get("/:carId/park-location", async (req, res, next) => {
  const { carId } = req.params;

  if (!uuidService.isUUID(carId)) {
    next(createHttpError(400, "UUID is not valid"));
    return;
  }

  const carCurrentParking = await parkLocationService.getCurrentParkLocation(
    carId
  );

  if (!carCurrentParking) {
    next(createHttpError(404, "Car parking location not found"));
    return;
  }

  res.send(carCurrentParking);
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

router.put("/:carId/park-location/:parkLocationId", async (req, res, next) => {
  try {
    const { carId, parkLocationId } = req.params;
    const { login } = authenticationService.getAuthFromRequest(req);
    const updaterUser = await userService.getUserByLogin(login);
    await parkLocationService.updateParkLocation(
      carId,
      parkLocationId,
      updaterUser,
      req.body
    );

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

    next(
      createHttpError(
        500,
        "Internal error occured while creating parking location"
      )
    );
  }
});

module.exports = router;
