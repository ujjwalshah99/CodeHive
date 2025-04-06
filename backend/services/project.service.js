const projectModel = require("../models/project.model.js");
const mongoose = require("mongoose");

const createProject = async ({name , userId}) => {

    if(!name) {
        throw new Error("name is required");
    }
    if(!userId) {
        throw new Error("user is required");
    }

    let project;
    try {
        project = await projectModel.create({
            name,
            users: [ userId ]
        });
    } catch (error) {
        if (error.code === 11000) {
            throw new Error('Project name already exists');
        }
        throw error;
    }

    return project;

}

const getAllProjectByUserId = async({userId}) => {
    if (!userId) {
        throw new Error("userId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid userId")
    }

    const allUserProject = await projectModel.find({
        users : userId
    })

    return allUserProject;
}

const addUsersToProject = async({projectId , users , userId}) => {
    if(!projectId) {
        throw new Error("projectId is required");
    }

    if(!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("projectId is invalid");
    }

    if(!users) {
        throw new Error("users array is required");
    }

    if(!Array.isArray(users) || users.some(userId => !mongoose.Types.ObjectId.isValid(userId))) {
        throw new Error("Invalid userId(s) in users array")
    }

    if (!userId) {
        throw new Error("userId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid userId")
    }

    const project = await projectModel.findOne({
        _id: projectId,
        users: userId
    })

    if (!project) {
        throw new Error("User not belong to this project")
    }

    const updatedProject = await projectModel.findByIdAndUpdate({
        _id : projectId
    } , {
        $addToSet : {
            users : {
                $each : users
            }
        }
    } , {
        new : true
    })

    return updatedProject;
}

const getProjectById = async({projectId}) => {
    if(!projectId) {
        throw new Error("projectId is required")
    }

    if(!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid ProjectId");
    }

    const project = await projectModel.findById(projectId
    ).populate("users")

    return project;
}

const updateFileTree = async({projectId , fileTree}) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }

    if (!fileTree) {
        throw new Error("fileTree is required")
    }

    const project = await projectModel.findOneAndUpdate({
        _id: projectId
    }, {
        fileTree
    }, {
        new: true
    })

    return project;
}

module.exports = {
    createProject,
    getAllProjectByUserId,
    addUsersToProject,
    getProjectById,
    updateFileTree
};