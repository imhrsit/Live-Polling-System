const { Poll, Student, Response } = require('../models');

module.exports = (io) => {
    // Store for managing timers
    const pollTimers = new Map();

    // Helper function to broadcast live statistics
    const broadcastLiveStats = async () => {
        try {
            const totalStudents = await Student.countDocuments({ isActive: true });
            const activePoll = await Poll.findActivePoll();
            const totalResponses = activePoll ? await Response.countDocuments({ pollId: activePoll._id }) : 0;

            io.emit('live-stats', {
                totalStudents,
                activePollId: activePoll?._id,
                totalResponses
            });
        } catch (error) {
            console.error('Error broadcasting live stats:', error);
        }
    };

    // Helper function to end poll automatically
    const endPollAutomatically = async (pollId) => {
        try {
            const poll = await Poll.findById(pollId);
            if (poll && poll.isActive) {
                await poll.end();

                // Get final results
                const results = await Response.getPollResults(pollId);
                const stats = await Response.getResponseStats(pollId);

                // Clear timer
                if (pollTimers.has(pollId.toString())) {
                    clearTimeout(pollTimers.get(pollId.toString()));
                    pollTimers.delete(pollId.toString());
                }

                // Broadcast poll ended
                io.emit('poll-ended', {
                    pollId,
                    results,
                    stats: stats[0] || { totalResponses: 0 },
                    endedAt: poll.endedAt,
                    reason: 'timeout'
                });

                console.log(`Poll ${pollId} ended automatically due to timeout`);
            }
        } catch (error) {
            console.error('Error ending poll automatically:', error);
        }
    };

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Send current stats on connection
        broadcastLiveStats();

        // Teacher Events

        // Teacher creates a poll
        socket.on('teacher-create-poll', async (data) => {
            try {
                const { question, options, createdBy, timeLimit } = data;

                // Validate required fields
                if (!question || !options || !createdBy) {
                    socket.emit('error', {
                        message: 'Question, options, and createdBy are required',
                        type: 'validation'
                    });
                    return;
                }

                // Check for active poll
                const activePoll = await Poll.findActivePoll();
                if (activePoll) {
                    socket.emit('error', {
                        message: 'There is already an active poll. Please end it first.',
                        type: 'conflict'
                    });
                    return;
                }

                // Create poll
                const poll = new Poll({
                    question: question.trim(),
                    options: options.map(opt => opt.trim()),
                    createdBy: createdBy.trim(),
                    timeLimit: timeLimit || 60
                });

                await poll.save();

                // Emit to all clients
                io.emit('poll-created', {
                    poll: {
                        id: poll._id,
                        question: poll.question,
                        options: poll.options,
                        timeLimit: poll.timeLimit,
                        createdBy: poll.createdBy,
                        createdAt: poll.createdAt
                    }
                });

                console.log(`📊 Poll created by ${createdBy}: ${question}`);

            } catch (error) {
                console.error('Error in teacher-create-poll:', error);
                socket.emit('error', {
                    message: 'Failed to create poll',
                    type: 'server',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        // Teacher starts a poll
        socket.on('teacher-start-poll', async (data) => {
            try {
                const { pollId } = data;

                if (!pollId) {
                    socket.emit('error', {
                        message: 'Poll ID is required',
                        type: 'validation'
                    });
                    return;
                }

                const poll = await Poll.findById(pollId);
                if (!poll) {
                    socket.emit('error', {
                        message: 'Poll not found',
                        type: 'not_found'
                    });
                    return;
                }

                if (poll.isActive) {
                    socket.emit('error', {
                        message: 'Poll is already active',
                        type: 'conflict'
                    });
                    return;
                }

                // Start the poll
                await poll.start();

                // Set up auto-end timer
                const timeoutId = setTimeout(() => {
                    endPollAutomatically(poll._id);
                }, poll.timeLimit * 1000);

                pollTimers.set(poll._id.toString(), timeoutId);

                // Emit to all clients
                io.emit('poll-started', {
                    pollId: poll._id,
                    question: poll.question,
                    options: poll.options,
                    timeLimit: poll.timeLimit,
                    startedAt: poll.startedAt
                });

                console.log(`▶️ Poll started: ${poll.question} (${poll.timeLimit}s)`);

            } catch (error) {
                console.error('Error in teacher-start-poll:', error);
                socket.emit('error', {
                    message: 'Failed to start poll',
                    type: 'server',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        // Teacher ends a poll
        socket.on('teacher-end-poll', async (data) => {
            try {
                const { pollId } = data;

                if (!pollId) {
                    socket.emit('error', {
                        message: 'Poll ID is required',
                        type: 'validation'
                    });
                    return;
                }

                const poll = await Poll.findById(pollId);
                if (!poll) {
                    socket.emit('error', {
                        message: 'Poll not found',
                        type: 'not_found'
                    });
                    return;
                }

                if (!poll.isActive) {
                    socket.emit('error', {
                        message: 'Poll is not active',
                        type: 'conflict'
                    });
                    return;
                }

                // Clear timer if exists
                if (pollTimers.has(pollId)) {
                    clearTimeout(pollTimers.get(pollId));
                    pollTimers.delete(pollId);
                }

                // End the poll
                await poll.end();

                // Get final results
                const results = await Response.getPollResults(poll._id);
                const stats = await Response.getResponseStats(poll._id);

                // Emit to all clients
                io.emit('poll-ended', {
                    pollId: poll._id,
                    results,
                    stats: stats[0] || { totalResponses: 0 },
                    endedAt: poll.endedAt,
                    reason: 'manual'
                });

                console.log(`⏹️ Poll ended manually: ${poll.question}`);

            } catch (error) {
                console.error('Error in teacher-end-poll:', error);
                socket.emit('error', {
                    message: 'Failed to end poll',
                    type: 'server',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        // Student Events

        // Student joins the session
        socket.on('student-join', async (data) => {
            try {
                const { name, tabId } = data;

                if (!name) {
                    socket.emit('error', {
                        message: 'Student name is required',
                        type: 'validation'
                    });
                    return;
                }

                // Check if student already exists
                let student = await Student.findOne({
                    name: name.trim(),
                    tabId: tabId
                });

                if (student) {
                    // Update existing student
                    student.socketId = socket.id;
                    student.isActive = true;
                    student.lastSeen = new Date();
                    await student.save();
                } else {
                    // Create new student
                    student = new Student({
                        name: name.trim(),
                        socketId: socket.id,
                        tabId: tabId || socket.id
                    });
                    await student.save();
                }

                // Join student to room
                socket.join('students');
                socket.studentId = student._id;
                socket.tabId = student.tabId;

                // Emit to all clients
                io.emit('student-joined', {
                    student: {
                        id: student._id,
                        name: student.name,
                        joinedAt: student.joinedAt
                    },
                    totalStudents: await Student.countDocuments({ isActive: true })
                });

                // Send current active poll to the student
                const activePoll = await Poll.findActivePoll();
                if (activePoll) {
                    socket.emit('active-poll', {
                        poll: {
                            id: activePoll._id,
                            question: activePoll.question,
                            options: activePoll.options,
                            timeLimit: activePoll.timeLimit,
                            isActive: activePoll.isActive,
                            startedAt: activePoll.startedAt
                        }
                    });
                }

                console.log(`👨‍🎓 Student joined: ${name} (${socket.id})`);

            } catch (error) {
                console.error('Error in student-join:', error);
                socket.emit('error', {
                    message: 'Failed to join session',
                    type: 'server',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        // Student submits an answer
        socket.on('submit-answer', async (data) => {
            try {
                const { answer, answerIndex, responseTime } = data;

                if (!socket.studentId || !socket.tabId) {
                    socket.emit('error', {
                        message: 'Please join the session first',
                        type: 'authentication'
                    });
                    return;
                }

                if (answer === undefined || answerIndex === undefined || responseTime === undefined) {
                    socket.emit('error', {
                        message: 'Answer, answerIndex, and responseTime are required',
                        type: 'validation'
                    });
                    return;
                }

                // Find active poll
                const activePoll = await Poll.findActivePoll();
                if (!activePoll) {
                    socket.emit('error', {
                        message: 'No active poll found',
                        type: 'not_found'
                    });
                    return;
                }

                // Find student
                const student = await Student.findById(socket.studentId);
                if (!student) {
                    socket.emit('error', {
                        message: 'Student not found',
                        type: 'not_found'
                    });
                    return;
                }

                // Check if already responded
                const existingResponse = await Response.hasStudentResponded(activePoll._id, socket.tabId);
                if (existingResponse) {
                    socket.emit('error', {
                        message: 'You have already submitted an answer for this poll',
                        type: 'conflict'
                    });
                    return;
                }

                // Validate answer index
                if (answerIndex < 0 || answerIndex >= activePoll.options.length) {
                    socket.emit('error', {
                        message: 'Invalid answer index',
                        type: 'validation'
                    });
                    return;
                }

                // Create response
                const response = new Response({
                    pollId: activePoll._id,
                    studentId: socket.tabId,
                    studentName: student.name,
                    answer: answer.trim(),
                    answerIndex,
                    responseTime
                });

                await response.save();

                // Update student
                student.currentPollId = activePoll._id;
                await student.updateLastSeen();

                // Get updated results
                const results = await Response.getPollResults(activePoll._id);
                const totalResponses = await Response.countDocuments({ pollId: activePoll._id });

                // Emit to all clients
                io.emit('new-response', {
                    pollId: activePoll._id,
                    studentName: student.name,
                    answer: answer.trim(),
                    answerIndex,
                    totalResponses,
                    responseTime
                });

                io.emit('results-update', {
                    pollId: activePoll._id,
                    results,
                    totalResponses
                });

                // Confirm to student
                socket.emit('answer-submitted', {
                    pollId: activePoll._id,
                    answer: answer.trim(),
                    answerIndex,
                    answeredAt: response.answeredAt,
                    responseTime
                });

                console.log(`✅ Answer submitted by ${student.name}: ${answer}`);

            } catch (error) {
                console.error('Error in submit-answer:', error);
                socket.emit('error', {
                    message: 'Failed to submit answer',
                    type: 'server',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        // Request current poll status
        socket.on('get-poll-status', async () => {
            try {
                const activePoll = await Poll.findActivePoll();

                if (!activePoll) {
                    socket.emit('poll-status', { activePoll: null });
                    return;
                }

                const totalResponses = await Response.countDocuments({ pollId: activePoll._id });
                const results = await Response.getPollResults(activePoll._id);

                socket.emit('poll-status', {
                    activePoll: {
                        id: activePoll._id,
                        question: activePoll.question,
                        options: activePoll.options,
                        timeLimit: activePoll.timeLimit,
                        isActive: activePoll.isActive,
                        startedAt: activePoll.startedAt,
                        createdAt: activePoll.createdAt
                    },
                    totalResponses,
                    results
                });

            } catch (error) {
                console.error('Error in get-poll-status:', error);
                socket.emit('error', {
                    message: 'Failed to get poll status',
                    type: 'server'
                });
            }
        });

        // Timer synchronization
        socket.on('sync-timer', async (data) => {
            try {
                const { pollId } = data;

                if (!pollId) {
                    socket.emit('error', {
                        message: 'Poll ID is required for timer sync',
                        type: 'validation'
                    });
                    return;
                }

                const poll = await Poll.findById(pollId);
                if (!poll || !poll.isActive) {
                    socket.emit('timer-sync', { timeLeft: 0, pollActive: false });
                    return;
                }

                const elapsed = Math.floor((Date.now() - poll.startedAt.getTime()) / 1000);
                const timeLeft = Math.max(0, poll.timeLimit - elapsed);

                socket.emit('timer-sync', {
                    timeLeft,
                    pollActive: poll.isActive,
                    startedAt: poll.startedAt
                });

            } catch (error) {
                console.error('Error in sync-timer:', error);
                socket.emit('error', {
                    message: 'Failed to sync timer',
                    type: 'server'
                });
            }
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            try {
                console.log(`🔌 Client disconnected: ${socket.id}`);

                if (socket.studentId) {
                    const student = await Student.findById(socket.studentId);
                    if (student) {
                        await student.disconnect();

                        // Emit student disconnection
                        io.emit('student-disconnected', {
                            studentId: student._id,
                            studentName: student.name,
                            totalStudents: await Student.countDocuments({ isActive: true })
                        });

                        console.log(`👋 Student disconnected: ${student.name}`);
                    }
                }

                // Update live stats
                broadcastLiveStats();

            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });

        // Handle connection errors
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    // Cleanup inactive students periodically (every 30 minutes)
    setInterval(async () => {
        try {
            const result = await Student.cleanupInactiveStudents();
            if (result.deletedCount > 0) {
                console.log(`🧹 Cleaned up ${result.deletedCount} inactive students`);
                broadcastLiveStats();
            }
        } catch (error) {
            console.error('Error in periodic cleanup:', error);
        }
    }, 30 * 60 * 1000); // 30 minutes

    console.log('🔌 Socket.io handlers initialized');
};