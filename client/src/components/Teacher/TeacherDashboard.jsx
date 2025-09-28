import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    selectUser,
    selectIsTeacher,
    setTeacher,
    clearUser
} from '../../redux/slices/userSlice';
import {
    selectCurrentPoll,
    selectIsPollActive,
    selectPollResults,
    selectTotalResponses
} from '../../redux/slices/pollSlice';
import {
    selectStudentCount,
    selectLiveStats
} from '../../redux/slices/studentsSlice';
import socketService from '../../services/socketService';

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const isTeacher = useSelector(selectIsTeacher);
    const currentPoll = useSelector(selectCurrentPoll);
    const isPollActive = useSelector(selectIsPollActive);
    const pollResults = useSelector(selectPollResults);
    const totalResponses = useSelector(selectTotalResponses);
    const studentCount = useSelector(selectStudentCount);
    const liveStats = useSelector(selectLiveStats);

    useEffect(() => {
        // Check if user is teacher, if not redirect
        if (!isTeacher) {
            // Set as teacher if coming from role selection
            if (!user.type) {
                const teacherName = prompt('Enter your name:') || 'Teacher';
                dispatch(setTeacher({ name: teacherName }));
            } else {
                navigate('/');
                return;
            }
        }

        // Connect to socket
        if (!socketService.isSocketConnected()) {
            socketService.connect();
        }

        // Get current poll status
        socketService.getPollStatus();
    }, [isTeacher, user.type, navigate, dispatch]);

    const handleLogout = () => {
        socketService.disconnect();
        dispatch(clearUser());
        navigate('/');
    };

    const handleCreatePoll = () => {
        // This will be implemented when we create the CreatePoll component
        console.log('Create poll clicked');
    };

    const handleStartPoll = () => {
        if (currentPoll && !isPollActive) {
            socketService.startPoll(currentPoll.id);
        }
    };

    const handleEndPoll = () => {
        if (currentPoll && isPollActive) {
            socketService.endPoll(currentPoll.id);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Teacher Dashboard
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
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm text-gray-500">Active Students</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {liveStats.totalStudents || studentCount}
                                </p>
                            </div>
                            <div className="text-blue-500">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm text-gray-500">Total Responses</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {liveStats.totalResponses || totalResponses}
                                </p>
                            </div>
                            <div className="text-green-500">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm text-gray-500">Poll Status</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {currentPoll ? (isPollActive ? 'Active' : 'Created') : 'None'}
                                </p>
                            </div>
                            <div className={`${isPollActive ? 'text-green-500' : currentPoll ? 'text-yellow-500' : 'text-gray-400'}`}>
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Poll Management */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Current Poll */}
                    <div className="bg-white rounded-lg shadow-sm border">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Current Poll
                            </h2>

                            {currentPoll ? (
                                <div>
                                    <div className="mb-4">
                                        <h3 className="font-medium text-gray-900 mb-2">
                                            {currentPoll.question}
                                        </h3>
                                        <div className="space-y-1">
                                            {currentPoll.options?.map((option, index) => (
                                                <div key={index} className="text-sm text-gray-600">
                                                    {index + 1}. {option}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex space-x-2">
                                        {!isPollActive ? (
                                            <button
                                                onClick={handleStartPoll}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
                                            >
                                                Start Poll
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleEndPoll}
                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
                                            >
                                                End Poll
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 mb-4">No active poll</p>
                                    <button
                                        onClick={handleCreatePoll}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition duration-200"
                                    >
                                        Create New Poll
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Live Results */}
                    <div className="bg-white rounded-lg shadow-sm border">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Live Results
                            </h2>

                            {pollResults.length > 0 ? (
                                <div className="space-y-3">
                                    {pollResults.map((result, index) => (
                                        <div key={index} className="">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {result.answer}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    {result.count} votes
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${totalResponses > 0 ? (result.count / totalResponses) * 100 : 0}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">
                                        {currentPoll ? 'No responses yet' : 'Create a poll to see results'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;