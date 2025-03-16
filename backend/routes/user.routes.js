const {Router} = require("express");
const userController = require("../controllers/user.controller.js");
const {body} = require("express-validator");
const authMiddleware = require("../middleware/auth.middleware.js");

const router = Router();

router.post("/register" ,
    body("email").isEmail().withMessage("enter a valid email"),
    body("password").isLength({min:6}).withMessage("password must be at least 6 characters long"),
    body("name").isLength({min:1}).withMessage("name must be provided"),
    userController.createUserController 
);

router.post("/login" , 
    body("email").isEmail().withMessage("enter a valid email"),
    body("password").isLength({min:6}).withMessage("password must be at least 6 characters long"),
    userController.loginController
);

router.get("/profile" , authMiddleware , userController.profileController);

router.get("/logout" , authMiddleware , userController.logoutController);

router.get("/all" , authMiddleware , userController.getAllUsers)

module.exports = router;


