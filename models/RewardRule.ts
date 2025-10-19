import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRewardRule extends Document {
  storeId: mongoose.Types.ObjectId;
  visitsNeeded: number;
  rewardValue: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RewardRuleSchema = new Schema(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    visitsNeeded: {
      type: Number,
      required: true,
      default: 5,
    },
    rewardValue: {
      type: String,
      required: true,
      default: "Lewis Gift Card",
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
RewardRuleSchema.index({ storeId: 1 });

const RewardRule: Model<IRewardRule> =
  mongoose.models.RewardRule || mongoose.model<IRewardRule>("RewardRule", RewardRuleSchema);

export default RewardRule;