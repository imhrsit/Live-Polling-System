import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectStudentCount } from '../../redux/slices/studentsSlice';
import { selectConnectionStatus } from '../../redux/slices/userSlice';
import socketService from '../../services/socketService';

const LiveStudentCounter = ({ showDetails = false }) => {
    const studentCount = useSelector(selectStudentCount);
    const connectionStatus = useSelector(selectConnectionStatus);
    const [previousCount, setPreviousCount] = useState(0);
    const [animateChange, setAnimateChange] = useState(false);

    useEffect(() => {
        if (studentCount !== previousCount) {
            setAnimateChange(true);
            setPreviousCount(studentCount);
            
            const timer = setTimeout(() => {
                setAnimateChange(false);
            }, 500);
            
            return () => clearTimeout(timer);
        }
    }, [studentCount, previousCount]);

    const getCounterColor = () => {
        if (!connectionStatus.connected) return 'text-gray-400 bg-gray-100';
        if (animateChange) return 'text-green-600 bg-green-100';
        return 'text-[#5767D0] bg-[#5767D0]/10';
    };

    const getChangeIndicator = () => {
        const change = studentCount - previousCount;
        if (change > 0) return `+${change}`;
        if (change < 0) return change.toString();
        return null;
    };

    return (
        <div className="flex items-center gap-3">
            {/* Student Count Display */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${getCounterColor()} ${animateChange ? 'scale-110 shadow-md' : 'border-gray-200'}`}>
                <span className="text-lg">👨‍🎓</span>
                <div className="flex flex-col">
                    <span className={`font-bold text-lg leading-tight ${animateChange ? 'scale-110' : ''}`}>
                        {studentCount}
                    </span>
                    <span className="text-xs opacity-75">
                        {studentCount === 1 ? 'Student' : 'Students'}
                    </span>
                </div>
                
                {/* Change Indicator */}
                {animateChange && getChangeIndicator() && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${studentCount > previousCount 
                        ? 'text-green-600 bg-green-100' 
                        : 'text-red-600 bg-red-100'
                    }`}>
                        {getChangeIndicator()}
                    </span>
                )}
            </div>

            {/* Connection Status Indicator */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${connectionStatus.connected 
                ? 'text-green-600 bg-green-50' 
                : 'text-red-600 bg-red-50'
            }`}>
                <div className={`w-2 h-2 rounded-full ${connectionStatus.connected 
                    ? 'bg-green-500 animate-pulse' 
                    : 'bg-red-500'
                }`}></div>
                <span>
                    {connectionStatus.connected ? 'Live' : 'Offline'}
                </span>
            </div>

            {/* Detailed Stats (Optional) */}
            {showDetails && connectionStatus.roomId && (
                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    Room: {connectionStatus.roomId.split('_')[2] || 'Unknown'}
                </div>
            )}
        </div>
    );
};

export default LiveStudentCounter;