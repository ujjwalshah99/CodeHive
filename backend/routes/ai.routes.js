const { Router } = require("express");
const aiController = require("../controllers/ai.controller");

const router = Router();

router.get("/get-response" , aiController.getResult)

module.exports = router;