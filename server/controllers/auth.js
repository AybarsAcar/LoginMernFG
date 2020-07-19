//to use environment variables
require("dotenv").config();
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const _ = require("lodash");
//google authentication
const { OAuth2Client } = require("google-auth-library");
const fetch = require("node-fetch");

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.signup = (req, res) => {
  const { name, email, password } = req.body;

  //find the user in the database if they are signed already
  User.findOne({ email }).exec((err, user) => {
    if (user) {
      return res.status(400).json({
        error: "Email is already taken",
      });
    }

    //if no user found generate a token -- 3rd arguement is the expiry date
    //the token expires in 10 mins
    const token = jwt.sign(
      { name, email, password },
      process.env.JWT_ACCOUNT_ACTIVATION,
      { expiresIn: "10m" }
    );

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Account activation link`,
      html: `
          <h3>Please use the following link to activate your account</h3>
          <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
          <hr/>
          <p>This email may contain sensitive information</p>
          <p>${process.env.CLIENT_URL}</p>
      `,
    };

    //send the email
    sgMail
      .send(emailData)
      .then((sent) => {
        return res.json({
          message: `Email has been sent to ${email}. Follow the instructions to activate your account`,
        });
      })
      .catch((err) => {
        return res.json({
          message: err.message,
        });
      });
  });
};

//
exports.accountActivation = (req, res) => {
  const { token } = req.body;

  //verify the token because it expires in 10 min
  if (token) {
    jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, function (
      err,
      decoded
    ) {
      if (err) {
        console.log("JWT verify account activation error ", err);
        return res.status(401).json({
          error: "Expired Link. Please Signup again",
        });
      }

      //we can sign up the user if no error
      const { name, email, password } = jwt.decode(token);
      const user = new User({ name, email, password });

      user.save((err, user) => {
        if (err) {
          console.log("Save User in Account Activation Error ", err);
          return res.status(401).json({
            error: "Error saving user in database. Try signing up again",
          });
        }

        return res.json({
          message: "Successfuly signed up. You can now sign in!",
        });
      });
    });
  } else {
    return res.json({
      message: "Something went wrong. Please try again",
    });
  }
};

//signin method
exports.signin = (req, res) => {
  const { email, password } = req.body;

  //check if user exists
  User.findOne({ email }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User does not exist. Please sign up",
      });
    }

    //authenticate //match the password
    //if returns false
    if (!user.authenticate(password)) {
      return res.status(400).json({
        error: "Email and password do not match",
      });
    }

    //generate the token and send to client
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    //
    const { _id, name, email, role } = user;

    return res.json({
      token: token,
      user: {
        _id,
        name,
        email,
        role,
      },
    });
  });
};

//middleware -- make the data availbe in req.user
exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
});

//admin middleware to check if the user is admin
exports.adminMiddleware = (req, res, next) => {
  User.findById({ _id: req.user._id }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }

    //check the role
    if (user.role !== "admin") {
      return res.status(400).json({
        error: "Admin resource. Access denied",
      });
    }

    //now this user is available in the request object
    req.profile = user;

    //then execute the next
    next();
  });
};

//
exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User with that email does not exist",
      });
    }

    //otherwise generate a token and send an email with that token
    const token = jwt.sign(
      { _id: user._id, name: user.name },
      process.env.JWT_RESET_PASSWORD,
      {
        expiresIn: "10m",
      }
    );

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Password Reset Link`,
      html: `
          <h3>Please use the following link to reset your password</h3>
          <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
          <hr/>
          <p>This email may contain sensitive information</p>
          <p>${process.env.CLIENT_URL}</p>
      `,
    };

    //update the resetPasswordLink with token
    return user.updateOne({ resetPasswordLink: token }, (err, success) => {
      if (err) {
        return res.status(400).json({
          error: "Database connection error on user password forgot request",
        });
      } else {
        //send the email
        sgMail
          .send(emailData)
          .then((sent) => {
            return res.json({
              message: `Email has been sent to ${email}. Follow the instructions to activate your account`,
            });
          })
          .catch((err) => {
            return res.json({
              message: err.message,
            });
          });
      }
    });
  });
};

//
exports.resetPassword = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  if (resetPasswordLink) {
    //verify if hasnt expired
    jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, function (
      err,
      decoded
    ) {
      if (err) {
        return res.status(400).json({
          error: "Expired Link. Please try again",
        });
      }

      //find the user based on the link
      User.findOne({ resetPasswordLink }, (err, user) => {
        if (err || !user) {
          return res.status(400).json({
            error: "Something went wrong. Please try again",
          });
        }

        const updatedFields = {
          password: newPassword,
          resetPasswordLink: "",
        };

        user = _.extend(user, updatedFields);
        user.save((err, result) => {
          if (err) {
            return res.status(400).json({
              error: "Error resetting user password",
            });
          }

          res.json({
            message: `Hey ${user.name}! Now you can login with your new password!`,
          });
        });
      });
    });
  }
};

//google controller
//grab client id
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.googleLogin = (req, res) => {
  //token from req body coming from react
  const { idToken } = req.body;

  client
    .verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
    .then((response) => {
      //console.log("Google login response" ,response);
      const { email_verified, name, email } = response.payload;

      //make sure email verified is true
      if (email_verified) {
        User.findOne({ email }).exec((err, user) => {
          if (user) {
            //generate the token
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
              expiresIn: "7d",
            });
            const { _id, email, name, role } = user;
            return res.json({
              token,
              user: { _id, email, name, role },
            });
          } else {
            //if user is not in our database create the user
            let password = email + process.env.JWT_SECRET;
            user = new User({ name, email, password });
            user.save((err, data) => {
              if (err) {
                console.log("Error Google Login on User Save", err);
                return res.status(400).json({
                  error: "User signup failed with Google",
                });
              }
              //if no error generate the token
              const token = jwt.sign(
                { _id: data._id },
                process.env.JWT_SECRET,
                {
                  expiresIn: "7d",
                }
              );
              const { _id, email, name, role } = data;
              return res.json({
                token,
                user: { _id, email, name, role },
              });
            });
          }
        });
      } else {
        return res.status(400).json({
          error: "Google login failed. Please try again",
        });
      }
    });
};

//facebook login
exports.facebookLogin = (req, res) => {
  console.log("Facebook Login req body", req.body);

  const { userID, accessToken } = req.body;

  //create the url
  const url = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`;

  //use fetch to make request to the url
  return fetch(url, {
    method: "GET",
  })
    .then((response) => response.json())
    .then((response) => {
      const { email, name } = response;
      //now query the database if the user already exists in our database -- if so generatea token
      User.findOne({ email }).exec((err, user) => {
        if (user) {
          //generate the token
          const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
          });
          const { _id, email, name, role } = user;
          return res.json({
            token,
            user: { _id, email, name, role },
          });
        } else {
          //if user is not in our database create the user
          let password = email + process.env.JWT_SECRET;
          user = new User({ name, email, password });
          user.save((err, data) => {
            if (err) {
              console.log("Error Facebook Login on User Save", err);
              return res.status(400).json({
                error: "User signup failed with Facebook",
              });
            }
            //if no error generate the token
            const token = jwt.sign({ _id: data._id }, process.env.JWT_SECRET, {
              expiresIn: "7d",
            });
            const { _id, email, name, role } = data;
            return res.json({
              token,
              user: { _id, email, name, role },
            });
          });
        }
      });
    })
    .catch((error) => {
      res.json({
        error: "Facebook Login Failer. Please try again",
      });
    });
};
