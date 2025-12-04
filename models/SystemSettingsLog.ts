import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemSettingsLog extends Document {
  settingsId: mongoose.Types.ObjectId; // Reference to SystemSettings document
  changedBy: mongoose.Types.ObjectId; // Superadmin user who made the change
  changedByEmail: string; // Email for quick reference
  changedByName?: string; // Name for quick reference
  
  // What was changed
  section: 'validationRules' | 'visitLimits' | 'rewardRules' | 'rewardSettings' | 'all'; // Which section changed
  field?: string; // Specific field name that changed
  
  // Change details
  changes: {
    before: any; // Previous value(s)
    after: any; // New value(s)
    description?: string; // Human-readable description
  };
  
  // Additional context
  action: 'create' | 'update' | 'delete'; // Type of action
  ipAddress?: string; // IP address of the requester (optional)
  userAgent?: string; // User agent string (optional)
  
  createdAt: Date; // Auto timestamp
}

const SystemSettingsLogSchema = new Schema(
  {
    settingsId: {
      type: Schema.Types.ObjectId,
      ref: 'SystemSettings',
      required: true,
      index: true
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    changedByEmail: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    changedByName: {
      type: String,
      required: false,
      trim: true
    },
    section: {
      type: String,
      enum: ['validationRules', 'visitLimits', 'rewardRules', 'rewardSettings', 'all'],
      required: true,
      index: true
    },
    field: {
      type: String,
      required: false
    },
    changes: {
      before: {
        type: Schema.Types.Mixed,
        required: true
      },
      after: {
        type: Schema.Types.Mixed,
        required: true
      },
      description: {
        type: String,
        required: false
      }
    },
    action: {
      type: String,
      enum: ['create', 'update', 'delete'],
      default: 'update',
      required: true
    },
    ipAddress: {
      type: String,
      required: false
    },
    userAgent: {
      type: String,
      required: false
    }
  },
  {
    // Only store createdAt, not updatedAt (logs are immutable)
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'systemsettingslogs' // Explicit collection name
  }
);

// Indexes for efficient querying
SystemSettingsLogSchema.index({ settingsId: 1, createdAt: -1 });
SystemSettingsLogSchema.index({ changedBy: 1, createdAt: -1 });
SystemSettingsLogSchema.index({ section: 1, createdAt: -1 });
SystemSettingsLogSchema.index({ createdAt: -1 }); // For date range queries

// TTL index to auto-delete logs older than 2 years (optional - can be configured)
// Uncomment if you want automatic log cleanup
// SystemSettingsLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

const SystemSettingsLog: Model<ISystemSettingsLog> =
  mongoose.models.SystemSettingsLog || mongoose.model<ISystemSettingsLog>("SystemSettingsLog", SystemSettingsLogSchema);

export default SystemSettingsLog;

