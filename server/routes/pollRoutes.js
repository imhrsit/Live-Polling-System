const express = require('express');
const { Poll, Response } = require('../models');
const router = express.Router();

// POST /api/polls/create - Create a new poll
router.post('/create', async (req, res) => {
    try {
        const { question, options, createdBy, timeLimit } = req.body;

        // Validation
        if (!question || !options || !createdBy) {
            return res.status(400).json({
                success: false,
                message: 'Question, options, and createdBy are required'
            });
        }

        if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
            return res.status(400).json({
                success: false,
                message: 'Options must be an array with 2-6 items'
            });
        }

        // Check if there's already an active poll
        const activePoll = await Poll.findActivePoll();
        if (activePoll) {
            return res.status(409).json({
                success: false,
                message: 'There is already an active poll. Please end it first.'
            });
        }

        // Create new poll
        const poll = new Poll({
            question: question.trim(),
            options: options.map(opt => opt.trim()),
            createdBy: createdBy.trim(),
            timeLimit: timeLimit || 60
        });

        await poll.save();

        // Emit to all connected clients
        req.io.emit('poll-created', {
            poll: {
                id: poll._id,
                question: poll.question,
                options: poll.options,
                timeLimit: poll.timeLimit,
                createdBy: poll.createdBy,
                createdAt: poll.createdAt
            }
        });

        res.status(201).json({
            success: true,
            message: 'Poll created successfully',
            poll: {
                id: poll._id,
                question: poll.question,
                options: poll.options,
                timeLimit: poll.timeLimit,
                createdBy: poll.createdBy,
                createdAt: poll.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating poll:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create poll',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/polls/active - Get currently active poll
router.get('/active', async (req, res) => {
    try {
        const activePoll = await Poll.findActivePoll();

        if (!activePoll) {
            return res.status(404).json({
                success: false,
                message: 'No active poll found'
            });
        }

        // Get response count for the active poll
        const responseCount = await Response.countDocuments({ pollId: activePoll._id });

        res.json({
            success: true,
            poll: {
                id: activePoll._id,
                question: activePoll.question,
                options: activePoll.options,
                timeLimit: activePoll.timeLimit,
                createdBy: activePoll.createdBy,
                isActive: activePoll.isActive,
                startedAt: activePoll.startedAt,
                createdAt: activePoll.createdAt,
                responseCount
            }
        });

    } catch (error) {
        console.error('Error fetching active poll:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active poll',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/polls/:id/start - Start a poll
router.post('/:id/start', async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'Poll not found'
            });
        }

        if (poll.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Poll is already active'
            });
        }

        await poll.start();

        // Emit poll started event
        req.io.emit('poll-started', {
            pollId: poll._id,
            question: poll.question,
            options: poll.options,
            timeLimit: poll.timeLimit,
            startedAt: poll.startedAt
        });

        res.json({
            success: true,
            message: 'Poll started successfully',
            poll: {
                id: poll._id,
                question: poll.question,
                options: poll.options,
                timeLimit: poll.timeLimit,
                isActive: poll.isActive,
                startedAt: poll.startedAt
            }
        });

    } catch (error) {
        console.error('Error starting poll:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start poll',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/polls/:id/end - End a poll
router.post('/:id/end', async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'Poll not found'
            });
        }

        if (!poll.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Poll is not active'
            });
        }

        await poll.end();

        // Get final results
        const results = await Response.getPollResults(poll._id);
        const stats = await Response.getResponseStats(poll._id);

        // Emit poll ended event with results
        req.io.emit('poll-ended', {
            pollId: poll._id,
            results,
            stats: stats[0] || { totalResponses: 0 },
            endedAt: poll.endedAt
        });

        res.json({
            success: true,
            message: 'Poll ended successfully',
            results,
            stats: stats[0] || { totalResponses: 0 }
        });

    } catch (error) {
        console.error('Error ending poll:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to end poll',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/polls/:id/results - Get poll results
router.get('/:id/results', async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'Poll not found'
            });
        }

        const results = await Response.getPollResults(poll._id);
        const stats = await Response.getResponseStats(poll._id);

        res.json({
            success: true,
            poll: {
                id: poll._id,
                question: poll.question,
                options: poll.options,
                isActive: poll.isActive,
                createdAt: poll.createdAt,
                endedAt: poll.endedAt
            },
            results,
            stats: stats[0] || { totalResponses: 0 }
        });

    } catch (error) {
        console.error('Error fetching poll results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch poll results',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/polls/history - Get poll history (bonus feature)
router.get('/history', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const polls = await Poll.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get response counts for each poll
        const pollsWithCounts = await Promise.all(
            polls.map(async (poll) => {
                const responseCount = await Response.countDocuments({ pollId: poll._id });
                return {
                    ...poll,
                    id: poll._id,
                    responseCount
                };
            })
        );

        const total = await Poll.countDocuments();
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            polls: pollsWithCounts,
            pagination: {
                currentPage: page,
                totalPages,
                totalPolls: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching poll history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch poll history',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;