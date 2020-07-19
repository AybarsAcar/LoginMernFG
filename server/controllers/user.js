const User = require("../models/user");

exports.read = (req, res) => {
  //getting the user id from the url query parameter
  const userId = req.params.id;

  User.findById(userId).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }

    //make sure dont send these
    user.hashed_password = undefined;
    user.salt = undefined;

    //otherwise get the user profile
    res.json(user);
  });
};

exports.update = (req, res) => {  
  // console.log(req.body);
  // console.log(req.user);
  
  //i will allow user to update name and password
  const {name, password} = req.body

  User.findOne({_id: req.user._id}, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found"
      })
    }

    //validation before updating
    //check for name
    if (!name) {
      return res.status(400).json({
        error: "Name field is required"
      });
    } else {
      user.name = name;
    }

    //check for password
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          error: "Password must be at least 6 characters"
        });
      } else {
        user.password = password;
      }
    }

    //now save the user after the checks
    user.save((err, updatedUser) => {
      if (err) {
        return res.status(400).json({
          error: "User update failed"
        });
      }

      updatedUser.hashed_password = undefined;
      updatedUser.salt = undefined;

      res.json(updatedUser);
    })
  })
  
};
