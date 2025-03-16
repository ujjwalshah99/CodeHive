const userModel = require("../models/user.model.js");

const createUser = async({name , email , password}) => {
    if(!name || !email || !password) {
        throw new Error("Email and password are required");
    }

    const hashedPassword = await userModel.hashPassword(password);

    const user = await userModel.create({
        name,
        email,
        password: hashedPassword
    });

    return user;
}

const getAllUser = async({userId}) => {
    const users = await userModel.find({
        _id : { $ne : userId }
    });
    return users;
}

module.exports = {
    createUser,
    getAllUser
}