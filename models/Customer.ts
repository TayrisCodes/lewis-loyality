import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  phone: string;
  totalVisits: number;
  lastVisit: Date;
  storeVisits?: any[];
  rewards?: any[];
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    totalVisits: {
      type: Number,
      default: 0,
    },
    lastVisit: {
      type: Date,
      default: Date.now,
    },
    storeVisits: [
      {
        storeId: {
          type: Schema.Types.ObjectId,
          ref: "Store",
        },
        visitCount: {
          type: Number,
          default: 0,
        },
        lastVisit: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    rewards: [
      {
        storeId: {
          type: Schema.Types.ObjectId,
          ref: "Store",
        },
        rewardType: {
          type: String,
          default: "Lewis Gift Card",
        },
        dateIssued: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["unused", "used", "expired"],
          default: "unused",
        },
        usedAt: {
          type: Date,
        },
        expiresAt: {
          type: Date,
        },
      },
    ],
  },
  {
    timestamps: true,
    strictPopulate: false, // Allow populate on nested fields
  }
);

// Indexes - Remove duplicate index since phone is already unique

const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);

export default Customer;



