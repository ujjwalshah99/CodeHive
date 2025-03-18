const dotenv = require("dotenv");
dotenv.config();
const http = require("http");
const app = require("./app.js");
const socketIO = require("socket.io");

const port = process.env.PORT || 3000;

const server = http.createServer(app);

const io = socketIO(server);

io.on('connection', socket => {
  socket.on('event', data => { /* … */ });
  socket.on('disconnect', () => { /* … */ });
}); 

server.listen(port, ()=> {
    console.log(`server is running on port ${port}`)
})