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
            res.status(201).json({
                _id:newUser._id,
                email:newUser.email,
                fullName:newUser.fullName,
                profilePic:newUser.profilePic,
            })
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
        
        res.status(200).json({
            _id:user._id,
            email:user.email,
            fullName:user.fullName,
            profilePic:user.profilePic,
        })
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
        const userId=req.user?._id;

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