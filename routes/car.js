var express = require("express");
var router = express.Router();
const { param, body, validationResult } = require("express-validator");
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
router.get(
  "/:carId",
  param("carId")
    .notEmpty()
    .trim()
    .custom((id) => uuidService.isUUID(id))
    .escape(),
  async (req, res, next) => {
    const reqValidation = validationResult(req);
    if (!reqValidation.isEmpty()) {
      const error = reqValidation.errors[0];
      next(createHttpError(400, `Bad request : ${error.path} is invalid`));
      return;
    }

    const carId = req.params.carId;

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

      next(
        createHttpError(500, "Unexpected error happened while fetching car")
      );
    }
  }
);

/**
 * Update car informations
 */
router.put(
  "/:carId",
  [
    param("carId")
      .notEmpty()
      .trim()
      .custom((id) => uuidService.isUUID(id))
      .escape(),
    body("carName").notEmpty().trim().escape(),
  ],
  async (req, res, next) => {
    const reqValidation = validationResult(req);
    if (!reqValidation.isEmpty()) {
      const error = reqValidation.errors[0];
      next(createHttpError(400, `Bad request : ${error.path} is invalid`));
      return;
    }

    try {
      const { carId } = req.params;
      const { carName } = req.body;
      const carUpdated = { carName };

      const login = authenticationService.getAuthFromRequest(req).login;
      const user = await userService.getUserByLogin(login);
      await authValidator.validate(new UserHasCar(db, user.id, carId));

      await carService.updateCar(carId, carUpdated);
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
  }
);

/**
 * Add user to car
 */
router.post(
  "/:carId/user",
  [
    param("carId")
      .notEmpty()
      .trim()
      .custom((id) => uuidService.isUUID(id))
      .escape(),
    body("userId")
      .notEmpty()
      .custom((id) => uuidService.isUUID(id))
      .trim()
      .escape(),
  ],
  async (req, res, next) => {
    const reqValidation = validationResult(req);
    if (!reqValidation.isEmpty()) {
      const error = reqValidation.errors[0];
      next(createHttpError(400, `Bad request : ${error.path} is invalid`));
      return;
    }

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
  }
);

/**
 * Delete user from car
 */
router.delete(
  "/:carId/user/:userId",
  [
    param("carId")
      .notEmpty()
      .trim()
      .custom((id) => uuidService.isUUID(id))
      .escape(),
    param("userId")
      .notEmpty()
      .custom((id) => uuidService.isUUID(id))
      .trim()
      .escape(),
  ],
  async (req, res, next) => {
    const reqValidation = validationResult(req);
    if (!reqValidation.isEmpty()) {
      const error = reqValidation.errors[0];
      next(createHttpError(400, `Bad request : ${error.path} is invalid`));
      return;
    }

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
  }
);

/**
 * Get car's parking location informations
 */
router.get(
  "/:carId/park-location",
  [
    param("carId")
      .notEmpty()
      .trim()
      .custom((id) => uuidService.isUUID(id))
      .escape(),
  ],
  async (req, res, next) => {
    const reqValidation = validationResult(req);
    if (!reqValidation.isEmpty()) {
      const error = reqValidation.errors[0];
      next(createHttpError(400, `Bad request : ${error.path} is invalid`));
      return;
    }

    const { carId } = req.params;

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
  }
);

/**
 * Create park location for specific car
 */
router.post(
  "/:carId/park-location",
  [
    param("carId")
      .notEmpty()
      .trim()
      .custom((id) => uuidService.isUUID(id))
      .escape(),
    body("userWhoParkId")
      .notEmpty()
      .trim()
      .custom((id) => uuidService.isUUID(id))
      .escape(),
    body("beginTime").notEmpty().trim().escape(),
    body("timeLimit").notEmpty().trim().escape(),
    body("location").notEmpty().trim().escape(),
    body("reminder").notEmpty().isBoolean().escape(),
  ],
  async (req, res, next) => {
    const reqValidation = validationResult(req);
    if (!reqValidation.isEmpty()) {
      const error = reqValidation.errors[0];
      next(createHttpError(400, `Bad request : ${error.path} is invalid`));
      return;
    }

    try {
      const { carId } = req.params;
      const { login } = authenticationService.getAuthFromRequest(req);
      const creatorUser = await userService.getUserByLogin(login);
      await authValidator.validate(new UserHasCar(db, creatorUser.id, carId));

      const parkLocation = {
        userWhoParkId: req.body.userWhoParkId,
        beginTime: req.body.beginTime,
        timeLimit: req.body.timeLimit,
        location: req.body.location,
        reminder: req.body.reminder,
      };
      await carService.createParkLocation(carId, creatorUser, parkLocation);

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
  }
);

/**
 * Update parking location informations
 */
router.put(
  "/:carId/park-location/:parkLocationId",
  [
    param("carId")
      .notEmpty()
      .trim()
      .custom((id) => uuidService.isUUID(id))
      .escape(),
    param("parkLocationId").notEmpty().trim().escape(),
    body("beginTime").notEmpty().trim().escape(),
    body("timeLimit").notEmpty().trim().escape(),
    body("location").notEmpty().trim().escape(),
    body("reminder").notEmpty().isBoolean().escape(),
  ],
  async (req, res, next) => {
    const reqValidation = validationResult(req);
    if (!reqValidation.isEmpty()) {
      const error = reqValidation.errors[0];
      next(createHttpError(400, `Bad request : ${error.path} is invalid`));
      return;
    }

    try {
      const { carId, parkLocationId } = req.params;
      const { userWhoParkId, beginTime, timeLimit, location, reminder } =
        req.body;

      const { login } = authenticationService.getAuthFromRequest(req);
      const updaterUser = await userService.getUserByLogin(login);
      await authValidator.validate(
        new UserHasCar(db, updaterUser.id, carId),
        new UserHasCar(db, userWhoParkId, carId)
      );

      const parkLocation = {
        userWhoParkId,
        beginTime,
        timeLimit,
        location,
        reminder,
      };

      await carService.updateParkLocation(
        carId,
        parkLocationId,
        updaterUser,
        parkLocation
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
  }
);

module.exports = router;
