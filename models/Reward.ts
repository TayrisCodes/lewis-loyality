import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReward extends Document {
  customerId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  code: string;
  rewardType: string;
  issuedAt: Date;
  expiresAt: Date;
  status: "pending" | "claimed" | "redeemed" | "used" | "expired";
  claimedAt?: Date;
  redeemedAt?: Date;
  usedAt?: Date;
  qrCode?: string; // QR code for discount
  discountPercent?: number; // Discount percentage (e.g., 10)
  discountCode?: string; // Unique discount code
  
  // Tracking fields for reward usage
  usedByAdminId?: mongoose.Types.ObjectId; // Admin who scanned/redeemed the reward
  usedAtStoreId?: mongoose.Types.ObjectId; // Store where reward was used (may differ from storeId where reward was created)
}

const RewardSchema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  rewardType: {
    type: String,
    default: "Lewis Gift Card",
  },
  issuedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "claimed", "redeemed", "used", "expired"],
    default: "pending",
  },
  claimedAt: Date,
  redeemedAt: Date,
  usedAt: Date,
  qrCode: String, // QR code data for discount
  discountPercent: {
    type: Number,
    default: 10, // 10% discount
  },
  discountCode: String, // Unique discount code for redemption
  
  // Tracking fields for reward usage
  usedByAdminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  usedAtStoreId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: false,
  },
});

// Indexes
RewardSchema.index({ customerId: 1 });
RewardSchema.index({ storeId: 1 }); // Index for store-specific rewards
RewardSchema.index({ usedByAdminId: 1, usedAt: -1 }); // Index for admin reward history
RewardSchema.index({ usedAtStoreId: 1, usedAt: -1 }); // Index for store reward usage tracking

const Reward: Model<IReward> =
  mongoose.models.Reward || mongoose.model<IReward>("Reward", RewardSchema);

export default Reward;