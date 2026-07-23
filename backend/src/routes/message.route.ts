import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsersForSidebar, getMessages, sendMessage, getGroupMessages, sendGroupMessage, votePoll, pinMessage, editMessage, reactToMessage, deleteMessageForMe, deleteMessageForEveryone } from "../controllers/message.controller.js";

const router=express.Router();

router.get("/users", protectRoute, getUsersForSidebar); //get all users except yourself for the sidebar
router.get("/:id", protectRoute, getMessages); //get messages between two users
router.post("/send/:id", protectRoute, sendMessage); //send a message to a user

router.get("/group/:id", protectRoute, getGroupMessages); //get messages in a group
router.post("/send-group/:id", protectRoute, sendGroupMessage); //send a message to a group
router.post("/:id/vote", protectRoute, votePoll); //vote on a poll

router.put("/:id/pin", protectRoute, pinMessage); //pin or unpin a message
router.put("/:id/edit", protectRoute, editMessage); //edit a message
router.put("/:id/react", protectRoute, reactToMessage); //react to a message
router.delete("/:id/me", protectRoute, deleteMessageForMe); //delete a message for me
router.delete("/:id/everyone", protectRoute, deleteMessageForEveryone); //delete a message for everyone


export default router;