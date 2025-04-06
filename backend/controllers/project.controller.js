const projectModel = require("../models/project.model.js");
const projectService = require("../services/project.service.js");
const {validationResult} = require("express-validator");
const userModel = require("../models/user.model.js");

const createProjectController = async (req , res) => {

    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        return res.status(400).json({
            errors : errors.array()
        });
    }

    try {

        const { name } = req.body;
        const loggedInUser = await userModel.findOne({
            email : req.user.email,
        })

        const userId = loggedInUser._id;

        const newProject = await projectService.createProject({name , userId});

        res.status(201).json({
            newProject
        });
    }
    catch (err) {
        console.log(err , "cannot create new project");
        res.status(400).json({
            error : err
        })
    }    
}

const getAllProjects = async (req , res) => {
    try {

        const loggedInUser = await userModel.findOne({
            email : req.user.email
        })

        const allUserProject = await projectService.getAllProjectByUserId({userId: loggedInUser._id});

        return res.status(200).json({
            projects : allUserProject
        });

    } catch(err) {
        console.log("error is getting all projects");
        console.log(err);
        res.status(400).json({
            error: err.message
        })
    }
}

const addUserToProject = async(req , res) => {
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        return res.status(400).json({
            errors : errors.array()
        })
    }

    try {

        const {projectId , users} = req.body;

        const loggedInUser = await userModel.findOne({
            email : req.user.email
        });


        const project = await projectService.addUsersToProject({
            projectId,
            users,
            userId : loggedInUser._id
        });

        return res.status(200).json({
            project,
        });


    } catch(err) {
        console.log(err);
        res.status(400).json({
            error : err.message
        })
    }
}

const getProjectById = async(req , res) => {
    const { projectId } = req.params;

    try {

        const project = await projectService.getProjectById({projectId});

        return res.status(200).json({
            project
        });
        

    } catch(err) {
        console.log(err);
        res.status(400).json({
            error : err.message
        })
    }
}

const updateFileTree = async(req , res) => {
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {

        const { projectId, fileTree } = req.body;

        const project = await projectService.updateFileTree({
            projectId,
            fileTree
        })

        return res.status(200).json({
            project
        })

    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

module.exports = {
    createProjectController,
    getAllProjects,
    addUserToProject,
    getProjectById,
    updateFileTree
}