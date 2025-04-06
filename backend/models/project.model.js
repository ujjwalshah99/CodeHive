const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        lowercase: true,
        required: true,
        trim: true,
        unique: [true , "project name must be unique"]
    },

    users: [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref: "user"
        }
    ],
    fileTree: {
        type: Object,
        default: {}
    }
})

const Project = mongoose.model("project" , projectSchema);

module.exports = Project;