import mongoose, { Document, Model } from "mongoose";

export interface UserType extends Document {
    email: string;
    fullName: string;
    password: string;
    profilePic?: string;
    lastSeen?: Date;
}

const userSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true,
    },
    fullName:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true,
        minlength:6,
    },
    profilePic:{
        type:String,
        default:""
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
}, {timestamps:true}
);

const User: Model<UserType> = mongoose.model<UserType>("User", userSchema);

export default User;