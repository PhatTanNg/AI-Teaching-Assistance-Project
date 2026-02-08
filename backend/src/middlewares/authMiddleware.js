import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protectedRoute = async (req, res, next) => {
  try {
    //taje token from headers
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];//bearer token

    console.log('[AUTH] Authorization header:', authHeader ? 'present' : 'missing');
    console.log('[AUTH] Token extracted:', token ? 'yes' : 'no');
    console.log('[AUTH] ACCESS_TOKEN_SECRET set:', process.env.ACCESS_TOKEN_SECRET ? 'yes' : 'no');

    if (!token) {
      console.log('[AUTH] Rejecting request: No token provided');
      return res.status(401).json({ message: "No token provided" });
    }
    //confirm token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            console.error("[AUTH] Token verification failed:", err.message);
            console.log('[AUTH] Token (first 20 chars):', token.substring(0, 20) + '...');
            return res.status(403).json({ message: "Invalid token" });
        }
        //find user by id from token
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        //return user data in req object
        req.user = user;
        req.userId = user._id;
        next();
    });   
    }catch (err) {
        console.error("Error in auth middleware:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export { protectedRoute };