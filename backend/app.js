const express = require("express");
const morgan = require("morgan")
const connect = require("./db/db.js")
const userRoutes = require("./routes/user.routes.js")
const projectRoutes = require("./routes/project.routes.js");
const aiRoutes = require("./routes/ai.routes.js");
const cookieParser = require("cookie-parser");
const cors = require("cors");

connect();
const app = express();

app.use(cors());

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.use("/users" , userRoutes);
app.use("/projects" , projectRoutes);
app.use("/ai" , aiRoutes);


app.get("/" , (req,res)=> {
    res.send("Hi Ujjwal");
});

module.exports = app;