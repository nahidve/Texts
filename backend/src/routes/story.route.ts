import express from "express";
import { protectRoute } from "../middleware/auth.middleware";
import { 
  uploadStory, 
  getActiveStories, 
  getArchivedStories, 
  viewStory, 
  reactToStory 
} from "../controllers/story.controller";

const router = express.Router();

router.post("/upload", protectRoute, uploadStory);
router.get("/active", protectRoute, getActiveStories);
router.get("/archived", protectRoute, getArchivedStories);
router.post("/:id/view", protectRoute, viewStory);
router.post("/:id/react", protectRoute, reactToStory);

export default router;
