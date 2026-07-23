import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getCallHistory, deleteCallHistory, clearAllCallHistory } from "../controllers/call.controller.js";

const router = express.Router();

router.get("/history", protectRoute, getCallHistory);
router.delete("/history/:callId", protectRoute, deleteCallHistory);
router.delete("/history", protectRoute, clearAllCallHistory);

export default router;
