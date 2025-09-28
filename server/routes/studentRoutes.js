const express = require('express');
const { Student, Response, Poll } = require('../models');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// POST /api/students/register - Register a new student
router.post('/register', async (req, res) => {
    try {
        const { name, socketId, tabId } = req.body;

        // Validation
        if (!name || !socketId) {
            return res.status(400).json({
                success: false,
                message: 'Name and socketId are required'
            });
        }

        const finalTabId = tabId || uuidv4();

        // Check if student with same name exists and is active
        const existingStudent = await Student.findOne({
            name: name.trim(),
            isActive: true
        });

        if (existingStudent) {
            // Update existing student's socket info
            existingStudent.socketId = socketId;
            existingStudent.tabId = finalTabId;
            existingStudent.lastSeen = new Date();
            existingStudent.isActive = true;
            await existingStudent.save();

            return res.json({
                success: true,
                message: 'Student session updated',
                student: {
                    id: existingStudent._id,
                    name: existingStudent.name,
                    tabId: existingStudent.tabId,
                    joinedAt: existingStudent.joinedAt
                }
            });
        }

        // Create new student
        const student = new Student({
            name: name.trim(),
            socketId,
            tabId: finalTabId
        });

        await student.save();

        // Emit to all connected clients
        req.io.emit('student-joined', {
            student: {
                id: student._id,
                name: student.name,
                joinedAt: student.joinedAt
            },
            totalStudents: await Student.countDocuments({ isActive: true })
        });

        res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            student: {
                id: student._id,
                name: student.name,
                tabId: student.tabId,
                joinedAt: student.joinedAt
            }
        });

    } catch (error) {
        console.error('Error registering student:', error);

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Student with this socket ID is already registered'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to register student',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/students/:id/submit-answer - Submit an answer to active poll
router.post('/:id/submit-answer', async (req, res) => {
    try {
        const studentId = req.params.id;
        const { answer, answerIndex, responseTime } = req.body;

        // Validation
        if (answer === undefined || answerIndex === undefined || responseTime === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Answer, answerIndex, and responseTime are required'
            });
        }

        // Find student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Find active poll
        const activePoll = await Poll.findActivePoll();
        if (!activePoll) {
            return res.status(404).json({
                success: false,
                message: 'No active poll found'
            });
        }

        // Validate answer index
        if (answerIndex < 0 || answerIndex >= activePoll.options.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid answer index'
            });
        }

        // Check if student already responded
        const existingResponse = await Response.hasStudentResponded(activePoll._id, student.tabId);
        if (existingResponse) {
            return res.status(409).json({
                success: false,
                message: 'You have already submitted an answer for this poll'
            });
        }

        // Create response
        const response = new Response({
            pollId: activePoll._id,
            studentId: student.tabId,
            studentName: student.name,
            answer: answer.trim(),
            answerIndex,
            responseTime
        });

        await response.save();

        // Update student's current poll
        student.currentPollId = activePoll._id;
        await student.updateLastSeen();

        // Get updated results
        const results = await Response.getPollResults(activePoll._id);
        const totalResponses = await Response.countDocuments({ pollId: activePoll._id });

        // Emit real-time update
        req.io.emit('new-response', {
            pollId: activePoll._id,
            studentName: student.name,
            answer,
            answerIndex,
            totalResponses,
            responseTime
        });

        req.io.emit('results-update', {
            pollId: activePoll._id,
            results,
            totalResponses
        });

        res.status(201).json({
            success: true,
            message: 'Answer submitted successfully',
            response: {
                pollId: activePoll._id,
                answer,
                answerIndex,
                answeredAt: response.answeredAt,
                responseTime
            }
        });

    } catch (error) {
        console.error('Error submitting answer:', error);

        // Handle duplicate response
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'You have already submitted an answer for this poll'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to submit answer',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/students/active - Get list of active students
router.get('/active', async (req, res) => {
    try {
        const students = await Student.findActiveStudents();
        const totalCount = students.length;

        res.json({
            success: true,
            students: students.map(student => ({
                id: student._id,
                name: student.name,
                joinedAt: student.joinedAt,
                lastSeen: student.lastSeen
            })),
            totalCount
        });

    } catch (error) {
        console.error('Error fetching active students:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active students',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/students/:id - Remove student (disconnect)
router.delete('/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        await student.disconnect();

        // Emit student disconnection
        req.io.emit('student-disconnected', {
            studentId: student._id,
            studentName: student.name,
            totalStudents: await Student.countDocuments({ isActive: true })
        });

        res.json({
            success: true,
            message: 'Student disconnected successfully'
        });

    } catch (error) {
        console.error('Error disconnecting student:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disconnect student',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/students/cleanup - Cleanup inactive students (maintenance endpoint)
router.post('/cleanup', async (req, res) => {
    try {
        const result = await Student.cleanupInactiveStudents();

        res.json({
            success: true,
            message: `Cleaned up ${result.deletedCount} inactive students`
        });

    } catch (error) {
        console.error('Error cleaning up students:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup students',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;