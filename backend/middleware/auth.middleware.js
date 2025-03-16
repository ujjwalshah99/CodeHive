const jwt = require("jsonwebtoken");
const redisClient = require("../services/redis.service.js");

const authUser = async (req , res , next) => {
    try {
        const token = req.cookies.token || req.headers.authorization.split(' ')[1];

        if(!token) {
            return res.status(401).json({
                error : "unathorized user"
            })
        }

        const isBlackListed = await redisClient.get(token);

        if(isBlackListed) {
            res.cookie("token" , "");
            return res.status(401).json({
                error : "unathorized user"
            })
        }

        const decoded = jwt.verify(token , process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (err){
        res.status(401).send({
            error : "please authenticate"
        })
    }
}

module.exports = authUser;