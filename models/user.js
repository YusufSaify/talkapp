const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullname: { type: String, required: true },
  password: { type: String, required: true },
  profileimage: { type: String, default: 'default_profile_image.jpg' }, // Default profile image
  about: { type: String },
  undeliveredmessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }], // Reference to undelivered messages
  socketid: { type: String },
  status: { type: Boolean, default: false },
  contacts:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}]
});

const User = mongoose.model('User', userSchema);

module.exports = User;
