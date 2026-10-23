const {Router} = require("express");
const authRouter = Router();
const authController = require("../controllers/auth.controller");

authRouter.post("/register",authController.registerUser);
authRouter.post("/login",authController.loginUser);
authRouter.post("/logout",authController.logoutUser);
module.exports = { authRouter };