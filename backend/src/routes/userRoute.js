import express from "express";
import { authMe, updateMe, updatePassword, deleteMe } from "../controllers/userController.js";

const router = express.Router();
router.get("/me", authMe);
router.put("/me", updateMe);
router.put("/me/password", updatePassword);
router.delete("/me", deleteMe);
export default router;
