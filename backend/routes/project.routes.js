const {Router} = require("express");
const {body } = require("express-validator");
const projectController = require("../controllers/project.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = Router();

router.post("/create" ,
    authMiddleware,
    body("name").isString().withMessage("name is required"),
    projectController.createProjectController
)

router.get('/all' , 
    authMiddleware,
    projectController.getAllProjects
)

router.put("/add-user" , 
    authMiddleware,
    body('projectId').isString().withMessage('Project ID is required'),
    body('users').isArray({ min: 1 }).withMessage('Users must be an array of strings').bail()
        .custom((users) => users.every(user => typeof user === 'string')).withMessage('Each user must be a string'),
    projectController.addUserToProject
)

router.get("/get-project/:projectId" , 
    authMiddleware,
    projectController.getProjectById
)

router.put("/update-file-tree" , 
    authMiddleware,
    body("projectId").isString().withMessage("project ID is required"),
    body("fileTree").isObject().withMessage("file tree is required"),
    projectController.updateFileTree
)

router.put("/remove-user" , 
    authMiddleware,
    body('projectId').isString().withMessage('Project ID is required'),
    body('users').isArray({ min: 1 }).withMessage('Users must be an array of strings').bail()
        .custom((users) => users.every(user => typeof user === 'string')).withMessage('Each user must be a string'),
    projectController.removeUserFromProject
)

router.delete("/delete" , 
    authMiddleware,
    body("projectId").isString().withMessage("project ID is required"),
    projectController.deleteProjectController
)

module.exports = router;