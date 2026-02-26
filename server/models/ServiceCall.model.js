import mongoose from 'mongoose';

const serviceCallSchema = new mongoose.Schema(
  {
    callNumber: {
      type: String,
      required: [true, 'Call number is required'],
      unique: true,
      trim: true,
      immutable: true, // Cannot be changed after creation
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FieldServiceAgent',
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in-progress', 'on-hold', 'completed', 'cancelled'],
      default: 'open',
    },
    serviceType: {
      type: String,
      required: [true, 'Service type is required'],
      trim: true,
    },
    scheduledDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    estimatedDuration: {
      type: Number, // in minutes
    },
    actualDuration: {
      type: Number, // in minutes
    },
    serviceLocation: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    internalNotes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate call number if not provided
serviceCallSchema.pre('save', async function (next) {
  if (this.isNew && !this.callNumber) {
    const count = await mongoose.model('ServiceCall').countDocuments();
    this.callNumber = `SC-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Define immutable fields
serviceCallSchema.statics.IMMUTABLE_FIELDS = [
  'callNumber',
  'createdAt',
  '_id',
  'createdBy'
];

// Define editable fields
serviceCallSchema.statics.EDITABLE_FIELDS = [
  'customer',
  'assignedAgent',
  'title',
  'description',
  'priority',
  'status',
  'serviceType',
  'scheduledDate',
  'completedDate',
  'estimatedDuration',
  'actualDuration',
  'serviceLocation',
  'notes',
  'internalNotes'
];

const ServiceCall = mongoose.model('ServiceCall', serviceCallSchema);

export default ServiceCall;
