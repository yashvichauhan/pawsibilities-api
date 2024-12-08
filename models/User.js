/**
 * Model for User
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define schema for User
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  pets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }],
  roleId: {
        type: Number,
        validate: {
            validator: function(value) {
                return value === 1 || value === 2;
            },
            message: 'RoleId must be either 1 (Pet Owner) or 2 (Pet Adopter).'
        }
    },
  roleDescription: {type: String, required: true, trim: true}
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
