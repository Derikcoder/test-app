import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      immutable: true, // Cannot be updated after creation
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      immutable: true, // Cannot be updated after creation
    },
    businessRegistrationNumber: {
      type: String,
      required: [true, 'Business registration number is required'],
      trim: true,
      immutable: true, // Cannot be updated after creation
    },
    taxNumber: {
      type: String,
      required: [true, 'Tax number is required'],
      trim: true,
    },
    vatNumber: {
      type: String,
      required: [true, 'VAT number is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    physicalAddress: {
      type: String,
      required: [true, 'Physical address is required'],
      trim: true,
    },
    websiteAddress: {
      type: String,
      trim: true,
      default: '',
    },
    isSuperUser: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Define immutable fields that cannot be updated
userSchema.statics.IMMUTABLE_FIELDS = [
  'userName',
  'businessName',
  'businessRegistrationNumber',
  'createdAt',
  '_id',
  'isSuperUser' // Protect super user status
];

// Define editable fields
userSchema.statics.EDITABLE_FIELDS = [
  'email',
  'password',
  'taxNumber',
  'vatNumber',
  'phoneNumber',
  'physicalAddress',
  'websiteAddress',
  'isActive'
];

const User = mongoose.model('User', userSchema);

export default User;
