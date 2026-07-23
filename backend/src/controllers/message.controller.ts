import User from "../models/user.model.js";
import { Request, Response } from "express";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId } from "../lib/socket.js";
import { io } from "../lib/socket.js";

//get all users except yourself for the sidebar
export const getUsersForSidebar=async(req:Request, res:Response)=>{
    //get all users except yourself
    try{
        const loggedInUserId=req.user?._id;
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
        const myId=req.user?._id; //this is the id of the logged in user

        const messages=await Message.find({ //this will return all messages between the two users
            $or:[ 
                {senderId:myId, receiverId:userToChatId}, 
                {senderId:userToChatId, receiverId:myId}
            ]
        }).sort({createdAt:-1}); //this will sort the messages in descending order of their creation date

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
      const { text, image } = req.body;
      const { id: receiverId } = req.params;
      const senderId = req.user?._id;
  
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
      });
  
      await newMessage.save();
  
      // Emit to receiver and sender
      const receiverSocketId = getReceiverSocketId(receiverId as string);
      const senderSocketId = getReceiverSocketId(senderId as string);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("newMessage", newMessage);
      }
  
      res.status(201).json(newMessage);
    } catch (error) {
        const err=error as Error;
        console.log("Error in sendMessage controller", err.message);
        res.status(500).json({message:"Internal server error"});
    }
  };

