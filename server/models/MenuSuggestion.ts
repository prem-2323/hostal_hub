import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuSuggestion extends Document {
  hostelBlock: string;
  dishName: string;
  normalizedName: string;
  dayOfWeek?: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
  category: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  type: 'veg' | 'non-veg';
  frequency: 'weekly' | 'monthly' | 'special' | 'trial';
  description?: string;
  allergens?: string[];
  suggestedBy: { userId: mongoose.Types.ObjectId; name: string }[];
  votes: mongoose.Types.ObjectId[]; // User IDs who voted
  voteCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled';
  adminRemarks?: string;
  scheduledDate?: Date;
  weekNumber: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const MenuSuggestionSchema: Schema = new Schema({
  hostelBlock: { type: String, required: true },
  dishName: { type: String, required: true },
  normalizedName: { type: String, required: true }, // Store lowercase, trimmed version for strict duplicate checking
  category: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snacks'], required: true },
  type: { type: String, enum: ['veg', 'non-veg'], required: true },
  frequency: { type: String, enum: ['weekly', 'monthly', 'special', 'trial'], default: 'trial' },

  description: { type: String },
  allergens: [{ type: String }],

  // Track all users who suggested this same dish
  suggestedBy: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    roomNumber: { type: String }
  }],

  // Track all votes
  votes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  voteCount: { type: Number, default: 0 },

  status: { type: String, enum: ['pending', 'approved', 'rejected', 'scheduled'], default: 'pending' },
  adminRemarks: { type: String },
  scheduledDate: { type: Date },

  // Time Cycle Tracking
  weekNumber: { type: Number, required: true },
  year: { type: Number, required: true },
  dayOfWeek: { type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
}, {
  timestamps: true
});

// Compound index for finding duplicates efficiently within a block/week/day
MenuSuggestionSchema.index({ hostelBlock: 1, normalizedName: 1, weekNumber: 1, year: 1, dayOfWeek: 1 });
MenuSuggestionSchema.index({ hostelBlock: 1, voteCount: -1 });

// TTL Index: Auto-delete suggestions after 14 days (14 * 24 * 60 * 60 seconds)
MenuSuggestionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1209600 });

export default mongoose.models.MenuSuggestion || mongoose.model<IMenuSuggestion>('MenuSuggestion', MenuSuggestionSchema);