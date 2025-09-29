import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentPoll, clearPoll } from '../../redux/slices/pollSlice';
import { selectStudentCount } from '../../redux/slices/studentsSlice';
import socketService from '../../services/socketService';

const CreatePoll = ({ onClose, onPollCreated }) => {
    const dispatch = useDispatch();
    const currentPoll = useSelector(selectCurrentPoll);
    const studentCount = useSelector(selectStudentCount);

    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [timeLimit, setTimeLimit] = useState(60);
    const [errors, setErrors] = useState({});
    const [isCreating, setIsCreating] = useState(false);

    const addOption = () => {
        if (options.length < 6) {
            setOptions([...options, '']);
        }
    };

    const removeOption = (index) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    const updateOption = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!question.trim()) {
            newErrors.question = 'Question is required';
        }

        const filledOptions = options.filter(opt => opt.trim());
        if (filledOptions.length < 2) {
            newErrors.options = 'At least 2 options are required';
        }

        const duplicateOptions = filledOptions.filter((opt, index) =>
            filledOptions.indexOf(opt) !== index
        );
        if (duplicateOptions.length > 0) {
            newErrors.options = 'Options must be unique';
        }

        if (timeLimit < 10 || timeLimit > 300) {
            newErrors.timeLimit = 'Time limit must be between 10 and 300 seconds';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreatePoll = async () => {
        if (!validateForm()) return;

        // Check if teacher is properly connected
        if (!socketService.isSocketConnected()) {
            setErrors({ submit: 'Not connected to server. Please check your connection.' });
            return;
        }

        setIsCreating(true);
        setErrors({});

        // Clear any previous poll state before creating new one
        console.log('🧹 Clearing previous poll state before creating new poll');
        dispatch(clearPoll());

        try {
            const teacherData = JSON.parse(sessionStorage.getItem('teacherData') || '{}');
            
            const pollData = {
                question: question.trim(),
                options: options.filter(opt => opt.trim()).map(opt => opt.trim()),
                timeLimit,
                createdBy: teacherData.name || 'Teacher'
            };

            // Join as teacher first if not already joined
            if (!socketService.getRoomId()) {
                const teacherJoinData = {
                    teacherName: teacherData.name || 'Teacher',
                    teacherId: teacherData.id || 'teacher_default'
                };
                socketService.joinAsTeacher(teacherJoinData);
                
                // Wait a moment for room creation
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Create poll via enhanced socket method
            const success = socketService.createPoll(pollData);

            if (success) {
                console.log('✅ Poll created successfully');
                onPollCreated && onPollCreated();
                onClose();
            } else {
                throw new Error('Failed to emit poll creation event');
            }
        } catch (error) {
            console.error('Error creating poll:', error);
            setErrors({ submit: 'Failed to create poll. Please try again.' });
        } finally {
            setIsCreating(false);
        }
    };

    // Check if create button should be disabled
    const isCreateDisabled = currentPoll && currentPoll.isActive && studentCount > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Create New Poll</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    {/* Disabled Warning */}
                    {isCreateDisabled && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                            <p className="text-yellow-800 text-sm">
                                ⚠️ Cannot create a new poll while an active poll has unanswered students
                            </p>
                        </div>
                    )}

                    {/* Question Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Poll Question *
                        </label>
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Enter your poll question..."
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5767D0] focus:border-transparent resize-none ${errors.question ? 'border-red-500' : 'border-gray-300'
                                }`}
                            rows={3}
                            maxLength={200}
                            disabled={isCreateDisabled}
                        />
                        {errors.question && (
                            <p className="text-red-500 text-sm mt-1">{errors.question}</p>
                        )}
                        <p className="text-gray-500 text-xs mt-1">{question.length}/200 characters</p>
                    </div>

                    {/* Options */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                                Answer Options * (2-6 options)
                            </label>
                            <button
                                onClick={addOption}
                                disabled={options.length >= 6 || isCreateDisabled}
                                className={`text-sm px-3 py-1 rounded ${options.length >= 6 || isCreateDisabled
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-[#5767D0] text-white hover:bg-[#4F0DCE]'
                                    }`}
                            >
                                + Add Option
                            </button>
                        </div>

                        <div className="space-y-3">
                            {options.map((option, index) => (
                                <div key={index} className="flex gap-3 items-center">
                                    <span className="text-sm text-gray-500 font-medium min-w-[20px]">
                                        {index + 1}.
                                    </span>
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => updateOption(index, e.target.value)}
                                        placeholder={`Option ${index + 1}`}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5767D0] focus:border-transparent"
                                        maxLength={100}
                                        disabled={isCreateDisabled}
                                    />
                                    {options.length > 2 && (
                                        <button
                                            onClick={() => removeOption(index)}
                                            disabled={isCreateDisabled}
                                            className={`text-red-500 hover:text-red-700 text-xl min-w-[30px] ${isCreateDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {errors.options && (
                            <p className="text-red-500 text-sm mt-2">{errors.options}</p>
                        )}
                    </div>

                    {/* Time Limit */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Time Limit (seconds) *
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                value={timeLimit}
                                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 60)}
                                min={10}
                                max={300}
                                className={`w-24 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5767D0] focus:border-transparent ${errors.timeLimit ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                disabled={isCreateDisabled}
                            />
                            <span className="text-sm text-gray-500">seconds</span>
                            <div className="flex gap-2">
                                {[30, 60, 90, 120].map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setTimeLimit(preset)}
                                        disabled={isCreateDisabled}
                                        className={`px-3 py-1 text-xs rounded ${timeLimit === preset
                                                ? 'bg-[#5767D0] text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            } ${isCreateDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {preset}s
                                    </button>
                                ))}
                            </div>
                        </div>
                        {errors.timeLimit && (
                            <p className="text-red-500 text-sm mt-1">{errors.timeLimit}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreatePoll}
                            disabled={isCreating || isCreateDisabled}
                            className={`px-6 py-2 rounded-lg font-medium transition duration-200 ${isCreating || isCreateDisabled
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-[#5767D0] hover:bg-[#4F0DCE] text-white'
                                }`}
                        >
                            {isCreating ? 'Creating...' : 'Create Poll'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatePoll;