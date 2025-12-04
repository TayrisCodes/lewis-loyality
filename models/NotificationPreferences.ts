import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotificationPreferences extends Document {
  customerId: mongoose.Types.ObjectId;
  customerPhone: string;
  receiptAccepted: boolean;
  receiptRejected: boolean;
  rewardMilestone: boolean;
  rewardAvailable: boolean;
  visitPeriodReminder: boolean;
  periodReset: boolean;
  manualReviewComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationPreferencesSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
      index: true,
    },
    customerPhone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    receiptAccepted: {
      type: Boolean,
      default: true,
    },
    receiptRejected: {
      type: Boolean,
      default: true,
    },
    rewardMilestone: {
      type: Boolean,
      default: true,
    },
    rewardAvailable: {
      type: Boolean,
      default: true,
    },
    visitPeriodReminder: {
      type: Boolean,
      default: true,
    },
    periodReset: {
      type: Boolean,
      default: true,
    },
    manualReviewComplete: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const NotificationPreferences: Model<INotificationPreferences> =
  mongoose.models.NotificationPreferences ||
  mongoose.model<INotificationPreferences>(
    "NotificationPreferences",
    NotificationPreferencesSchema
  );

export default NotificationPreferences;




