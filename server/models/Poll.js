const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, 'Poll question is required'],
        trim: true,
        maxlength: [500, 'Question cannot exceed 500 characters']
    },
    options: {
        type: [String],
        required: [true, 'Poll options are required'],
        validate: {
            validator: function (options) {
                return options.length >= 2 && options.length <= 6;
            },
            message: 'Poll must have between 2 and 6 options'
        }
    },
    createdBy: {
        type: String,
        required: [true, 'Creator identification is required'],
        trim: true
    },
    timeLimit: {
        type: Number,
        default: 60,
        min: [10, 'Time limit must be at least 10 seconds'],
        max: [300, 'Time limit cannot exceed 300 seconds']
    },
    isActive: {
        type: Boolean,
        default: false
    },
    startedAt: {
        type: Date,
        default: null
    },
    endedAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for better query performance
pollSchema.index({ isActive: 1, createdAt: -1 });
pollSchema.index({ createdBy: 1, createdAt: -1 });

// Virtual for poll status
pollSchema.virtual('status').get(function () {
    if (this.endedAt) return 'ended';
    if (this.isActive && this.startedAt) return 'active';
    if (this.startedAt && !this.isActive) return 'paused';
    return 'created';
});

// Method to start poll
pollSchema.methods.start = function () {
    this.isActive = true;
    this.startedAt = new Date();
    return this.save();
};

// Method to end poll
pollSchema.methods.end = function () {
    this.isActive = false;
    this.endedAt = new Date();
    return this.save();
};

// Static method to find active poll
pollSchema.statics.findActivePoll = function () {
    return this.findOne({ isActive: true }).exec();
};

module.exports = mongoose.model('Poll', pollSchema);