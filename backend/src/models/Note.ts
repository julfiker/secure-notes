import { Schema, model } from 'mongoose';
import { INoteDocument } from '../types';

const noteSchema = new Schema<INoteDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ==========================================
// EXPLICIT SCHEMA INDEXES (Required by Spec)
// ==========================================

// Index 3: User-specific note listing (Equality on userId, Sort on createdAt and _id)
noteSchema.index({ userId: 1, createdAt: -1, _id: -1 });

// Index 4: Global note listing for administrators
noteSchema.index({ createdAt: -1, _id: -1 });

export const Note = model<INoteDocument>('Note', noteSchema);
