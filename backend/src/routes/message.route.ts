import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsersForSidebar, getMessages, sendMessage } from "../controllers/message.controller.js";

const router=express.Router();

router.get("/users", protectRoute, getUsersForSidebar); //get all users except yourself for the sidebar
router.get("/:id", protectRoute, getMessages); //get messages between two users
router.post("/send/:id", protectRoute, sendMessage); //send a message to a user


export default router;