import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    selectUser,
    selectIsStudent,
    setStudent,
    clearUser
} from '../../redux/slices/userSlice';
import {
    selectCurrentPoll,
    selectIsPollActive,
    selectHasAnswered,
    selectSelectedAnswer,
    selectTimeRemaining,
    selectPollResults,
    setAnswer,
    submitAnswer
} from '../../redux/slices/pollSlice';
import socketService from '../../services/socketService';

const StudentInterface = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const isStudent = useSelector(selectIsStudent);
    const currentPoll = useSelector(selectCurrentPoll);
    const isPollActive = useSelector(selectIsPollActive);
    const hasAnswered = useSelector(selectHasAnswered);
    const selectedAnswer = useSelector(selectSelectedAnswer);
    const timeRemaining = useSelector(selectTimeRemaining);
    const pollResults = useSelector(selectPollResults);

    const [studentName, setStudentName] = useState('');
    const [isJoined, setIsJoined] = useState(false);
    const [startTime, setStartTime] = useState(null);

    useEffect(() => {
        // Check if user is student
        if (isStudent && user.name) {
            setIsJoined(true);
            setStudentName(user.name);
        }

        // Connect to socket if joined
        if (isJoined && !socketService.isSocketConnected()) {
            socketService.connect();
        }

        // Set start time when poll becomes active
        if (isPollActive && !startTime) {
            setStartTime(Date.now());
        }
    }, [isStudent, user.name, isJoined, isPollActive, startTime]);

    const handleJoinSession = (e) => {
        e.preventDefault();

        if (!studentName.trim()) {
            alert('Please enter your name');
            return;
        }

        const tabId = sessionStorage.getItem('tabId') || `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('tabId', tabId);

        // Set student in Redux
        dispatch(setStudent({
            name: studentName.trim(),
            id: `student_${Date.now()}`,
            tabId: tabId
        }));

        // Connect to socket and join
        if (!socketService.isSocketConnected()) {
            socketService.connect();
        }

        // Join as student
        socketService.joinAsStudent({
            name: studentName.trim(),
            tabId: tabId
        });

        setIsJoined(true);
    };

    const handleAnswerSelect = (answer, answerIndex) => {
        if (hasAnswered || !isPollActive) return;

        dispatch(setAnswer({ answer, answerIndex }));
    };

    const handleSubmitAnswer = () => {
        if (!selectedAnswer.answer || hasAnswered || !isPollActive) return;

        const responseTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

        dispatch(submitAnswer());

        socketService.submitAnswer({
            answer: selectedAnswer.answer,
            answerIndex: selectedAnswer.answerIndex,
            responseTime: responseTime
        });
    };

    const handleLogout = () => {
        socketService.disconnect();
        dispatch(clearUser());
        setIsJoined(false);
        setStudentName('');
        navigate('/');
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Login Form
    if (!isJoined) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-lg shadow-lg p-8">
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-2">👨‍🎓</div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Join Polling Session
                            </h1>
                            <p className="text-gray-600">
                                Enter your name to participate in live polls
                            </p>
                        </div>

                        <form onSubmit={handleJoinSession} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                    Your Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    maxLength={50}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-300"
                            >
                                Join Session
                            </button>
                        </form>

                        <div className="text-center mt-6">
                            <button
                                onClick={() => navigate('/')}
                                className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                                Back to Role Selection
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main Student Interface
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Student Dashboard
                            </h1>
                            <p className="text-sm text-gray-500">
                                Welcome, {user.name}
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 text-sm">
                                <div className={`w-3 h-3 rounded-full ${user.isConnected ? 'bg-green-500' : 'bg-red-500'
                                    }`}></div>
                                <span className={user.isConnected ? 'text-green-600' : 'text-red-600'}>
                                    {user.isConnected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                            >
                                Leave Session
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {currentPoll ? (
                    <div className="bg-white rounded-lg shadow-sm border">
                        <div className="p-8">
                            {/* Timer */}
                            {isPollActive && (
                                <div className="text-center mb-6">
                                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold ${timeRemaining > 10 ? 'bg-green-100 text-green-800' :
                                            timeRemaining > 5 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        ⏱️ {formatTime(timeRemaining)}
                                    </div>
                                </div>
                            )}

                            {/* Question */}
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    {currentPoll.question}
                                </h2>
                                <p className="text-gray-600">
                                    {isPollActive ? 'Select your answer:' : hasAnswered ? 'Poll ended - Results:' : 'Waiting for poll to start...'}
                                </p>
                            </div>

                            {/* Options */}
                            {isPollActive && !hasAnswered ? (
                                <div className="space-y-3 mb-6">
                                    {currentPoll.options?.map((option, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleAnswerSelect(option, index)}
                                            className={`w-full p-4 text-left border-2 rounded-lg transition duration-200 ${selectedAnswer.answerIndex === index
                                                    ? 'border-green-500 bg-green-50 text-green-800'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${selectedAnswer.answerIndex === index
                                                        ? 'border-green-500 bg-green-500'
                                                        : 'border-gray-300'
                                                    }`}>
                                                    {selectedAnswer.answerIndex === index && (
                                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                                    )}
                                                </div>
                                                <span className="font-medium">{option}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                // Show results
                                pollResults.length > 0 && (
                                    <div className="space-y-4 mb-6">
                                        {pollResults.map((result, index) => {
                                            const totalVotes = pollResults.reduce((sum, r) => sum + r.count, 0);
                                            const percentage = totalVotes > 0 ? (result.count / totalVotes) * 100 : 0;

                                            return (
                                                <div key={index} className="p-4 border rounded-lg">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-medium text-gray-700">
                                                            {result.answer}
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            {result.count} votes ({percentage.toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                                        <div
                                                            className={`h-3 rounded-full transition-all duration-500 ${hasAnswered && selectedAnswer.answer === result.answer
                                                                    ? 'bg-green-500'
                                                                    : 'bg-blue-500'
                                                                }`}
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}

                            {/* Submit Button */}
                            {isPollActive && selectedAnswer.answer && !hasAnswered && (
                                <div className="text-center">
                                    <button
                                        onClick={handleSubmitAnswer}
                                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300"
                                    >
                                        Submit Answer
                                    </button>
                                </div>
                            )}

                            {/* Status Messages */}
                            {hasAnswered && isPollActive && (
                                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-green-800 font-medium">
                                        ✅ Answer submitted! Waiting for results...
                                    </p>
                                </div>
                            )}

                            {!isPollActive && !hasAnswered && currentPoll && (
                                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-yellow-800 font-medium">
                                        ⏳ Poll created. Waiting for teacher to start...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border">
                        <div className="p-8 text-center">
                            <div className="text-6xl mb-4">📊</div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                No Active Poll
                            </h2>
                            <p className="text-gray-600">
                                Waiting for teacher to create a poll...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentInterface;