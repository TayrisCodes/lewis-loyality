import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "superadmin" | "admin";
  storeId?: mongoose.Types.ObjectId;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
    },
    role: {
      type: String,
      enum: ["superadmin", "admin"],
      default: "admin",
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: false, // Will be validated in pre-save hook for admin role
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

// Validation: Require storeId for admin role
UserSchema.pre('save', function(next) {
  if (this.role === 'admin' && !this.storeId) {
    next(new Error('Store assignment is required for admin users'));
  } else {
    next();
  }
});

// Indexes
UserSchema.index({ email: 1, role: 1 });

const User: Model<IUser> =
  mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);

export default User;




