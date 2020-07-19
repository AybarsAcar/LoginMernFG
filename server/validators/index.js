const {validationResult} = require("express-validator");

exports.runValidation = (req, res, next) => {
  //grabbing the errors
  const errors = validationResult(req);

  //grab the first error and return back to the client
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: errors.array()[0].msg
    });
  }
  next();
};