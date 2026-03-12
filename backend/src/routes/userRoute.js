import express from "express";
import { authMe, updateMe, updatePassword } from "../controllers/userController.js";

const router = express.Router();
router.get("/me", authMe);
router.put("/me", updateMe);
router.put("/me/password", updatePassword);
export default router;

