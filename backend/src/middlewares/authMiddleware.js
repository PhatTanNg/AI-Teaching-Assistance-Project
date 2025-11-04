import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protectedRoute = async (req, res, next) => {
  try {
    //taje token from headers
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];//bearer token

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    //confirm token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            console.error("Token verification error:", err);
            return res.status(403).json({ message: "Invalid token" });
        }
        //find user by id from token
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        //return user data in req object
        req.user = user;
        next();
    });   
    }catch (err) {
        console.error("Error in auth middleware:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export { protectedRoute };