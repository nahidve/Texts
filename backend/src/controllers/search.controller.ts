import { Request, Response } from "express";
import User from "../models/user.model.js";
import Group from "../models/group.model.js";
import Message from "../models/message.model.js";

export const globalSearch = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const currentUserId = (req.user!._id as any);

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: "Search query 'q' is required" });
    }

    const searchRegex = new RegExp(q, 'i');

    // 1. Search Users (excluding current user)
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { fullName: searchRegex },
        { email: searchRegex }
      ]
    }).select('-password').limit(10);

    // 2. Search Groups (where user is member)
    const groups = await Group.find({
      members: currentUserId,
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    }).limit(10);

    // 3. Search Messages
    const userGroups = await Group.find({ members: currentUserId }).select('_id');
    const groupIds = userGroups.map(g => g._id);

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId },
        { receiverId: currentUserId },
        { groupId: { $in: groupIds } }
      ],
      text: searchRegex
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('senderId', 'fullName profilePic')
      .populate('receiverId', 'fullName profilePic')
      .populate('groupId', 'name');

    res.status(200).json({ users, groups, messages });
  } catch (error: any) {
    console.error("Error in globalSearch controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
