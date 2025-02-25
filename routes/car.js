var express = require("express");
var router = express.Router();
const createHttpError = require("http-errors");
const uuidService = require("../services/uuid-service");
const carService = require("../services/car-service");
const authenticationService = require("../services/authentication-service");
const userService = require("../services/user-service");
const AuthorizationValidator = require("../services/authorizations/authorizations-validator");

const IllegalArgumentError = require("../public/errors/illegal-argument.error");
const NotFoundError = require("../public/errors/not-found.error");
const UnauthorizedError = require("../public/errors/unauthorized.error");
const UserHasCar = require("../services/authorizations/authorization-commands/user-has-car");
const { db } = require("../public/db/db");
const UserExists = require("../services/authorizations/authorization-commands/user-exists");
const UserNotAlreadyAddedToCar = require("../services/authorizations/authorization-commands/user-not-already-added-to-car");
const UserNotTargetingItself = require("../services/authorizations/authorization-commands/user-not-targeting-itself");

const authValidator = new AuthorizationValidator();

/**
 * Get car informations
 */
router.get("/:carId", async (req, res, next) => {
  const carId = req.params.carId;

  if (!uuidService.isUUID(carId)) {
    next(createHttpError(400, "UUID is not valid"));
    return;
  }

  try {
    const login = authenticationService.getAuthFromRequest(req).login;
    const user = await userService.getUserByLogin(login);
    await authValidator.validate(new UserHasCar(db, user.id, carId));

    const car = await carService.getCar(carId);

    if (!car) {
      next(createHttpError(404, "Car not found"));
      return;
    }

    res.send(car);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(createHttpError(403, err.message));
      return;
    }

    next(createHttpError(500, "Unexpected error happened while fetching car"));
  }
});

/**
 * Update car informations
 */
router.put("/:carId", async (req, res, next) => {
  const { carId } = req.params;

  if (!uuidService.isUUID(carId)) {
    next(createHttpError(400, "Car id is invalid"));
    return;
  }

  try {
    const login = authenticationService.getAuthFromRequest(req).login;
    const user = await userService.getUserByLogin(login);
    await authValidator.validate(new UserHasCar(db, user.id, carId));

    await carService.updateCar(carId, req.body);
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

    next(createHttpError(500, "Internal error while updating car"));
  }
});

/**
 * Add user to car
 */
router.post("/:carId/user", async (req, res, next) => {
  const { carId } = req.params;
  const { userId } = req.body;

  try {
    const login = authenticationService.getAuthFromRequest(req).login;
    const creatorUser = await userService.getUserByLogin(login);
    await authValidator.validate(
      new UserHasCar(db, creatorUser.id, carId),
      new UserExists(db, userId),
      new UserNotTargetingItself(db, creatorUser.id, userId),
      new UserNotAlreadyAddedToCar(db, userId, carId)
    );

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

/**
 * Delete user from car
 */
router.delete("/:carId/user/:userId", async (req, res, next) => {
  const { carId, userId } = req.params;

  try {
    const login = authenticationService.getAuthFromRequest(req).login;
    const updaterUser = await userService.getUserByLogin(login);
    await authValidator.validate(
      new UserHasCar(db, updaterUser.id, carId),
      new UserHasCar(db, userId, carId)
    );

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

/**
 * Get car's parking location informations
 */
router.get("/:carId/park-location", async (req, res, next) => {
  const { carId } = req.params;

  if (!uuidService.isUUID(carId)) {
    next(createHttpError(400, "UUID is not valid"));
    return;
  }

  try {
    const login = authenticationService.getAuthFromRequest(req).login;
    const requesterUser = await userService.getUserByLogin(login);
    await authValidator.validate(new UserHasCar(db, requesterUser.id, carId));

    const carCurrentParking = await carService.getCurrentParkLocation(carId);

    if (!carCurrentParking) {
      next(createHttpError(404, "Car parking location not found"));
      return;
    }

    res.send(carCurrentParking);
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

/**
 * Create park location for specific car
 */
router.post("/:carId/park-location", async (req, res, next) => {
  try {
    const { carId } = req.params;

    const { login } = authenticationService.getAuthFromRequest(req);
    const creatorUser = await userService.getUserByLogin(login);
    await authValidator.validate(new UserHasCar(db, creatorUser.id, carId));

    await carService.createParkLocation(carId, creatorUser, req.body);

    res.status(201);
    res.send();
  } catch (err) {
    if (err instanceof IllegalArgumentError) {
      next(createHttpError(400, err.message));
      return;
    } else if (err instanceof UnauthorizedError) {
      next(createHttpError(403, err.message));
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

/**
 * Update parking location informations
 */
router.put("/:carId/park-location/:parkLocationId", async (req, res, next) => {
  try {
    const { carId, parkLocationId } = req.params;
    const { userWhoParkId } = req.body;

    const { login } = authenticationService.getAuthFromRequest(req);
    const updaterUser = await userService.getUserByLogin(login);
    await authValidator.validate(
      new UserHasCar(db, updaterUser.id, carId),
      new UserHasCar(db, userWhoParkId, carId)
    );

    await carService.updateParkLocation(
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
    } else if (err instanceof UnauthorizedError) {
      next(createHttpError(403, err.message));
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
