const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    pollId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Poll',
        required: [true, 'Poll ID is required']
    },
    studentId: {
        type: String,
        required: [true, 'Student ID is required']
    },
    studentName: {
        type: String,
        required: [true, 'Student name is required'],
        trim: true
    },
    answer: {
        type: String,
        required: [true, 'Answer is required'],
        trim: true
    },
    answerIndex: {
        type: Number,
        required: [true, 'Answer index is required'],
        min: 0
    },
    answeredAt: {
        type: Date,
        default: Date.now
    },
    responseTime: {
        type: Number, // Time taken to answer in seconds
        required: true
    }
}, {
    timestamps: true
});

// Compound index to ensure one response per student per poll
responseSchema.index({ pollId: 1, studentId: 1 }, { unique: true });

// Other indexes for better query performance
responseSchema.index({ pollId: 1, answeredAt: -1 });
responseSchema.index({ studentId: 1, answeredAt: -1 });
responseSchema.index({ answer: 1 });

// Static method to get poll results
responseSchema.statics.getPollResults = function (pollId) {
    return this.aggregate([
        { $match: { pollId: new mongoose.Types.ObjectId(pollId) } },
        {
            $group: {
                _id: '$answer',
                count: { $sum: 1 },
                answerIndex: { $first: '$answerIndex' },
                responses: {
                    $push: {
                        studentName: '$studentName',
                        answeredAt: '$answeredAt',
                        responseTime: '$responseTime'
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                answer: '$_id',
                answerIndex: 1,
                count: 1,
                responses: 1
            }
        },
        { $sort: { answerIndex: 1 } }
    ]).exec();
};

// Static method to get response statistics
responseSchema.statics.getResponseStats = function (pollId) {
    return this.aggregate([
        { $match: { pollId: new mongoose.Types.ObjectId(pollId) } },
        {
            $group: {
                _id: null,
                totalResponses: { $sum: 1 },
                averageResponseTime: { $avg: '$responseTime' },
                fastestResponse: { $min: '$responseTime' },
                slowestResponse: { $max: '$responseTime' },
                firstResponse: { $min: '$answeredAt' },
                lastResponse: { $max: '$answeredAt' }
            }
        }
    ]).exec();
};

// Method to check if student already responded
responseSchema.statics.hasStudentResponded = function (pollId, studentId) {
    return this.exists({ pollId, studentId }).exec();
};

module.exports = mongoose.model('Response', responseSchema);