import mongoose from 'mongoose';

const fieldServiceAgentSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      immutable: true, // Cannot be changed after creation
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      immutable: true, // Cannot be changed after creation
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      immutable: true, // Cannot be changed after creation
    },
    skills: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on-leave'],
      default: 'active',
    },
    assignedArea: {
      type: String,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
    },
    notes: {
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

// Define immutable fields
fieldServiceAgentSchema.statics.IMMUTABLE_FIELDS = [
  'firstName',
  'lastName',
  'employeeId',
  'createdAt',
  '_id',
  'createdBy'
];

// Define editable fields
fieldServiceAgentSchema.statics.EDITABLE_FIELDS = [
  'email',
  'phoneNumber',
  'skills',
  'status',
  'assignedArea',
  'vehicleNumber',
  'notes'
];

const FieldServiceAgent = mongoose.model('FieldServiceAgent', fieldServiceAgentSchema);

export default FieldServiceAgent;
