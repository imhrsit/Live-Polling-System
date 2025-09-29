import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setStudent } from '../../redux/slices/userSlice';
import socketService from '../../services/socketService';

const StudentLogin = ({ onJoinSuccess }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [studentName, setStudentName] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');

    const generateTabId = () => {
        // Check if we already have a tab ID for this session
        let tabId = sessionStorage.getItem('tabId');
        if (!tabId) {
            tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('tabId', tabId);
        }
        return tabId;
    };

    const handleJoinSession = async (e) => {
        e.preventDefault();
        setError('');

        if (!studentName.trim()) {
            setError('Please enter your name');
            return;
        }

        if (studentName.trim().length < 2) {
            setError('Name must be at least 2 characters long');
            return;
        }

        setIsJoining(true);

        try {
            const tabId = generateTabId();
            const studentId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

            // Store student name in sessionStorage for persistence
            sessionStorage.setItem('studentName', studentName.trim());
            sessionStorage.setItem('studentId', studentId);

            // Set student in Redux
            dispatch(setStudent({
                name: studentName.trim(),
                id: studentId,
                tabId: tabId
            }));

            // Connect to socket if not already connected
            if (!socketService.isSocketConnected()) {
                socketService.connect();
            }

            // Join as student - emit socket event
            const joinData = {
                name: studentName.trim(),
                tabId: tabId,
                studentId: studentId
            };

            const joinSuccess = socketService.joinAsStudent(joinData);

            if (joinSuccess) {
                console.log('✅ Student joined successfully:', joinData);
                onJoinSuccess && onJoinSuccess();
            } else {
                throw new Error('Failed to join session');
            }

        } catch (error) {
            console.error('Error joining session:', error);
            setError('Failed to join session. Please try again.');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#7785DA]/10 to-[#5767D0]/10 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-[#7785DA] rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl text-white">👨‍🎓</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Join Polling Session
                        </h1>
                        <p className="text-gray-600">
                            Enter your name to participate in live polls
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleJoinSession} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                Your Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={studentName}
                                onChange={(e) => {
                                    setStudentName(e.target.value);
                                    setError(''); // Clear error when user types
                                }}
                                placeholder="Enter your full name"
                                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5767D0] focus:border-transparent transition duration-200 ${error ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                maxLength={50}
                                required
                                disabled={isJoining}
                            />
                            {error && (
                                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                                    <span>⚠️</span> {error}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isJoining || !studentName.trim()}
                            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition duration-300 flex items-center justify-center gap-2 ${isJoining || !studentName.trim()
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-[#5767D0] hover:bg-[#4F0DCE] active:bg-[#4F0DCE]'
                                }`}
                        >
                            {isJoining ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Joining...
                                </>
                            ) : (
                                <>
                                    <span>🚀</span>
                                    Join Session
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="text-center mt-8">
                        <button
                            onClick={() => navigate('/')}
                            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition duration-200"
                            disabled={isJoining}
                        >
                            ← Back to Role Selection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentLogin;