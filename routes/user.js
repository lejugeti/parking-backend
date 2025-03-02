var express = require('express');
var router = express.Router();
const { param, body, validationResult } = require("express-validator");
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
router.put(
  "/:userId/username",
  [
    param("userId")
      .notEmpty()
      .trim()
      .custom((id) => uuidService.isUUID(id))
      .escape(),
    body("username").notEmpty().trim().escape(),
  ],
  async (req, res, next) => {
    const reqValidation = validationResult(req);
    const { userId } = req.params;
    const { username } = req.body;

    if (!reqValidation.isEmpty()) {
      const error = reqValidation.errors[0];
      next(createHttpError(400, `Bad request : ${error.path} is invalid`));
      return;
    }

    try {
      const login = authenticationService.getAuthFromRequest(req).login;
      const user = await userService.getUserByLogin(login);
      await authValidator.validate(new UserTargetsItself(db, user.id, userId));

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
  }
);

/**
 * Get user's car list
 */
router.get(
  "/:userId/car-list",
  [
    param("userId")
      .notEmpty()
      .trim()
      .custom((id) => uuidService.isUUID(id))
      .escape(),
  ],
  async (req, res, next) => {
    const reqValidation = validationResult(req);
    const { userId } = req.params;

    if (!reqValidation.isEmpty()) {
      const error = reqValidation.errors[0];
      next(createHttpError(400, `Bad request : ${error.path} is invalid`));
      return;
    }

    try {
      const login = authenticationService.getAuthFromRequest(req).login;
      const user = await userService.getUserByLogin(login);
      await authValidator.validate(new UserTargetsItself(db, user.id, userId));

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
  }
);

/**
 * Create a car for specific user
 */
router.post(
  "/:userId/car",
  [
    param("userId")
      .notEmpty()
      .trim()
      .custom((id) => uuidService.isUUID(id))
      .escape(),
    body("carName").notEmpty().trim().escape(),
  ],
  async (req, res, next) => {
    const reqValidation = validationResult(req);
    const { userId } = req.params;
    const { carName } = req.body;

    if (!reqValidation.isEmpty()) {
      const error = reqValidation.errors[0];
      next(createHttpError(400, `Bad request : ${error.path} is invalid`));
      return;
    }

    try {
      const login = authenticationService.getAuthFromRequest(req).login;
      const user = await userService.getUserByLogin(login);
      await authValidator.validate(new UserTargetsItself(db, user.id, userId));

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
  }
);

module.exports = router;
