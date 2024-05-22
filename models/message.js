const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    content: { type: String },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Sender
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Recipient
    timestamp: { type: Date, default: Date.now }, // Time of message creation
    read: { type: Boolean, default: false }, // Indicates whether the message has been delivered
    image: { type: String } // Path to any image attached to the message
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
