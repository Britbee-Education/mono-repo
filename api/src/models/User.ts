import mongoose, { Schema, type InferSchemaType } from "mongoose";

const childSchema = new Schema(
  {
    childName: String,
    dateOfBirth: String,
    level: { type: String, enum: ["beginner", "intermediate", "advanced"] },
    goal: String,
    avatar: {
      body: String,
      stripe: String,
      eyes: String,
      glasses: String,
      hat: String,
      blush: String,
      wings: String,
      back: String,
    },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: { type: String, unique: true, lowercase: true, trim: true, sparse: true },
    passwordHash: { type: String },
    name: { type: String, required: true },
    phone: { type: String, unique: true, sparse: true },
    role: {
      type: String,
      enum: ["learner", "parent", "guide", "superadmin"],
      required: true,
    },
    googleId: String,
    appleId: String,
    facebookId: String,
    // `child` stays as the active child for backwards compatibility.
    child: childSchema,
    // When a parent has multiple siblings, `children` stores them.
    children: { type: [childSchema], default: [] },
    activeChildIndex: { type: Number, default: 0 },
    parentSettings: {
      paused: { type: Boolean, default: false },
      planId: { type: String, enum: ["trial", "monthly", "yearly"], default: "trial" },
      planSince: String,
    },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const User = mongoose.models.User || mongoose.model("User", userSchema);
