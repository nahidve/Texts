import express from "express";
import { signup, login, logout, updateProfile, checkAuth, toggleArchive, togglePin, toggleMute, setWallpaper } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js"; //this is a middleware that checks if the user is logged in or not


const router = express.Router();

router.post("/signup",signup);
router.post("/login",login);
router.post("/logout",logout);

router.put("/update-profile", protectRoute, updateProfile); //protectRoute is a middleware that checks if the user is logged in because you cannot updateProfile if you are not logged in

router.post("/archive", protectRoute, toggleArchive);
router.post("/pin", protectRoute, togglePin);
router.post("/mute", protectRoute, toggleMute);
router.post("/wallpaper", protectRoute, setWallpaper);

router.get("/check", protectRoute, checkAuth); //after login, we can check if the user is logged in or not by using this checkAuth function

export default router;
