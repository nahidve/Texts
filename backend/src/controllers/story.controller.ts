import { Request, Response } from "express";
import Story from "../models/story.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Upload a new story
export const uploadStory = async (req: Request, res: Response) => {
  try {
    const { media, mediaType } = req.body;
    const userId = (req.user!._id as any);

    if (!media || !mediaType) {
      return res.status(400).json({ message: "Media and mediaType are required" });
    }

    // Upload to cloudinary
    const uploadResponse = await cloudinary.uploader.upload_large(media, {
      resource_type: mediaType === "video" ? "video" : "image",
    });

    // Expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const newStory = new Story({
      userId,
      mediaUrl: (uploadResponse as any).secure_url,
      mediaType,
      expiresAt,
    });

    await newStory.save();

    // Populate user info for immediate frontend use
    await newStory.populate("userId", "fullName profilePic");

    // Emit to all users (in a real app, emit only to contacts, but here everyone is connected)
    io.emit("newStory", newStory);

    res.status(201).json(newStory);
  } catch (error) {
    const err = error as any;
    console.error("Error in uploadStory:", err.message);
    if (err.message && err.message.includes("File size too large")) {
      res.status(413).json({ message: "File size too large. The limit is 10MB for images and 100MB for videos." });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

// Get active stories (not expired, not archived)
export const getActiveStories = async (req: Request, res: Response) => {
  try {
    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
      isArchived: false,
    })
      .populate("userId", "fullName profilePic")
      .populate("viewers", "fullName profilePic")
      .populate("reactions.userId", "fullName profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(stories);
  } catch (error) {
    console.error("Error in getActiveStories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user's archived/expired stories
export const getArchivedStories = async (req: Request, res: Response) => {
  try {
    const userId = (req.user!._id as any);

    const stories = await Story.find({
      userId,
      $or: [
        { expiresAt: { $lte: new Date() } },
        { isArchived: true }
      ]
    })
      .populate("viewers", "fullName profilePic")
      .populate("reactions.userId", "fullName profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(stories);
  } catch (error) {
    console.error("Error in getArchivedStories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark story as viewed
export const viewStory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user!._id as any);

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (!story.viewers.includes(userId)) {
      story.viewers.push(userId);
      await story.save();

      // Notify author that someone viewed their story
      const authorSocketId = getReceiverSocketId(story.userId.toString());
      if (authorSocketId) {
        io.to(authorSocketId).emit("storyViewed", { storyId: id, viewerId: userId });
      }
    }

    res.status(200).json({ message: "Story viewed" });
  } catch (error) {
    console.error("Error in viewStory:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// React to a story
export const reactToStory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = (req.user!._id as any);

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Check if user already reacted
    const existingReaction = story.reactions.find((r: any) => r.userId.toString() === userId.toString());
    
    if (existingReaction) {
      existingReaction.emoji = emoji;
    } else {
      story.reactions.push({ userId, emoji } as any);
    }

    await story.save();
    await story.populate("reactions.userId", "fullName profilePic");

    // Notify author of reaction
    const authorSocketId = getReceiverSocketId(story.userId.toString());
    if (authorSocketId) {
      io.to(authorSocketId).emit("storyReacted", { 
        storyId: id, 
        reaction: story.reactions.find((r: any) => r.userId._id.toString() === userId.toString()) 
      });
    }

    res.status(200).json(story);
  } catch (error) {
    console.error("Error in reactToStory:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
