var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require("helmet");

var authenticationService = require("./services/authentication-service");

var userRouter = require("./routes/user");
var carRouter = require("./routes/car");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(helmet());

app.use(async function (req, res, next) {
  try {
    let loggedIn = await authenticationService.reqIsAllowed(req);

    if (!loggedIn) {
      res.status(401);
      res.send();
      return;
    }
  } catch (err) {
    res.status(401);
    res.send();
    return;
  }

  next();
});

app.use("/user", userRouter);
app.use("/car", carRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.send(err.message);
});

module.exports = app;
