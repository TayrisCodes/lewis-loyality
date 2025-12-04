import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPushSubscription extends Document {
  customerId: mongoose.Types.ObjectId;
  customerPhone: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

const PushSubscriptionSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    customerPhone: {
      type: String,
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    userAgent: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster lookups
PushSubscriptionSchema.index({ customerId: 1, isActive: 1 });
PushSubscriptionSchema.index({ customerPhone: 1, isActive: 1 });

const PushSubscription: Model<IPushSubscription> =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);

export default PushSubscription;




