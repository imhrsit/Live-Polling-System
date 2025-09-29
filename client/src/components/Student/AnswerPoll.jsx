import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    selectCurrentPoll,
    selectIsPollActive,
    selectHasAnswered,
    selectSelectedAnswer,
    selectTimeRemaining,
    setAnswer,
    submitAnswer,
    updateTimer
} from '../../redux/slices/pollSlice';
import { selectUser } from '../../redux/slices/userSlice';
import socketService from '../../services/socketService';

const AnswerPoll = ({ onAnswerSubmitted }) => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const currentPoll = useSelector(selectCurrentPoll);
    const isPollActive = useSelector(selectIsPollActive);
    const hasAnswered = useSelector(selectHasAnswered);
    const selectedAnswer = useSelector(selectSelectedAnswer);
    const timeRemaining = useSelector(selectTimeRemaining);

    const [startTime, setStartTime] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const timerRef = useRef(null);
    const autoSubmitRef = useRef(false);

    // Timer countdown effect
    useEffect(() => {
        if (isPollActive && timeRemaining > 0 && !hasAnswered) {
            timerRef.current = setInterval(() => {
                dispatch(updateTimer(Math.max(0, timeRemaining - 1)));
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }

        return () => clearInterval(timerRef.current);
    }, [isPollActive, timeRemaining, hasAnswered, dispatch]);

    // Auto-submit when timer reaches 0
    useEffect(() => {
        if (timeRemaining === 0 && isPollActive && !hasAnswered && !autoSubmitRef.current) {
            autoSubmitRef.current = true;
            handleAutoSubmit();
        }
    }, [timeRemaining, isPollActive, hasAnswered]);

    // Set start time when poll becomes active
    useEffect(() => {
        if (isPollActive && !startTime) {
            setStartTime(Date.now());
        }
    }, [isPollActive, startTime]);

    const handleAnswerSelect = (option, optionIndex) => {
        if (hasAnswered || !isPollActive) return;

        dispatch(setAnswer({
            answer: option,
            answerIndex: optionIndex
        }));
    };

    const handleSubmitAnswer = async () => {
        if (!selectedAnswer.answer || hasAnswered || !isPollActive || isSubmitting) return;

        setIsSubmitting(true);

        try {
            const responseTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

            // Update local state first
            dispatch(submitAnswer());

            // Emit to server with enhanced data
            const answerData = {
                pollId: currentPoll.id,
                answer: selectedAnswer.answer,
                answerIndex: selectedAnswer.answerIndex,
                responseTime: responseTime,
                studentId: user.id,
                tabId: user.tabId
            };

            const success = socketService.submitAnswer(answerData);

            if (success) {
                console.log('✅ Answer submitted successfully:', answerData);
                onAnswerSubmitted && onAnswerSubmitted(answerData);
            }

        } catch (error) {
            console.error('Error submitting answer:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAutoSubmit = () => {
        if (selectedAnswer.answer) {
            // Submit the selected answer
            handleSubmitAnswer();
        } else {
            // No answer selected, submit empty response
            const responseTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 60;

            dispatch(submitAnswer());

            const answerData = {
                pollId: currentPoll.id,
                answer: null,
                answerIndex: -1,
                responseTime: responseTime,
                studentId: user.id,
                tabId: user.tabId,
                timeout: true
            };

            socketService.submitAnswer(answerData);
            onAnswerSubmitted && onAnswerSubmitted(answerData);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerColor = () => {
        if (timeRemaining > 30) return 'bg-green-100 text-green-800 border-green-200';
        if (timeRemaining > 10) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
    };

    if (!currentPoll) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    No Active Poll
                </h2>
                <p className="text-gray-600">
                    Waiting for teacher to create a poll...
                </p>
            </div>
        );
    }

    if (!isPollActive) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
                <div className="text-6xl mb-4">⏳</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Poll Created
                </h2>
                <p className="text-gray-600 mb-4">
                    Waiting for teacher to start the poll...
                </p>
                <div className="bg-[#7785DA]/10 border border-[#7785DA]/20 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">
                        {currentPoll.question}
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                        {currentPoll.options?.map((option, index) => (
                            <div key={index}>
                                {index + 1}. {option}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            {/* Timer Header */}
            <div className="bg-gradient-to-r from-[#7785DA] to-[#5767D0] p-6 text-white text-center">
                <div className={`inline-flex items-center px-6 py-3 rounded-full text-xl font-bold border-2 border-white/20 ${getTimerColor().replace('bg-', 'bg-white/20 ').replace('text-', 'text-white ').replace('border-', '')}`}>
                    <span className="mr-2">⏱️</span>
                    {formatTime(timeRemaining)}
                </div>
                {timeRemaining <= 10 && (
                    <p className="text-white/90 text-sm mt-2 animate-pulse">
                        ⚡ Time running out!
                    </p>
                )}
            </div>

            <div className="p-8">
                {/* Question */}
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                        {currentPoll.question}
                    </h2>
                    <p className="text-gray-600">
                        {hasAnswered
                            ? '✅ Answer submitted! Waiting for results...'
                            : 'Select your answer below:'
                        }
                    </p>
                </div>

                {/* Answer Options */}
                {!hasAnswered ? (
                    <div className="space-y-4 mb-8">
                        {currentPoll.options?.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(option, index)}
                                disabled={hasAnswered || isSubmitting}
                                className={`w-full p-4 text-left border-2 rounded-xl transition-all duration-200 group ${selectedAnswer.answerIndex === index
                                        ? 'border-[#5767D0] bg-[#5767D0]/5 shadow-md'
                                        : 'border-gray-200 hover:border-[#7785DA] hover:bg-gray-50'
                                    } ${hasAnswered || isSubmitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                            >
                                <div className="flex items-center">
                                    <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${selectedAnswer.answerIndex === index
                                            ? 'border-[#5767D0] bg-[#5767D0]'
                                            : 'border-gray-300 group-hover:border-[#7785DA]'
                                        }`}>
                                        {selectedAnswer.answerIndex === index && (
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        )}
                                    </div>
                                    <span className={`font-medium ${selectedAnswer.answerIndex === index ? 'text-[#5767D0]' : 'text-gray-900'
                                        }`}>
                                        {option}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    // Show submitted state
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-8">
                        <div className="text-4xl mb-3">✅</div>
                        <p className="text-green-800 font-semibold mb-2">
                            Answer Submitted Successfully!
                        </p>
                        <p className="text-green-700 text-sm">
                            Your answer: <span className="font-medium">{selectedAnswer.answer || 'No answer selected'}</span>
                        </p>
                    </div>
                )}

                {/* Submit Button */}
                {!hasAnswered && (
                    <div className="text-center">
                        <button
                            onClick={handleSubmitAnswer}
                            disabled={!selectedAnswer.answer || isSubmitting || hasAnswered}
                            className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 mx-auto ${!selectedAnswer.answer || isSubmitting || hasAnswered
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-[#5767D0] hover:bg-[#4F0DCE] active:bg-[#4F0DCE] shadow-lg hover:shadow-xl'
                                }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <span>🚀</span>
                                    Submit Answer
                                </>
                            )}
                        </button>

                        {!selectedAnswer.answer && (
                            <p className="text-gray-500 text-sm mt-3">
                                Please select an answer to submit
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnswerPoll;