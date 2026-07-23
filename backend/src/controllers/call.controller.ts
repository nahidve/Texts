import { Request, Response } from "express";
import Call from "../models/call.model.js";

export const getCallHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;

    const calls = await Call.find({
      $and: [
        {
          $or: [
            { callerId: userId },
            { receiverId: userId },
            { participants: userId },
          ],
        },
        {
          deletedFor: { $ne: userId },
        },
      ],
    })
      .populate("callerId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic")
      .populate("participants", "fullName profilePic")
      .populate("groupId", "name avatar")
      .sort({ createdAt: -1 });

    res.status(200).json(calls);
  } catch (error: any) {
    console.error("Error in getCallHistory controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteCallHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { callId } = req.params;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    call.deletedFor.push(userId);
    await call.save();

    res.status(200).json({ message: "Call history deleted" });
  } catch (error: any) {
    console.error("Error in deleteCallHistory controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const clearAllCallHistory = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id;
        
        await Call.updateMany(
            {
                $or: [
                    { callerId: userId },
                    { receiverId: userId },
                    { participants: userId },
                ]
            },
            {
                $addToSet: { deletedFor: userId }
            }
        );

        res.status(200).json({ message: "All call history cleared" });
    } catch(error: any) {
        console.error("Error in clearAllCallHistory controller: ", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}
