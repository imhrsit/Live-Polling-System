import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUserType } from '../../redux/slices/userSlice';

const RoleSelection = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleRoleSelect = (role) => {
        dispatch(setUserType(role));
        navigate(`/${role}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Live Polling System
                    </h1>
                    <p className="text-gray-600">
                        Choose your role to get started
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => handleRoleSelect('teacher')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition duration-300 flex items-center justify-center group"
                    >
                        <div className="text-center">
                            <div className="text-2xl mb-2">👨‍🏫</div>
                            <div className="text-lg">Teacher</div>
                            <div className="text-sm opacity-90">Create and manage polls</div>
                        </div>
                    </button>

                    <button
                        onClick={() => handleRoleSelect('student')}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition duration-300 flex items-center justify-center group"
                    >
                        <div className="text-center">
                            <div className="text-2xl mb-2">👨‍🎓</div>
                            <div className="text-lg">Student</div>
                            <div className="text-sm opacity-90">Join and answer polls</div>
                        </div>
                    </button>
                </div>

                <div className="text-center mt-8 text-sm text-gray-500">
                    Real-time polling with live results
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;