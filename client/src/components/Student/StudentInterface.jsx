import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    selectUser,
    selectIsStudent,
    clearUser
} from '../../redux/slices/userSlice';
import {
    selectCurrentPoll,
    selectIsPollActive,
    selectHasAnswered,
    selectPollResults
} from '../../redux/slices/pollSlice';
import socketService from '../../services/socketService';
import StudentLogin from './StudentLogin';
import AnswerPoll from './AnswerPoll';
import StudentResults from './StudentResults';

const StudentInterface = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const isStudent = useSelector(selectIsStudent);
    const currentPoll = useSelector(selectCurrentPoll);
    const isPollActive = useSelector(selectIsPollActive);
    const hasAnswered = useSelector(selectHasAnswered);
    const pollResults = useSelector(selectPollResults);

    const [isJoined, setIsJoined] = useState(false);
    const [currentView, setCurrentView] = useState('login'); // 'login', 'poll', 'results', 'waiting'

    // Check if student is already logged in (from sessionStorage or Redux)
    useEffect(() => {
        const savedName = sessionStorage.getItem('studentName');
        const savedId = sessionStorage.getItem('studentId');
        
        if (isStudent && user.name && user.id) {
            setIsJoined(true);
            determineCurrentView();
        } else if (savedName && savedId) {
            // Restore from sessionStorage if available
            setIsJoined(true);
            determineCurrentView();
        }
    }, [isStudent, user.name, user.id]);

    // Determine which view to show based on poll state
    useEffect(() => {
        if (isJoined) {
            determineCurrentView();
        }
    }, [isJoined, currentPoll, isPollActive, hasAnswered, pollResults]);

    // Socket connection management
    useEffect(() => {
        if (isJoined && !socketService.isSocketConnected()) {
            socketService.connect();
        }
    }, [isJoined]);

    const determineCurrentView = () => {
        if (!currentPoll) {
            setCurrentView('waiting');
        } else if (isPollActive && !hasAnswered) {
            setCurrentView('poll');
        } else if (hasAnswered || pollResults.length > 0) {
            setCurrentView('results');
        } else {
            setCurrentView('waiting');
        }
    };

    const handleJoinSuccess = () => {
        setIsJoined(true);
        determineCurrentView();
    };

    const handleAnswerSubmitted = (answerData) => {
        console.log('Answer submitted:', answerData);
        setCurrentView('results');
    };

    const handleLogout = () => {
        socketService.disconnect();
        dispatch(clearUser());
        sessionStorage.removeItem('studentName');
        sessionStorage.removeItem('studentId');
        sessionStorage.removeItem('tabId');
        setIsJoined(false);
        setCurrentView('login');
        navigate('/');
    };

    // Show login if not joined
    if (!isJoined) {
        return <StudentLogin onJoinSuccess={handleJoinSuccess} />;
    }

    // Show appropriate view based on current state
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
                                Welcome, {user.name || 'Student'}
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 text-sm">
                                <div className={`w-3 h-3 rounded-full ${
                                    user.isConnected ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                <span className={user.isConnected ? 'text-green-600' : 'text-red-600'}>
                                    {user.isConnected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-gray-500 hover:text-gray-700 text-sm font-medium transition duration-200"
                            >
                                Leave Session
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Render appropriate component based on current view */}
                {currentView === 'poll' && (
                    <AnswerPoll onAnswerSubmitted={handleAnswerSubmitted} />
                )}
                
                {currentView === 'results' && (
                    <StudentResults onWaitingForNext={() => setCurrentView('waiting')} />
                )}
                
                {currentView === 'waiting' && (
                    <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
                        <div className="text-6xl mb-4">⏳</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            Waiting for Poll
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {currentPoll 
                                ? 'Poll created. Waiting for teacher to start...' 
                                : 'Waiting for teacher to create a poll...'
                            }
                        </p>
                        {currentPoll && (
                            <div className="bg-[#7785DA]/10 border border-[#7785DA]/20 rounded-xl p-4 max-w-md mx-auto">
                                <h3 className="font-medium text-gray-900 mb-2">
                                    Next Question:
                                </h3>
                                <p className="text-sm text-gray-700 mb-2">
                                    "{currentPoll.question}"
                                </p>
                                <div className="text-xs text-gray-600 space-y-1">
                                    {currentPoll.options?.map((option, index) => (
                                        <div key={index}>
                                            {index + 1}. {option}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentInterface;