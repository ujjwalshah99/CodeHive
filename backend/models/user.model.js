const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        minLength: [1 , "name must be provided"]
    },

    email: {
        type: String,
        required : true,
        unique: true,
        trim: true,
        lowercase: true,
        minLength: [6 , "email must be at least 6 characters long"],
        maxLength: [60 , "email must not be more than 60 characters"]
    },

    password: {
        type: String,
        select: false,
        required: true,
        minLength: [6 , "password must at least be 6 characters long"]
    }
})

userSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password , 10);
}

userSchema.methods.isValidPassword = async function (password) {
    return await bcrypt.compare(password , this.password);
}

userSchema.methods.generateJWT = function () {
    return jwt.sign(
        {email: this.email, name:this.name} , 
        process.env.JWT_SECRET,
        {expiresIn: "24h"}
    );
}


const User = mongoose.model("user" , userSchema);

module.exports = User;