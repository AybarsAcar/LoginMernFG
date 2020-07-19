//import express to use its router
const express = require("express");
const router = express.Router();
//import controllers
const {
  signup,
  accountActivation,
  signin,
  forgotPassword,
  resetPassword,
  googleLogin,
  facebookLogin
} = require("../controllers/auth");

//import validators
const {
  userSignupValidator,
  userSigninValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require("../validators/auth");
const { runValidation } = require("../validators");

//if the validation pass after this control will execute
router.post("/signup", userSignupValidator, runValidation, signup);

//when the user clicks the link
router.post("/account-activation", accountActivation);

//sign in after the user successfully added to our database
router.post("/signin", userSigninValidator, runValidation, signin);

//forgot / reset password
router.put(
  "/forgot-password",
  forgotPasswordValidator,
  runValidation,
  forgotPassword
);
router.put(
  "/reset-password",
  resetPasswordValidator,
  runValidation,
  resetPassword
);

//google and facebook
router.post("/google-login", googleLogin);
router.post("/facebook-login", facebookLogin);

module.exports = router; //it is by default and empty object {}
