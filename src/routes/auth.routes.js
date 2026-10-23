const {Router} = require("express");
const authRouter = Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middlewares");

authRouter.post("/register",authController.registerUser);
authRouter.post("/login",authController.loginUser);
authRouter.post("/logout",authController.logoutUser);
authRouter.get("/me",authMiddleware.authUser,authController.getUser)
module.exports = { authRouter };