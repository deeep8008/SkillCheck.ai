const { Router } = require("express");
const { authUser } = require("../middlewares/auth.middlewares");
const { listReports, getReport } = require("../controllers/report.controller");

const reportRouter = Router();
reportRouter.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
reportRouter.use(authUser);
reportRouter.get("/", listReports);
reportRouter.get("/:id", getReport);
module.exports = { reportRouter };
