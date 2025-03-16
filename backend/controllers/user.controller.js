const userService= require("../services/user.service.js");
const userModel = require("../models/user.model.js");
const {validationResult, Result} = require("express-validator");
const redisClient = require("../services/redis.service.js");

const createUserController = async (req , res) => {
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        return res.status(400).json({
            errors : errors.array()
        });
    }

    try {
        const user = await userService.createUser(req.body);
        delete user._doc.password;

        const token = user.generateJWT();

        res.status(201).json({
            user,
            token
        })
    } catch (err) {
        res.status(400).json({
            error : err
        });
    }
}


const loginController = async (req,res) => {
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    try {
        const {email , password} = req.body;

        const user = await userModel.findOne({
            email: email
        }).select("+password");

        if(!user) {
            return res.status(401).json({
                error : "invalid credentials"
            })
        }

        const isMatch = await user.isValidPassword(password);

        if(!isMatch) {
            return res.status(401).json({
                error: "invalid credentials"
            })
        }

        delete user._doc.password;

        const token = await user.generateJWT();

        res.status(200).json({
            user,
            token
        });

    } catch (err) {
        res.status(400).json({
            error : err
        })
    }
}


const profileController = async function(req , res) {
    res.status(200).json({
        user : req.user
    })
}


const logoutController = async (req , res) => {
    try {

        const token = req.cookies.token || req.headers.authorization.split(" ")[1];

        await redisClient.set(token, "logout" , "EX" , 60*60*24);

        res.status(200).json({
            message : "logged out successfully"
        })

    } catch (err) {
        console.log("unable to logout");
        res.status(400).json({
            error : err
        })
    }
}

const getAllUsers = async(req , res) => {
    try {

        const loggedInUser = await userModel.findOne({
            email : req.user.email
        });

        const allUsers = await userService.getAllUser({userId : loggedInUser._id});

        return res.status(200).json({
            users : allUsers
        });


    } catch (err) {
        console.log(err);
        res.status(400).json({
            error : err.message
        })
    }
}


module.exports = {
    createUserController,
    loginController,
    profileController,
    logoutController,
    getAllUsers
}