import { Request, Response } from "express";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import crypto from "crypto";

export const createGroup = async (req: Request, res: Response) => {
    try {
        const { name, description, avatar, memberIds } = req.body;
        const myId = (req.user as any)._id;

        if (!name) return res.status(400).json({ message: "Group name is required" });

        let avatarUrl = "";
        if (avatar) {
            const uploadResponse = await cloudinary.uploader.upload(avatar);
            avatarUrl = uploadResponse.secure_url;
        }

        const joinLink = crypto.randomUUID();

        const members = [
            { user: myId, role: "owner" }
        ];

        if (memberIds && Array.isArray(memberIds)) {
            memberIds.forEach((id: string) => {
                if (id !== myId.toString()) {
                    members.push({ user: id as any, role: "member", joinedAt: new Date() } as any);
                }
            });
        }

        const newGroup = new Group({
            name,
            description,
            avatar: avatarUrl,
            members,
            joinLink
        });

        await newGroup.save();
        
        // Populate before sending back
        const populatedGroup = await Group.findById(newGroup._id).populate("members.user", "-password");
        res.status(201).json(populatedGroup);
    } catch (error) {
        const err = error as Error;
        console.log("Error in createGroup controller: ", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getGroups = async (req: Request, res: Response) => {
    try {
        const myId = (req.user as any)._id;
        const groups = await Group.find({ "members.user": myId }).populate("members.user", "-password");
        res.status(200).json(groups);
    } catch (error) {
        const err = error as Error;
        console.log("Error in getGroups controller: ", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateGroup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, avatar, settings, permissions } = req.body;
        const myId = (req.user as any)._id;

        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const memberInfo = group.members.find(m => m.user.toString() === myId.toString());
        if (!memberInfo || (memberInfo.role !== "owner" && memberInfo.role !== "admin")) {
            return res.status(403).json({ message: "Only owners or admins can update the group" });
        }

        if (name) group.name = name;
        if (description !== undefined) group.description = description;
        if (settings) group.settings = { ...group.settings, ...settings };
        if (permissions) group.permissions = { ...group.permissions, ...permissions };

        if (avatar && !avatar.startsWith("http")) {
            const uploadResponse = await cloudinary.uploader.upload(avatar);
            group.avatar = uploadResponse.secure_url;
        }

        await group.save();
        const populatedGroup = await Group.findById(id).populate("members.user", "-password");
        res.status(200).json(populatedGroup);
    } catch (error) {
        const err = error as Error;
        console.log("Error in updateGroup controller: ", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const addMembers = async (req: Request, res: Response) => {
    try {
        const { id: groupId } = req.params;
        const { memberIds } = req.body;
        const myId = (req.user as any)._id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const isOwnerOrAdmin = group.members.some(m => m.user.toString() === myId.toString() && (m.role === "owner" || m.role === "admin"));
        const canAddMembers = group.permissions.memberCanAddMembers || isOwnerOrAdmin;

        if (!canAddMembers) {
            return res.status(403).json({ message: "You do not have permission to add members" });
        }

        const newMembers = memberIds.filter((id: string) => !group.members.some(m => m.user.toString() === id));
        newMembers.forEach((id: string) => {
            group.members.push({ user: id as any, role: "member", joinedAt: new Date() });
        });

        await group.save();
        const populatedGroup = await Group.findById(group._id).populate("members.user", "-password");
        res.status(200).json(populatedGroup);
    } catch (error) {
        const err = error as Error;
        console.log("Error in addMembers controller: ", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const removeMember = async (req: Request, res: Response) => {
    try {
        const { id: groupId, userId } = req.params;
        const myId = (req.user as any)._id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const isOwnerOrAdmin = group.members.some(m => m.user.toString() === myId.toString() && (m.role === "owner" || m.role === "admin"));
        if (!isOwnerOrAdmin) return res.status(403).json({ message: "Not authorized" });

        group.members = group.members.filter(m => m.user.toString() !== userId);
        await group.save();

        const populatedGroup = await Group.findById(group._id).populate("members.user", "-password");
        res.status(200).json(populatedGroup);
    } catch (error) {
        const err = error as Error;
        console.log("Error in removeMember controller: ", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const joinGroupViaLink = async (req: Request, res: Response) => {
    try {
        const { link } = req.params;
        const myId = (req.user as any)._id;

        const group = await Group.findOne({ joinLink: link });
        if (!group) return res.status(404).json({ message: "Group not found or invalid link" });

        const isMember = group.members.some(m => m.user.toString() === myId.toString());
        if (isMember) {
            return res.status(400).json({ message: "You are already a member" });
        }

        group.members.push({ user: myId as any, role: "member", joinedAt: new Date() } as any);
        await group.save();

        const populatedGroup = await Group.findById(group._id).populate("members.user", "-password");
        res.status(200).json(populatedGroup);
    } catch (error) {
        const err = error as Error;
        console.log("Error in joinGroupViaLink controller: ", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const leaveGroup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const myId = (req.user as any)._id;

        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const memberIndex = group.members.findIndex(m => m.user.toString() === myId.toString());
        if (memberIndex === -1) {
            return res.status(400).json({ message: "You are not a member" });
        }

        if (group.members[memberIndex].role === "owner") {
            return res.status(400).json({ message: "Owner cannot leave without transferring ownership" });
        }

        group.members.splice(memberIndex, 1);
        await group.save();

        res.status(200).json({ message: "Left group successfully" });
    } catch (error) {
        const err = error as Error;
        console.log("Error in leaveGroup controller: ", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
