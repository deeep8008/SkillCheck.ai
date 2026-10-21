const {Router} = require("express");
const authRouter = Router();
const authController = require("../controllers/auth.controller");

authRouter.post("/register",authController.registerUser)
authRouter.post("/login",authController.loginUser)
module.exports = { authRouter };