import jwt from "jsonwebtoken";
import {JwtPayload} from "jsonwebtoken";
import User from "../models/user.model.js";
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
dotenv.config();
import { UserType } from "../models/user.model.js";

//PROTECT ROUTE MIDDLEWARE which checks if the user is logged in or not
export const protectRoute = async(req: Request, res: Response, next: NextFunction) => {


    try{
        const token=req.cookies.jwt;

        if(!token) return res.status(401).json({message:"Unauthorized - No Token Provided"});

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) throw new Error("JWT_SECRET is not defined");
        const decoded = jwt.verify(token, jwtSecret);

        if(!decoded) return res.status(401).json({message:"Unauthorized - Invalid Token"});

        const user=await User.findById((decoded as JwtPayload).userId).select("-password");

        if(!user) return res.status(401).json({message:"Unauthorized - User Not Found"});

        req.user=user as UserType;
        next();

    } catch (error) {
        const err = error as Error;
        console.log("Error in protectRoute middleware:", err.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}