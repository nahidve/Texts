import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
    createGroup, 
    getGroups, 
    updateGroup, 
    joinGroupViaLink, 
    leaveGroup,
    addMembers,
    removeMember
} from "../controllers/group.controller.js";

const router = express.Router();

router.get("/", protectRoute, getGroups);
router.post("/", protectRoute, createGroup);
router.put("/:id", protectRoute, updateGroup);
router.post("/join/:link", protectRoute, joinGroupViaLink);
router.delete("/:id/leave", protectRoute, leaveGroup);
router.post("/:id/members", protectRoute, addMembers);
router.delete("/:id/members/:userId", protectRoute, removeMember);

export default router;
