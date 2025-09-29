const { Poll, Student, Response } = require('../models');

module.exports = (io) => {
    // Store for managing timers and rooms
    const pollTimers = new Map();
    const rooms = new Map(); // Store room data: { roomId: { teacher: socketId, students: Set, pollId: null, createdAt: Date } }
    const teacherSockets = new Map(); // Map teacher socket IDs to room IDs
    const studentSockets = new Map(); // Map student socket IDs to room IDs and student data

    // Helper function to generate unique room ID
    const generateRoomId = () => {
        return `room_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    };

    // Helper function to broadcast live statistics to a room
    const broadcastRoomStats = async (roomId) => {
        try {
            const room = rooms.get(roomId);
            if (!room) return;

            const totalStudents = room.students.size;
            const activePoll = await Poll.findActivePoll();
            const totalResponses = activePoll ? await Response.countDocuments({ pollId: activePoll._id }) : 0;

            io.to(roomId).emit('live-stats', {
                roomId,
                totalStudents,
                activePollId: activePoll?._id,
                totalResponses,
                connectedStudents: Array.from(room.students).map(studentId => {
                    const student = studentSockets.get(studentId);
                    return student ? { id: student.id, name: student.name, connected: true } : null;
                }).filter(Boolean)
            });
        } catch (error) {
            console.error('Error broadcasting room stats:', error);
        }
    };

    // Helper function to broadcast live statistics globally
    const broadcastGlobalStats = async () => {
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
            console.error('Error broadcasting global stats:', error);
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

        // Send current global stats on connection
        broadcastGlobalStats();

        // Handle teacher joining and room creation
        socket.on('teacher-join', async (data) => {
            try {
                const { teacherName, teacherId } = data;

                if (!teacherName || !teacherId) {
                    socket.emit('error', {
                        message: 'Teacher name and ID are required',
                        type: 'validation'
                    });
                    return;
                }

                // Create a new room for this teacher
                const roomId = generateRoomId();
                
                // Store room information
                rooms.set(roomId, {
                    teacher: socket.id,
                    teacherName: teacherName.trim(),
                    teacherId,
                    students: new Set(),
                    pollId: null,
                    createdAt: new Date(),
                    isActive: true
                });

                // Store teacher socket mapping
                teacherSockets.set(socket.id, roomId);
                
                // Join the teacher to their room
                socket.join(roomId);
                socket.roomId = roomId;
                socket.userType = 'teacher';
                socket.teacherId = teacherId;

                // Confirm room creation to teacher
                socket.emit('room-created', {
                    roomId,
                    teacherName: teacherName.trim(),
                    teacherId,
                    studentsCount: 0,
                    createdAt: new Date()
                });

                console.log(`👨‍🏫 Teacher ${teacherName} created room: ${roomId}`);

            } catch (error) {
                console.error('Error in teacher-join:', error);
                socket.emit('error', {
                    message: 'Failed to create room',
                    type: 'server',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        // Teacher Events

        // Enhanced teacher creates a poll with room management
        socket.on('create-poll', async (data) => {
            try {
                const { question, options, createdBy, timeLimit } = data;

                // Validate teacher authentication
                if (!socket.roomId || socket.userType !== 'teacher') {
                    socket.emit('error', {
                        message: 'Only authenticated teachers can create polls',
                        type: 'authentication'
                    });
                    return;
                }

                // Validate required fields
                if (!question || !options || !createdBy) {
                    socket.emit('error', {
                        message: 'Question, options, and createdBy are required',
                        type: 'validation'
                    });
                    return;
                }

                // Auto-end any previous active polls to allow new poll creation
                const activePoll = await Poll.findActivePoll();
                if (activePoll) {
                    console.log(`🔄 Auto-ending previous poll: ${activePoll.question}`);
                    await activePoll.end();
                    
                    // Clear any existing timers for the previous poll
                    if (pollTimers.has(activePoll._id.toString())) {
                        clearTimeout(pollTimers.get(activePoll._id.toString()));
                        pollTimers.delete(activePoll._id.toString());
                    }
                    
                    // Notify clients that the previous poll ended
                    io.to(socket.roomId).emit('poll-ended', {
                        pollId: activePoll._id,
                        reason: 'replaced',
                        endedAt: activePoll.endedAt
                    });
                }

                const room = rooms.get(socket.roomId);
                if (!room) {
                    socket.emit('error', {
                        message: 'Room not found',
                        type: 'not_found'
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

                // Update room with poll ID
                room.pollId = poll._id;

                // Emit to room participants
                io.to(socket.roomId).emit('poll-created', {
                    roomId: socket.roomId,
                    poll: {
                        id: poll._id,
                        question: poll.question,
                        options: poll.options,
                        timeLimit: poll.timeLimit,
                        createdBy: poll.createdBy,
                        createdAt: poll.createdAt
                    }
                });

                console.log(`📊 Poll created in room ${socket.roomId} by ${createdBy}: ${question}`);

            } catch (error) {
                console.error('Error in create-poll:', error);
                socket.emit('error', {
                    message: 'Failed to create poll',
                    type: 'server',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        // Maintain backward compatibility
        socket.on('teacher-create-poll', async (data) => {
            socket.emit('create-poll', data);
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

        // Enhanced student joining with room management
        socket.on('student-join', async (data) => {
            try {
                const { name, tabId, roomId } = data;

                if (!name) {
                    socket.emit('error', {
                        message: 'Student name is required',
                        type: 'validation'
                    });
                    return;
                }

                // For now, join the first available room or create a default room
                let targetRoomId = roomId;
                
                if (!targetRoomId) {
                    // Find an active room or use a default room
                    const activeRooms = Array.from(rooms.entries()).filter(([_, room]) => room.isActive);
                    if (activeRooms.length > 0) {
                        targetRoomId = activeRooms[0][0]; // Join the first active room
                    } else {
                        // Create a default room if none exists
                        targetRoomId = 'default_room';
                        if (!rooms.has(targetRoomId)) {
                            rooms.set(targetRoomId, {
                                teacher: null,
                                teacherName: 'System',
                                teacherId: 'system',
                                students: new Set(),
                                pollId: null,
                                createdAt: new Date(),
                                isActive: true
                            });
                        }
                    }
                }

                const room = rooms.get(targetRoomId);
                if (!room || !room.isActive) {
                    socket.emit('error', {
                        message: 'Room not found or inactive',
                        type: 'not_found'
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

                // Add student to room
                room.students.add(socket.id);
                
                // Store student socket mapping
                studentSockets.set(socket.id, {
                    id: student._id,
                    name: student.name,
                    tabId: student.tabId,
                    roomId: targetRoomId,
                    joinedAt: new Date()
                });

                // Join student to room
                socket.join(targetRoomId);
                socket.roomId = targetRoomId;
                socket.userType = 'student';
                socket.studentId = student._id;
                socket.tabId = student.tabId;

                // Notify room about new student
                io.to(targetRoomId).emit('student-joined', {
                    roomId: targetRoomId,
                    student: {
                        id: student._id,
                        name: student.name,
                        joinedAt: student.joinedAt
                    },
                    totalStudents: room.students.size
                });

                // Send room info and current poll to student
                socket.emit('joined-room', {
                    roomId: targetRoomId,
                    studentsCount: room.students.size,
                    teacherName: room.teacherName
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

                    // Sync timer if poll is active
                    if (activePoll.isActive) {
                        const elapsed = Math.floor((Date.now() - activePoll.startedAt.getTime()) / 1000);
                        const timeLeft = Math.max(0, activePoll.timeLimit - elapsed);
                        
                        socket.emit('timer-sync', {
                            timeLeft,
                            pollActive: true,
                            startedAt: activePoll.startedAt
                        });
                    }
                }

                // Update room stats
                broadcastRoomStats(targetRoomId);

                console.log(`👨‍🎓 Student ${name} joined room ${targetRoomId} (${socket.id})`);

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
                console.log(`📊 Get poll status request from room: ${socket.roomId}`);
                
                if (!socket.roomId) {
                    socket.emit('poll-status', { error: 'Not in any room' });
                    return;
                }

                // Find the most recent poll for this room
                const recentPoll = await Poll.findOne({ roomId: socket.roomId })
                    .sort({ createdAt: -1 })
                    .populate('responses');

                if (recentPoll) {
                    console.log(`✅ Found recent poll for room ${socket.roomId}:`, {
                        id: recentPoll._id,
                        question: recentPoll.question,
                        isActive: recentPoll.isActive,
                        responses: recentPoll.responses?.length || 0,
                        startedAt: recentPoll.startedAt
                    });

                    const pollData = {
                        _id: recentPoll._id,
                        question: recentPoll.question,
                        options: recentPoll.options,
                        timeLimit: recentPoll.timeLimit,
                        isActive: recentPoll.isActive,
                        createdAt: recentPoll.createdAt
                    };

                    // Include startedAt if the poll has been started
                    if (recentPoll.startedAt) {
                        pollData.startedAt = recentPoll.startedAt;
                    }

                    const responseData = {
                        activePoll: pollData,
                        results: recentPoll.responses || [],
                        totalResponses: recentPoll.responses?.length || 0
                    };

                    console.log(`� Sending poll status:`, {
                        question: pollData.question,
                        isActive: pollData.isActive,
                        hasStartedAt: !!pollData.startedAt
                    });

                    socket.emit('poll-status', responseData);
                } else {
                    console.log(`❌ No polls found for room: ${socket.roomId}`);
                    socket.emit('poll-status', { activePoll: null });
                }
            } catch (error) {
                console.error('❌ Error getting poll status:', error);
                socket.emit('poll-status', { error: error.message });
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

        // Enhanced disconnection handling with room management
        socket.on('disconnect', async (reason) => {
            try {
                console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);

                if (socket.userType === 'teacher' && socket.roomId) {
                    // Handle teacher disconnection
                    const room = rooms.get(socket.roomId);
                    if (room) {
                        // Notify students in room
                        io.to(socket.roomId).emit('teacher-disconnected', {
                            roomId: socket.roomId,
                            teacherName: room.teacherName,
                            reason: reason
                        });

                        // Keep room active for a grace period (5 minutes)
                        setTimeout(() => {
                            if (rooms.has(socket.roomId)) {
                                const currentRoom = rooms.get(socket.roomId);
                                if (currentRoom.teacher === socket.id) {
                                    // Teacher hasn't reconnected, close room
                                    io.to(socket.roomId).emit('room-closed', {
                                        roomId: socket.roomId,
                                        reason: 'Teacher disconnected'
                                    });
                                    
                                    // Clean up room
                                    rooms.delete(socket.roomId);
                                    console.log(`🚪 Room ${socket.roomId} closed due to teacher disconnect`);
                                }
                            }
                        }, 5 * 60 * 1000); // 5 minutes
                    }

                    teacherSockets.delete(socket.id);
                    console.log(`👨‍🏫 Teacher disconnected from room ${socket.roomId}`);

                } else if (socket.userType === 'student' && socket.studentId) {
                    // Handle student disconnection
                    const student = await Student.findById(socket.studentId);
                    if (student) {
                        await student.disconnect();
                    }

                    // Remove from room
                    if (socket.roomId) {
                        const room = rooms.get(socket.roomId);
                        if (room) {
                            room.students.delete(socket.id);
                            
                            // Notify room about student leaving
                            io.to(socket.roomId).emit('student-disconnected', {
                                roomId: socket.roomId,
                                studentId: student?._id,
                                studentName: student?.name,
                                totalStudents: room.students.size
                            });

                            // Update room stats
                            broadcastRoomStats(socket.roomId);
                        }
                    }

                    studentSockets.delete(socket.id);
                    console.log(`👋 Student disconnected: ${student?.name || 'Unknown'} from room ${socket.roomId}`);
                }

                // Update global stats
                broadcastGlobalStats();

            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });

        // Handle poll timeout
        socket.on('poll-timeout', async (data) => {
            try {
                const { pollId } = data;
                
                if (socket.userType !== 'teacher') {
                    socket.emit('error', {
                        message: 'Only teachers can handle poll timeout',
                        type: 'authentication'
                    });
                    return;
                }

                await endPollAutomatically(pollId);
                
            } catch (error) {
                console.error('Error in poll-timeout:', error);
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