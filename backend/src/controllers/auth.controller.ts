import { Request, Response } from "express";
import User from "../models/user.model.js";
import type { UserType } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";


export const signup = async(req: Request, res: Response) => {
    const { email, fullName, password } = req.body;
    try{
        if(!email || !fullName || !password) return res.status(400).json({message:"All fields are required"});
        
        if(password.length < 6) return res.status(400).json({message:"Password must be at least 6 characters long"});

        const user=await User.findOne({email});
        if(user) return res.status(400).json({message:"Email already exists"});

        const salt=await bcrypt.genSalt(10);
        const hashedPassword=await bcrypt.hash(password,salt);

        const newUser=new User({
            email,
            fullName,
            password:hashedPassword
        }) as UserType ;
        
        if(newUser){
            //generate jwt token here defined by a function generateToken()
            generateToken((newUser._id as string), res);
            await newUser.save();
            const savedUser = await User.findById(newUser._id).select("-password");
            res.status(201).json(savedUser);
        } else{res.status(400).json({message:"Invalid user data"});}

    }catch(error){
        const err=error as Error;
        console.log("Error signup controller", err.message);
        res.status(500).json({message:"Internal server error"});
    }
};

export const login = async(req: Request, res: Response) => {
    const { email, password } = req.body;
    
    try{
        const user=await User.findOne({email}) as UserType;
        if(!user) return res.status(400).json({message:"Invalid credentials"}); //so that malicious users cannot guess the email or password, which one of them is incorrect

        const isPasswordCorrect=await bcrypt.compare(password, user.password);
        if(!isPasswordCorrect) return res.status(400).json({message:"Invalid credentials"}); //so that malicious users cannot guess the email or password, which one of them is incorrect

        generateToken((user._id as string), res);
        
        const userWithoutPassword = await User.findById(user._id).select("-password");
        res.status(200).json(userWithoutPassword);
    }catch(error){
        const err=error as Error;
        console.log("Error in login controller", err.message);
        res.status(500).json({message:"Internal server error"});
    }
};

export const logout = (req: Request, res: Response) => {
    try{
        res.cookie("jwt", "", {
            maxAge: 0,
            httpOnly: true,
            sameSite: process.env.NODE_ENV !== "development" ? "none" : "strict",
            secure: process.env.NODE_ENV !== "development",
        });
        res.status(200).json({message:"Logged out successfully"});
    }catch(error){
        const err=error as Error;
        console.log("Error in logout controller", err.message);
        res.status(500).json({message:"Internal server error"});
    }
};

//IMAGE UPLOADING
export const updateProfile = async(req: Request, res: Response) => { //upload images to complete the profile
    try{
        const {profilePic}=req.body;
        const userId=(req.user!._id as any);

        if(!profilePic) return res.status(400).json({message:"Profile picture is required"});

        const uploadResponse=await cloudinary.uploader.upload(profilePic);

        const updatedUser=await User.findByIdAndUpdate(userId, {profilePic:uploadResponse.secure_url}, {new:true}); //update DB after uploading the profile picture

        res.status(200).json(updatedUser)

    }catch(error){
        const err=error as Error;
        console.log("Error in updateProfile controller", err.message);
        res.status(500).json({message:"Internal server error"});
    }
}

// checkAuth actually sends the user data to the frontend unlike just middleware which just checks if the user is logged in or not
export const checkAuth = async(req: Request, res: Response) => {
    try{
        res.status(200).json(req.user);
    }
    catch(error){
        const err=error as Error;
        console.log("Error in checkAuth controller", err.message);
        res.status(500).json({message:"Internal server error"});
    }
}

export const toggleArchive = async (req: Request, res: Response) => {
    try {
        const { targetId, isGroup } = req.body;
        const userId = (req.user!._id as any);

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Initialize arrays if they don't exist
        if (!user.archivedChats) user.archivedChats = [];
        if (!user.archivedGroups) user.archivedGroups = [];

        const isAlreadyArchived = isGroup
            ? user.archivedGroups.some((id: any) => id.toString() === targetId.toString())
            : user.archivedChats.some((id: any) => id.toString() === targetId.toString());
        
        if (isAlreadyArchived) {
            // Unarchive
            if (isGroup) {
                user.archivedGroups = user.archivedGroups.filter((id: any) => id.toString() !== targetId.toString());
            } else {
                user.archivedChats = user.archivedChats.filter((id: any) => id.toString() !== targetId.toString());
            }
        } else {
            // Archive
            if (isGroup) {
                user.archivedGroups.push(targetId);
            } else {
                user.archivedChats.push(targetId);
            }
        }
        await user.save();
        res.status(200).json({ archivedChats: user.archivedChats, archivedGroups: user.archivedGroups });
    } catch (error: any) {
        console.log("Error in toggleArchive controller", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const togglePin = async (req: Request, res: Response) => {
    try {
        const { targetId, isGroup } = req.body;
        const userId = (req.user!._id as any);

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Initialize arrays if they don't exist
        if (!user.pinnedChats) user.pinnedChats = [];
        if (!user.pinnedGroups) user.pinnedGroups = [];

        const isAlreadyPinned = isGroup
            ? user.pinnedGroups.some((id: any) => id.toString() === targetId.toString())
            : user.pinnedChats.some((id: any) => id.toString() === targetId.toString());
        
        if (isAlreadyPinned) {
            // Unpin
            if (isGroup) {
                user.pinnedGroups = user.pinnedGroups.filter((id: any) => id.toString() !== targetId.toString());
            } else {
                user.pinnedChats = user.pinnedChats.filter((id: any) => id.toString() !== targetId.toString());
            }
        } else {
            // Pin
            if (isGroup) {
                user.pinnedGroups.push(targetId);
            } else {
                user.pinnedChats.push(targetId);
            }
        }
        await user.save();
        res.status(200).json({ pinnedChats: user.pinnedChats, pinnedGroups: user.pinnedGroups });
    } catch (error: any) {
        console.log("Error in togglePin controller", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const toggleMute = async (req: Request, res: Response) => {
    try {
        const { targetId, isGroup, hours } = req.body;
        const userId = (req.user!._id as any);

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const targetModel = isGroup ? "Group" : "User";
        
        const muteIndex = user.mutedChats.findIndex(c => c.chatId.toString() === targetId.toString() && c.chatModel === targetModel);
        
        if (muteIndex > -1) {
            if (!hours) {
                user.mutedChats.splice(muteIndex, 1);
            } else {
                const muteUntil = new Date();
                muteUntil.setHours(muteUntil.getHours() + hours);
                user.mutedChats[muteIndex].mutedUntil = muteUntil;
            }
        } else if (hours) {
            const muteUntil = new Date();
            if (hours === -1) { 
                muteUntil.setFullYear(muteUntil.getFullYear() + 100);
            } else {
                muteUntil.setHours(muteUntil.getHours() + hours);
            }
            user.mutedChats.push({ chatId: targetId, chatModel: targetModel, mutedUntil: muteUntil });
        }

        await user.save();
        res.status(200).json({ mutedChats: user.mutedChats });
    } catch (error) {
        const err = error as Error;
        console.log("Error in toggleMute controller", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const setWallpaper = async (req: Request, res: Response) => {
    try {
        const { targetId, isGroup, url } = req.body;
        const userId = (req.user!._id as any);

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const targetModel = isGroup ? "Group" : "User";
        
        const wpIndex = user.wallpapers.findIndex(c => c.chatId === targetId && c.chatModel === targetModel);
        
        if (!url) {
            if (wpIndex > -1) user.wallpapers.splice(wpIndex, 1);
        } else {
            if (wpIndex > -1) {
                user.wallpapers[wpIndex].url = url;
            } else {
                user.wallpapers.push({ chatId: targetId, chatModel: targetModel, url });
            }
        }

        await user.save();
        res.status(200).json({ wallpapers: user.wallpapers });
    } catch (error) {
        const err = error as Error;
        console.log("Error in setWallpaper controller", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
