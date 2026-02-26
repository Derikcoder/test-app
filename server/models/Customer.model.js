import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      immutable: true, // Cannot be changed after creation
    },
    contactFirstName: {
      type: String,
      required: [true, 'Contact first name is required'],
      trim: true,
    },
    contactLastName: {
      type: String,
      required: [true, 'Contact last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    customerId: {
      type: String,
      required: [true, 'Customer ID is required'],
      unique: true,
      trim: true,
      immutable: true, // Cannot be changed after creation
    },
    physicalAddress: {
      type: String,
      required: [true, 'Physical address is required'],
      trim: true,
    },
    billingAddress: {
      type: String,
      trim: true,
    },
    vatNumber: {
      type: String,
      trim: true,
    },
    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
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
customerSchema.statics.IMMUTABLE_FIELDS = [
  'businessName',
  'customerId',
  'createdAt',
  '_id',
  'createdBy'
];

// Define editable fields
customerSchema.statics.EDITABLE_FIELDS = [
  'contactFirstName',
  'contactLastName',
  'email',
  'phoneNumber',
  'alternatePhone',
  'physicalAddress',
  'billingAddress',
  'vatNumber',
  'accountStatus',
  'notes'
];

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
