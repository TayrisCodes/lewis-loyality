import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStore extends Document {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  dailyCode?: string;
  qrCodeUrl?: string;
  adminId?: mongoose.Types.ObjectId;
  qrToken?: string;
  qrUrl?: string;
  qrExpiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    lat: {
      type: Number,
      required: false,
    },
    lng: {
      type: Number,
      required: false,
    },
    dailyCode: {
      type: String,
      required: false,
    },
    qrCodeUrl: {
      type: String,
      required: false,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    qrToken: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Allow multiple null values
    },
    qrUrl: {
      type: String,
      required: false,
    },
    qrExpiresAt: {
      type: Date,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
StoreSchema.index({ qrToken: 1, qrExpiresAt: 1 });
StoreSchema.index({ isActive: 1 });

const Store: Model<IStore> =
  mongoose.models.Store || mongoose.model<IStore>("Store", StoreSchema);

export default Store;




