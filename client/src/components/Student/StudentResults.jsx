import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
    selectCurrentPoll,
    selectPollResults,
    selectTotalResponses,
    selectSelectedAnswer,
    selectHasAnswered
} from '../../redux/slices/pollSlice';
import { selectUser } from '../../redux/slices/userSlice';

const StudentResults = ({ onWaitingForNext }) => {
    const user = useSelector(selectUser);
    const currentPoll = useSelector(selectCurrentPoll);
    const pollResults = useSelector(selectPollResults);
    const totalResponses = useSelector(selectTotalResponses);
    const selectedAnswer = useSelector(selectSelectedAnswer);
    const hasAnswered = useSelector(selectHasAnswered);

    const [showConfetti, setShowConfetti] = useState(false);
    const [animationComplete, setAnimationComplete] = useState(false);

    useEffect(() => {
        // Show confetti animation when results are first displayed
        if (pollResults.length > 0 && !animationComplete) {
            setShowConfetti(true);
            const timer = setTimeout(() => {
                setShowConfetti(false);
                setAnimationComplete(true);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [pollResults, animationComplete]);

    if (!currentPoll) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    No Poll Results
                </h2>
                <p className="text-gray-600">
                    Waiting for a poll to be created...
                </p>
            </div>
        );
    }

    if (pollResults.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
                <div className="text-6xl mb-4">⏳</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Waiting for Results
                </h2>
                <p className="text-gray-600">
                    Results will appear here once the poll ends...
                </p>
            </div>
        );
    }

    const maxVotes = Math.max(...pollResults.map(r => r.count), 1);
    const userAnswerIndex = selectedAnswer.answerIndex;
    const userAnswer = selectedAnswer.answer;

    // Calculate statistics
    const responseRate = currentPoll.totalStudents
        ? (totalResponses / currentPoll.totalStudents * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Confetti Effect */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-bounce"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`,
                                fontSize: '2rem'
                            }}
                        >
                            🎉
                        </div>
                    ))}
                </div>
            )}

            {/* Results Card */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#7785DA] to-[#5767D0] p-6 text-white">
                    <div className="text-center">
                        <div className="text-4xl mb-2">📊</div>
                        <h2 className="text-2xl font-bold mb-2">Poll Results</h2>
                        <p className="text-white/90 text-sm">
                            "{currentPoll.question}"
                        </p>
                    </div>
                </div>

                <div className="p-8">
                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="text-center p-4 bg-blue-50 rounded-xl">
                            <div className="text-2xl font-bold text-blue-600">{totalResponses}</div>
                            <div className="text-sm text-blue-800">Total Votes</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-xl">
                            <div className="text-2xl font-bold text-green-600">{responseRate.toFixed(1)}%</div>
                            <div className="text-sm text-green-800">Response Rate</div>
                        </div>
                    </div>

                    {/* Your Answer Status */}
                    {hasAnswered && (
                        <div className={`mb-6 p-4 rounded-xl border-2 ${userAnswer
                                ? 'bg-green-50 border-green-200'
                                : 'bg-yellow-50 border-yellow-200'
                            }`}>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-lg">
                                    {userAnswer ? '✅' : '⏰'}
                                </span>
                                <span className={`font-semibold ${userAnswer ? 'text-green-800' : 'text-yellow-800'
                                    }`}>
                                    Your Answer: {userAnswer || 'No answer submitted (timed out)'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Results Bars */}
                    <div className="space-y-4 mb-8">
                        {pollResults.map((result, index) => {
                            const percentage = totalResponses > 0 ? (result.count / totalResponses) * 100 : 0;
                            const barWidth = maxVotes > 0 ? (result.count / maxVotes) * 100 : 0;
                            const isUserAnswer = result.answer === userAnswer;

                            return (
                                <div key={index} className={`relative ${isUserAnswer ? 'ring-2 ring-[#5767D0] ring-opacity-50' : ''
                                    }`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`font-semibold flex items-center gap-2 ${isUserAnswer ? 'text-[#5767D0]' : 'text-gray-900'
                                            }`}>
                                            {isUserAnswer && <span className="text-lg">👤</span>}
                                            {result.answer}
                                        </span>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="text-gray-600">{result.count} votes</span>
                                            <span className={`font-bold ${isUserAnswer ? 'text-[#5767D0]' : 'text-gray-900'
                                                }`}>
                                                {percentage.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`w-full bg-gray-200 rounded-full h-6 relative overflow-hidden ${isUserAnswer ? 'ring-1 ring-[#5767D0]' : ''
                                        }`}>
                                        <div
                                            className={`h-6 rounded-full transition-all duration-1000 ease-out ${isUserAnswer
                                                    ? 'bg-gradient-to-r from-[#5767D0] to-[#7785DA]'
                                                    : 'bg-gradient-to-r from-gray-400 to-gray-500'
                                                }`}
                                            style={{
                                                width: `${barWidth}%`,
                                                animationDelay: `${index * 200}ms`
                                            }}
                                        >
                                            {result.count > 0 && percentage >= 15 && (
                                                <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                                                    {percentage.toFixed(0)}%
                                                </div>
                                            )}
                                        </div>
                                        {isUserAnswer && (
                                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-xs">
                                                YOU
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Waiting Message */}
                    <div className="text-center p-6 bg-[#7785DA]/5 border border-[#7785DA]/20 rounded-xl">
                        <div className="text-3xl mb-3">⏳</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Waiting for Next Question
                        </h3>
                        <p className="text-gray-600 text-sm">
                            The teacher will start the next poll or end the session
                        </p>
                        <div className="mt-4 flex justify-center">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-[#7785DA] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-[#7785DA] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-[#7785DA] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-center">
                    📈 Poll Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                            {pollResults.reduce((max, result) => result.count > max ? result.count : max, 0)}
                        </div>
                        <div className="text-xs text-blue-800">Highest Votes</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                            {pollResults.length}
                        </div>
                        <div className="text-xs text-green-800">Total Options</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">
                            {Math.round(totalResponses / pollResults.length)}
                        </div>
                        <div className="text-xs text-purple-800">Avg per Option</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentResults;