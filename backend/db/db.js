const mongoose = require("mongoose");

function connect () {
    mongoose.connect(process.env.MONGODB_URI)
    .then(()=>{console.log("connected to MOngoDB");})
    .catch((err)=>{console.log(err,"databse connection error")});
}

module.exports = connect