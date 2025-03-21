const dotenv = require("dotenv");
dotenv.config();
const http = require("http");
const app = require("./app.js");
const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const projectModel = require("./models/project.model.js");

const port = process.env.PORT || 3000;

const server = http.createServer(app);

const io = socketIO(server , {
    cors : {
        origin : "*"
    }
});

io.use(async (socket , next) => {
    try {

        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(" ")[1];
        const projectId = socket.handshake.query.projectId;

        if(!token) {
            return next(new Error("Socket.io authorization error"));
        }
        if(!projectId) {
            return next(new Error("projectId is not found"))
        }
        if(!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error("Invalid Project"))
        }

        socket.project = await projectModel.findById(projectId);

        const decoded = jwt.verify(token , process.env.JWT_SECRET);

        if(!decoded) {
            return next(new Error("Token authentication error"))
        }

        socket.user = decoded;

        next();


    } catch(err) {
        next(err);
    }
})


io.on('connection', socket => {
    console.log("a user connected");

    socket.roomId = socket.project._id.toString();

    socket.join(socket.roomId);

    socket.on("project-message" , (data)=> {
        console.log(data);
        socket.broadcast.to(socket.roomId).emit("project-message" , data);
    })

    socket.on('event', data => { /* … */ });
    socket.on('disconnect', () => { 
        console.log("user disconnected");
        socket.leave(socket.roomId);
     });
}); 

server.listen(port, ()=> {
    console.log(`server is running on port ${port}`)
})