import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUserType } from '../../redux/slices/userSlice';

const RoleSelection = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [selectedRole, setSelectedRole] = useState(null);

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
    };

    const handleContinue = () => {
        if (selectedRole) {
            dispatch(setUserType(selectedRole));
            navigate(`/${selectedRole}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
            {/* Intervue Poll Logo */}
            <div className="mb-16">
                <div className="bg-[#5767D0] text-white px-6 py-3 rounded-full text-sm font-medium flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    Intervue Poll
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl w-full text-center">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-5xl font-bold text-gray-900 mb-4">
                        Welcome to the <span className="text-gray-900">Live Polling System</span>
                    </h1>
                    <p className="text-gray-500 text-lg">
                        Select your role to get started
                    </p>
                </div>

                {/* Role Selection Cards */}
                <div className="flex justify-center gap-8 mb-12">
                    {/* Student Card */}
                    <div
                        onClick={() => handleRoleSelect('student')}
                        className={`cursor-pointer border-2 rounded-2xl p-8 w-72 h-56 flex flex-col justify-center transition-all duration-200 ${
                            selectedRole === 'student'
                                ? 'border-[#7785DA] bg-[#7785DA]/5'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">I'm a Student</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Join polls, submit answers, and see live results in real-time.
                        </p>
                    </div>

                    {/* Teacher Card */}
                    <div
                        onClick={() => handleRoleSelect('teacher')}
                        className={`cursor-pointer border-2 rounded-2xl p-8 w-72 h-56 flex flex-col justify-center transition-all duration-200 ${
                            selectedRole === 'teacher'
                                ? 'border-[#7785DA] bg-[#7785DA]/5'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">I'm a Teacher</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Create and manage polls, track student responses, and view live statistics.
                        </p>
                    </div>
                </div>

                {/* Continue Button */}
                <div className="flex justify-center">
                    <button
                        onClick={handleContinue}
                        disabled={!selectedRole}
                        className={`px-12 py-4 rounded-full text-white font-semibold text-lg transition-all duration-200 ${
                            selectedRole
                                ? 'bg-[#7785DA] hover:bg-[#5767D0] cursor-pointer'
                                : 'bg-gray-300 cursor-not-allowed'
                        }`}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;