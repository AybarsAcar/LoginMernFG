//import express to use its router
const express = require("express");
const router = express.Router();
//import controllers
const { requireSignin, adminMiddleware } = require("../controllers/auth");
const { read, update } = require("../controllers/user");

//if the validation pass after this control will execute
router.get("/user/:id", requireSignin, read);

//updating the user profile
router.put("/user/update", requireSignin, update);
//admin update
router.put("/admin/update", requireSignin, adminMiddleware, update);


module.exports = router; //it is by default and empty object {}
