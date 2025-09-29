import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
    selectCurrentPoll,
    selectIsPollActive,
    selectPollResults,
    selectTotalResponses
} from '../../redux/slices/pollSlice';
import {
    selectStudents,
    selectStudentCount
} from '../../redux/slices/studentsSlice';
import socketService from '../../services/socketService';

const PollResults = ({ showEndButton = true, onEndPoll }) => {
    const currentPoll = useSelector(selectCurrentPoll);
    const isPollActive = useSelector(selectIsPollActive);
    const pollResults = useSelector(selectPollResults);
    const totalResponses = useSelector(selectTotalResponses);
    const students = useSelector(selectStudents);
    const studentCount = useSelector(selectStudentCount);

    const [studentsWhoAnswered, setStudentsWhoAnswered] = useState([]);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        // Filter students who have answered
        const answeredStudents = students.filter(student =>
            student.hasAnswered || student.answered
        );
        setStudentsWhoAnswered(answeredStudents);
    }, [students, pollResults]);

    const handleEndPoll = () => {
        if (currentPoll && isPollActive) {
            socketService.endPoll(currentPoll.id);
            onEndPoll && onEndPoll();
        }
    };

    const exportResults = () => {
        if (!currentPoll || !pollResults.length) return;

        setIsExporting(true);

        try {
            const exportData = {
                question: currentPoll.question,
                totalResponses,
                studentCount,
                responseRate: `${((totalResponses / studentCount) * 100).toFixed(1)}%`,
                results: pollResults.map(result => ({
                    option: result.answer,
                    votes: result.count,
                    percentage: `${((result.count / totalResponses) * 100).toFixed(1)}%`
                })),
                studentsAnswered: studentsWhoAnswered.map(student => ({
                    name: student.name,
                    answer: student.selectedAnswer || 'N/A',
                    responseTime: student.responseTime || 'N/A'
                })),
                exportedAt: new Date().toISOString()
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `poll-results-${currentPoll.id}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting results:', error);
        } finally {
            setIsExporting(false);
        }
    };

    if (!currentPoll) {
        return (
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="text-center py-8">
                    <div className="text-4xl mb-4">📊</div>
                    <p className="text-gray-500">No poll to display results for</p>
                </div>
            </div>
        );
    }

    const responseRate = studentCount > 0 ? (totalResponses / studentCount) * 100 : 0;
    const maxVotes = Math.max(...pollResults.map(r => r.count), 1);

    return (
        <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            Live Poll Results
                        </h2>
                        <p className="text-sm text-gray-600 mb-2">
                            "{currentPoll.question}"
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>👥 {totalResponses}/{studentCount} responses</span>
                            <span>📈 {responseRate.toFixed(1)}% response rate</span>
                            {isPollActive && (
                                <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    Live
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {pollResults.length > 0 && (
                            <button
                                onClick={exportResults}
                                disabled={isExporting}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-200 flex items-center gap-2"
                            >
                                {isExporting ? (
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                )}
                                Export
                            </button>
                        )}

                        {showEndButton && isPollActive && (
                            <button
                                onClick={handleEndPoll}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200"
                            >
                                End Poll
                            </button>
                        )}
                    </div>
                </div>

                {/* Results Visualization */}
                {pollResults.length > 0 ? (
                    <div className="space-y-4 mb-6">
                        {pollResults.map((result, index) => {
                            const percentage = totalResponses > 0 ? (result.count / totalResponses) * 100 : 0;
                            const barWidth = maxVotes > 0 ? (result.count / maxVotes) * 100 : 0;

                            return (
                                <div key={index} className="">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-gray-900">
                                            {result.answer}
                                        </span>
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <span>{result.count} votes</span>
                                            <span className="font-semibold">{percentage.toFixed(1)}%</span>
                                        </div>
                                    </div>

                                    <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-[#5767D0] to-[#7785DA] h-4 rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${barWidth}%` }}
                                        >
                                            {result.count > 0 && (
                                                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                                                    {result.count > 0 && percentage >= 10 ? `${percentage.toFixed(0)}%` : ''}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-4">⏳</div>
                        <p className="text-gray-500">
                            {isPollActive ? 'Waiting for responses...' : 'No responses yet'}
                        </p>
                    </div>
                )}

                {/* Students Who Answered */}
                {studentsWhoAnswered.length > 0 && (
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            Students Who Answered ({studentsWhoAnswered.length})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {studentsWhoAnswered.map((student, index) => (
                                <div
                                    key={student.id || index}
                                    className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm"
                                >
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-green-800 font-medium truncate">
                                        {student.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Unanswered Students */}
                {isPollActive && studentCount > studentsWhoAnswered.length && (
                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            Waiting for Response ({studentCount - studentsWhoAnswered.length})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {students
                                .filter(student => !studentsWhoAnswered.find(answered => answered.id === student.id))
                                .map((student, index) => (
                                    <div
                                        key={student.id || index}
                                        className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm"
                                    >
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                        <span className="text-yellow-800 font-medium truncate">
                                            {student.name}
                                        </span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PollResults;