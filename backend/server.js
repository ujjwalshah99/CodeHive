const dotenv = require("dotenv");
dotenv.config();
const http = require("http");
const app = require("./app.js");
const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 3000;

const server = http.createServer(app);

const io = socketIO(server , {
    cors : {
        origin : "*"
    }
});

io.use((socket , next) => {
    try {

        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(" ")[1];

        if(!token) {
            return next(new Error("Socket.io authorization error"));
        }

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
    socket.on('event', data => { /* … */ });
    socket.on('disconnect', () => { /* … */ });
}); 

server.listen(port, ()=> {
    console.log(`server is running on port ${port}`)
})