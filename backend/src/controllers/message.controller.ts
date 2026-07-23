import User from "../models/user.model.js";
import { Request, Response } from "express";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";

//get all users except yourself for the sidebar
export const getUsersForSidebar=async(req:Request, res:Response)=>{
    //get all users except yourself
    try{
        const loggedInUserId = (req.user as any)._id;
        const filteredUsers=await User.find({_id:{$ne:loggedInUserId}}).select("-password"); //this will return all users except the logged in user

        res.status(200).json(filteredUsers); //send the users to the frontend
    }
    catch(error){
        const err=error as Error;
        console.log("Error in getUsersForSidebar controller", err.message);
        res.status(500).json({message:"Internal server error"});
    }
}

//get messages between two users: their history and latest messages
export const getMessages=async(req:Request, res:Response)=>{
    try{
        const {id:userToChatId}=req.params; //this is the id of the user to chat with
        const myId = (req.user as any)._id;

        const messages=await Message.find({ //this will return all messages between the two users
            $or:[ 
                {senderId:myId, receiverId:userToChatId}, 
                {senderId:userToChatId, receiverId:myId}
            ]
        }).sort({createdAt:1}).populate("replyTo", "text image senderId isForwarded"); //this will sort the messages in ascending order of their creation date

        res.status(200).json(messages); //send the messages to the frontend
    }
    catch(error){ //you could build a middleware to specifically handle errors if messages are not found or not rendered but i have kept in simple and basic: if there is an error, we will send a 500 status code and a message to the frontend
        const err=error as Error;
        console.log("Error in getMessages controller", err.message);
        res.status(500).json({message:"Internal server error"});
    }
}

//send a message to a user
export const sendMessage = async (req: Request, res: Response) => {
    try {
      const { text, image, replyTo, isForwarded } = req.body;
      const { id: receiverId } = req.params;
      const senderId = (req.user as any)._id;
  
      if (!text && !image) {
        return res.status(400).json({ message: "Text or image is required" });
      }
  
      let imageUrl;
      if (image) {
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
      }
  
      const newMessage = new Message({
        senderId,
        receiverId,
        text,
        image: imageUrl,
        replyTo: replyTo || null,
        isForwarded: isForwarded || false,
      });
  
      await newMessage.save();
      await newMessage.populate("replyTo", "text image senderId isForwarded");
  
      // Emit to receiver and sender (rooms are their user IDs)
      io.to(receiverId as string).emit("newMessage", newMessage);
      io.to(senderId as string).emit("newMessage", newMessage);
  
      res.status(201).json(newMessage);
    } catch (error) {
        const err=error as Error;
        console.log("Error in sendMessage controller", err.message);
        res.status(500).json({message:"Internal server error"});
    }
  };

export const getGroupMessages = async (req: Request, res: Response) => {
    try {
        const { id: groupId } = req.params;
        const messages = await Message.find({ groupId }).sort({ createdAt: 1 }).populate("replyTo", "text image senderId isForwarded");
        res.status(200).json(messages);
    } catch (error) {
        const err = error as Error;
        console.log("Error in getGroupMessages controller", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const sendGroupMessage = async (req: Request, res: Response) => {
    try {
        const { text, image, mentions, poll, replyTo, isForwarded } = req.body;
        const { id: groupId } = req.params;
        const senderId = (req.user as any)._id;

        if (!text && !image && !poll) {
            return res.status(400).json({ message: "Text, image, or poll is required" });
        }

        let imageUrl;
        if (image && !image.startsWith("http")) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        } else if (image) {
            imageUrl = image;
        }

        const newMessage = new Message({
            senderId,
            groupId,
            text,
            image: imageUrl,
            mentions: mentions || [],
            poll,
            replyTo: replyTo || null,
            isForwarded: isForwarded || false,
        });

        await newMessage.save();
        await newMessage.populate("replyTo", "text image senderId isForwarded");

        // Broadcast to the group room
        io.to(`group_${groupId}`).emit("newGroupMessage", newMessage);

        res.status(201).json(newMessage);
    } catch (error) {
        const err = error as Error;
        console.log("Error in sendGroupMessage controller", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const votePoll = async (req: Request, res: Response) => {
    try {
        const { id: messageId } = req.params;
        const { optionIndex } = req.body;
        const userId = (req.user as any)._id;

        const message = await Message.findById(messageId);
        if (!message || !message.poll) {
            return res.status(404).json({ message: "Poll not found" });
        }

        // Remove previous votes
        message.poll.options.forEach((opt: any) => {
            opt.votes = opt.votes.filter((id: any) => id.toString() !== userId.toString());
        });

        // Add new vote
        if (optionIndex >= 0 && optionIndex < message.poll.options.length) {
            message.poll.options[optionIndex].votes.push(userId);
        }

        await message.save();

        if (message.groupId) {
            io.to(`group_${message.groupId}`).emit("pollUpdated", message);
        } else if (message.receiverId) {
            io.to(message.receiverId.toString()).emit("pollUpdated", message);
            io.to(message.senderId.toString()).emit("pollUpdated", message);
        }

        res.status(200).json(message);
    } catch (error) {
        const err = error as Error;
        console.log("Error in votePoll controller", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const pinMessage = async (req: Request, res: Response) => {
    try {
        const { id: messageId } = req.params;
        const userId = (req.user as any)._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found" });

        if (message.groupId) {
            const group = await Group.findById(message.groupId);
            if (!group) return res.status(404).json({ message: "Group not found" });
            const memberInfo = group.members.find(m => m.user.toString() === userId.toString());
            const canPin = group.permissions.memberCanPinMessages || (memberInfo && (memberInfo.role === "admin" || memberInfo.role === "owner"));
            if (!canPin) return res.status(403).json({ message: "Not authorized to pin messages in this group" });
        }

        message.isPinned = !message.isPinned;
        await message.save();

        if (message.groupId) {
            io.to(`group_${message.groupId}`).emit("messageUpdated", message);
        } else if (message.receiverId) {
            io.to(message.receiverId.toString()).emit("messageUpdated", message);
            io.to(message.senderId.toString()).emit("messageUpdated", message);
        }

        res.status(200).json(message);
    } catch (error) {
        const err = error as Error;
        console.log("Error in pinMessage controller", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const editMessage = async (req: Request, res: Response) => {
    try {
        const { id: messageId } = req.params;
        const { text } = req.body;
        const userId = (req.user as any)._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found" });

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only edit your own messages" });
        }

        message.text = text;
        message.isEdited = true;
        await message.save();

        if (message.groupId) {
            io.to(`group_${message.groupId}`).emit("messageUpdated", message);
        } else if (message.receiverId) {
            io.to(message.receiverId.toString()).emit("messageUpdated", message);
            io.to(message.senderId.toString()).emit("messageUpdated", message);
        }

        res.status(200).json(message);
    } catch (error) {
        const err = error as Error;
        console.log("Error in editMessage controller", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const reactToMessage = async (req: Request, res: Response) => {
    try {
        const { id: messageId } = req.params;
        const { emoji } = req.body;
        const userId = (req.user as any)._id;

        if (!emoji) return res.status(400).json({ message: "Emoji is required" });

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found" });

        if (!message.reactions) {
            message.reactions = [];
        }

        const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);
        if (reactionIndex > -1) {
            const userIndex = message.reactions[reactionIndex].users.findIndex(id => id.toString() === userId.toString());
            if (userIndex > -1) {
                // User already reacted with this emoji, so remove them
                message.reactions[reactionIndex].users.splice(userIndex, 1);
                // If no users left for this emoji, remove the emoji reaction entirely
                if (message.reactions[reactionIndex].users.length === 0) {
                    message.reactions.splice(reactionIndex, 1);
                }
            } else {
                // Add user to existing emoji reaction
                message.reactions[reactionIndex].users.push(userId);
            }
        } else {
            // New emoji reaction
            message.reactions.push({ emoji, users: [userId] });
        }

        await message.save();

        if (message.groupId) {
            io.to(`group_${message.groupId}`).emit("messageUpdated", message);
        } else if (message.receiverId) {
            io.to(message.receiverId.toString()).emit("messageUpdated", message);
            io.to(message.senderId.toString()).emit("messageUpdated", message);
        }

        res.status(200).json(message);
    } catch (error) {
        const err = error as Error;
        console.log("Error in reactToMessage controller", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteMessageForMe = async (req: Request, res: Response) => {
    try {
        const { id: messageId } = req.params;
        const userId = (req.user as any)._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found" });

        if (!message.deletedFor) message.deletedFor = [];
        
        if (!message.deletedFor.includes(userId)) {
            message.deletedFor.push(userId);
            await message.save();
        }

        res.status(200).json({ message: "Message deleted for you", messageId });
    } catch (error) {
        const err = error as Error;
        console.log("Error in deleteMessageForMe controller", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteMessageForEveryone = async (req: Request, res: Response) => {
    try {
        const { id: messageId } = req.params;
        const userId = (req.user as any)._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found" });

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only delete your own messages for everyone" });
        }

        await Message.findByIdAndDelete(messageId);

        // Emit deletion to clients
        if (message.groupId) {
            io.to(`group_${message.groupId}`).emit("messageDeleted", messageId);
        } else if (message.receiverId) {
            io.to(message.receiverId.toString()).emit("messageDeleted", messageId);
            io.to(message.senderId.toString()).emit("messageDeleted", messageId);
        }

        res.status(200).json({ message: "Message deleted for everyone", messageId });
    } catch (error) {
        const err = error as Error;
        console.log("Error in deleteMessageForEveryone controller", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
