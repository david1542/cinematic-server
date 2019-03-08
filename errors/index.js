"use strict";

/**
 * @module errors
 * @namespace errors
 */

const mongoose = require("mongoose");
const logging = require("../logging");

/**
 * @class
 * @memberof errors
 * @classdesc A base class for all custom errors which app can throw.
 */
class AppError extends Error {
  /**
   * Initialize AppError.
   * @param {String} message The beutified error message.
   * @param {String} error The internal error.
   */
  constructor(message, error) {
    super(message);
    this.message = message;
    this.error = error;
  }

  /**
   * Convert instance to plain JavaScript object.
   * @return {Object} A plain JavaScript object.
   */
  toJSON() {
    return {
      message: this.message,
      error: this.error
    };
  }
}

/**
 * @class
 * @extends errors.AppError
 * @memberof errors
 * @classdesc A class for validations errors which app can throw.
 */
class ValidationError extends AppError {
  /**
   * Initialize a ValidationError.
   * @param {String} error The internal error.
   */
  constructor(error) {
    super("Invalid input.", error);
    this.status = 400;
  }
}

/**
 * @class
 * @extends errors.AppError
 * @memberof errors
 * @classdesc A error class app can throw for unauthorized access .
 */
class UnauthorizedAccess extends AppError {
  /**
   * Initialize a unauthorized access error.
   * @param {String} error The internal error.
   */
  constructor(error) {
    super("Unauthorized access.", error);
    this.status = 403;
  }
}

/**
 * @class
 * @extends errors.AppError
 * @memberof errors
 * @classdesc A error class app can throw for unauthenticated access .
 */
class UnauthenticatedAccess extends AppError {
  /**
   * Initialize a unauthenticated access error.
   * @param {String} error The internal error.
   */
  constructor(error) {
    super("Unauthenticated access.", error);
    this.status = 401;
  }
}

class WrongRange extends AppError {
  constructor(error) {
    super("Wrong Range.", error);
    this.status = 416;
  }
}

class NotFound extends AppError {
  constructor(error) {
    super("Resource not found.", error);
    this.status = 404;
  }
}

class InternalError extends AppError {
  constructor(error) {
    super("Internal server error.", error);
    this.status = 500;
  }
}

/**
 * An error handler middleware: returns a curried `handle` function, which can
 * be called with an error to be handled and send appropriate response to
 * the client.
 * @param {Request} req A http(s) request object.
 * @param {Response} res A http(s) response object.
 * @memberof errors
 * @return {Function} Curried handle function which can be called with an error.
 */
const handler = (req, res) => {
  return error => {
    let email = null;
    if (req.user) {
      email = req.user.email;
    }
    if (error instanceof AppError) {
      logging.warn(error, { email });
      return res.status(error.status).json(error);
    }

    // Handle mongoose errors here...
    if (error instanceof mongoose.Error.ValidationError) {
      logging.warn(error, { email });
      let path = Object.keys(error.errors)[0];
      let internalError = error.errors[path];
      return res.status(400).json({
        message: error.message,
        error: internalError ? internalError.message : null
      });
    }

    logging.error(error, { email, stack: error.stack });
    res.status(error.status || 500).end("Internal server error.");
  };
};

module.exports = {
  ValidationError,
  UnauthorizedAccess,
  UnauthenticatedAccess,
  WrongRange,
  AppError,
  NotFound,
  InternalError,
  handler
};
