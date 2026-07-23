import jwt from "jsonwebtoken";
import { Response } from "express";
import dotenv from "dotenv";
dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if(!jwtSecret) throw new Error("JWT_SECRET is not defined in .env");

export const generateToken = (userId: string, res:Response) => {
    const token = jwt.sign({userId}, jwtSecret, 
        {expiresIn:"7d"});

res.cookie("jwt", token, { //sending the token to the client in the form of a cookie
    maxAge:7*24*60*60*1000,
    httpOnly:true, //prevents XSS attacks which is a type of attack where the attacker injects malicious scripts into the website
    sameSite: process.env.NODE_ENV !== "development" ? "none" : "strict",
    secure: process.env.NODE_ENV !== "development",
})

return token;
};