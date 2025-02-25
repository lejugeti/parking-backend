var express = require('express');
var router = express.Router();
const createHttpError = require("http-errors");
const uuidService = require("../services/uuid-service");
const carService = require("../services/car-service");
const userService = require("../services/user-service");
const IllegalArgumentError = require("../public/errors/illegal-argument.error");
const NotFoundError = require("../public/errors/not-found.error");
const AuthorizationValidator = require("../services/authorizations/authorizations-validator");
const UserTargetsItself = require("../services/authorizations/authorization-commands/user-targets-itself");
const authenticationService = require("../services/authentication-service");
const { db } = require("../public/db/db");
const UnauthorizedError = require("../public/errors/unauthorized.error");

const authValidator = new AuthorizationValidator();

/**
 * Update username
 */
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
    await authValidator.validate(
      new UserTargetsItself(authenticationService, db, req, userId)
    );

    await userService.modifyUsername(userId, username);
    res.send();
  } catch (err) {
    if (err instanceof IllegalArgumentError) {
      next(createHttpError(400, err.message));
      return;
    } else if (err instanceof NotFoundError) {
      next(createHttpError(404, err.message));
      return;
    } else if (err instanceof UnauthorizedError) {
      next(createHttpError(403, err.message));
      return;
    }

    console.error(err);

    next(createHttpError(500, "Internal error occured updating user"));
  }
});

/**
 * Get user's car list
 */
router.get("/:userId/car-list", async (req, res, next) => {
  const { userId } = req.params;

  if (!uuidService.isUUID(userId)) {
    next(createHttpError(400, "User id is invalid"));
    return;
  }

  try {
    await authValidator.validate(
      new UserTargetsItself(authenticationService, db, req, userId)
    );

    const userCars = await userService.getUserCars(userId);
    res.send(userCars);
  } catch (err) {
    if (err instanceof IllegalArgumentError) {
      next(createHttpError(400, err.message));
      return;
    } else if (err instanceof UnauthorizedError) {
      next(createHttpError(403, err.message));
      return;
    }

    next(createHttpError(500, "Internal error while fetching user cars"));
  }
});

/**
 * Create a car for specific user
 */
router.post("/:userId/car", async (req, res, next) => {
  const { userId } = req.params;
  const { carName } = req.body;

  if (!uuidService.isUUID(userId)) {
    next(createHttpError(400, "User id is invalid"));
    return;
  } else if (!carName || carName.length === 0) {
    next(createHttpError(400, "Car name must not be null or empty"));
    return;
  }

  try {
    await authValidator.validate(
      new UserTargetsItself(authenticationService, db, req, userId)
    );

    await await carService.createCarForUser(carName, userId);
    res.send();
  } catch (err) {
    if (err instanceof IllegalArgumentError) {
      next(createHttpError(400, err.message));
      return;
    } else if (err instanceof NotFoundError) {
      next(createHttpError(404, err.message));
      return;
    } else if (err instanceof UnauthorizedError) {
      next(createHttpError(403, err.message));
      return;
    }

    next(createHttpError(500, "Internal error while creating car"));
  }
});

module.exports = router;
