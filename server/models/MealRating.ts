import mongoose, { Schema, Document } from 'mongoose';

export interface IMealRating extends Document {
    menuItemId: mongoose.Types.ObjectId;  // Link to the specific MessMenu item served
    userId: mongoose.Types.ObjectId;
    hostelBlock: string;
    rating: number; // 1 to 5
    feedback?: string;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    date: Date;
    createdAt: Date;
}

const MealRatingSchema: Schema = new Schema({
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MessMenu', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hostelBlock: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String },
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner'], required: true },
    date: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Prevent duplicate ratings for same meal by same user
MealRatingSchema.index({ userId: 1, menuItemId: 1 }, { unique: true });
// Index for generating reports
MealRatingSchema.index({ hostelBlock: 1, date: 1 });

export default mongoose.models.MealRating || mongoose.model<IMealRating>('MealRating', MealRatingSchema);
