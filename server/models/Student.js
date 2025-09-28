const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Student name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    socketId: {
        type: String,
        required: [true, 'Socket ID is required'],
        unique: true
    },
    tabId: {
        type: String,
        required: [true, 'Tab ID is required'],
        unique: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    currentPollId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Poll',
        default: null
    }
}, {
    timestamps: true
});

// Index for better query performance
studentSchema.index({ socketId: 1 });
studentSchema.index({ tabId: 1 });
studentSchema.index({ isActive: 1, joinedAt: -1 });
studentSchema.index({ currentPollId: 1 });

// Method to update last seen
studentSchema.methods.updateLastSeen = function () {
    this.lastSeen = new Date();
    return this.save();
};

// Method to mark as inactive
studentSchema.methods.disconnect = function () {
    this.isActive = false;
    this.lastSeen = new Date();
    return this.save();
};

// Static method to find active students
studentSchema.statics.findActiveStudents = function () {
    return this.find({ isActive: true }).sort({ joinedAt: -1 }).exec();
};

// Static method to cleanup inactive students (older than 1 hour)
studentSchema.statics.cleanupInactiveStudents = function () {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.deleteMany({
        $or: [
            { isActive: false, lastSeen: { $lt: oneHourAgo } },
            { lastSeen: { $lt: oneHourAgo } }
        ]
    }).exec();
};

module.exports = mongoose.model('Student', studentSchema);