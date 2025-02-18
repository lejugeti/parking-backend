const IllegalArgumentError = require("../public/errors/illegal-argument.error");
const createHttpError = require("http-errors");
const parkLocationService = require("../services/park-location-service");
const authenticationService = require("../services/authentication-service");
const userService = require("../services/user-service");

var express = require("express");
var router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { login } = authenticationService.getAuthFromRequest(req);
    const creatorUser = await userService.getUserByLogin(login);
    await parkLocationService.createParkLocation(creatorUser, req.body);

    res.status(201);
    res.send();
  } catch (err) {
    if (err instanceof IllegalArgumentError) {
      next(createHttpError(400, err.message));
      return;
    }

    console.error(err)

    next(
      createHttpError(
        500,
        "Internal error occured while creating parking location"
      )
    );
  }
});

module.exports = router;
