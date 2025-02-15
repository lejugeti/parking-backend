var express = require("express");
var router = express.Router();
const { PreparedStatement: PS } = require("pg-promise");
const { db } = require("../public/db/db");
const createHttpError = require("http-errors");
const { isUUID } = require("../services/uuid-service");
const carService = require("../services/car-service");


router.get("/:id", function (req, res, next) {
  const id = req.params.id;

  if (!isUUID(id)) {
    next(createHttpError(400, "UUID is not valid"));
    return;
  }

  const findCar = new PS({
    name: "find-single-car",
    text: "SELECT * FROM cars WHERE id = $1",
    values: [id],
  });

  db.oneOrNone(findCar)
    .then(function (data) {
      if(!data) {
        next(createHttpError(404, "Car not found"));
        return;
      }

      res.send(data);
    })
    .catch(function (error) {
      next(createHttpError(500, "Unexpected error occured"));
    });
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
