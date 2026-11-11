import { Schema, model } from 'mongoose';
import { IPostDocument } from '../types';

const postSchema = new Schema<IPostDocument>(
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

// Index 5: User-specific post listing and aggregation lookup
postSchema.index({ userId: 1, createdAt: -1, _id: -1 });

export const Post = model<IPostDocument>('Post', postSchema);
