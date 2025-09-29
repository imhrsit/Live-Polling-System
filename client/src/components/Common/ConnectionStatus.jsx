import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import socketService from '../../services/socketService';

const ConnectionStatus = () => {
    const [status, setStatus] = useState(socketService.getConnectionStatus());
    const [showDetails, setShowDetails] = useState(false);
    const connectionStatus = useSelector(state => state.user.connectionStatus);

    useEffect(() => {
        const updateStatus = () => {
            setStatus(socketService.getConnectionStatus());
        };

        // Update status every second
        const interval = setInterval(updateStatus, 1000);

        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = () => {
        switch (status.status) {
            case 'connected':
                return '🟢';
            case 'connecting':
                return '🟡';
            case 'disconnected':
                return '🔴';
            case 'error':
                return '❌';
            default:
                return '⚪';
        }
    };

    const getStatusText = () => {
        switch (status.status) {
            case 'connected':
                return 'Connected';
            case 'connecting':
                return `Connecting... (${status.reconnectAttempts}/${socketService.maxReconnectAttempts})`;
            case 'disconnected':
                return 'Disconnected';
            case 'error':
                return 'Connection Error';
            default:
                return 'Unknown';
        }
    };

    const getStatusColor = () => {
        switch (status.status) {
            case 'connected':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'connecting':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'disconnected':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'error':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const handleRetryConnection = () => {
        if (!status.connected) {
            socketService.connect();
        }
    };

    const handleForceSync = () => {
        socketService.forceTimerSync();
        socketService.getPollStatus();
    };

    return (
        <div className="fixed top-4 right-4 z-50">
            <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all duration-200 ${getStatusColor()}`}
                onClick={() => setShowDetails(!showDetails)}
            >
                <span className="text-lg">{getStatusIcon()}</span>
                <span>{getStatusText()}</span>
                {status.status === 'connecting' && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ml-1"></div>
                )}
            </div>

            {/* Details Panel */}
            {showDetails && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border p-4">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-semibold text-gray-900">Connection Details</h3>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Status:</span>
                                <span className={`font-medium ${status.connected ? 'text-green-600' : 'text-red-600'}`}>
                                    {getStatusText()}
                                </span>
                            </div>

                            {status.socketId && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Socket ID:</span>
                                    <span className="font-mono text-xs text-gray-800">
                                        {status.socketId.substring(0, 8)}...
                                    </span>
                                </div>
                            )}

                            {status.roomId && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Room:</span>
                                    <span className="font-mono text-xs text-gray-800">
                                        {status.roomId.substring(0, 12)}...
                                    </span>
                                </div>
                            )}

                            {status.userType && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Role:</span>
                                    <span className="font-medium capitalize text-[#5767D0]">
                                        {status.userType}
                                    </span>
                                </div>
                            )}

                            {status.reconnectAttempts > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Reconnect Attempts:</span>
                                    <span className="text-yellow-600 font-medium">
                                        {status.reconnectAttempts}
                                    </span>
                                </div>
                            )}

                            {status.lastDisconnectReason && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Last Disconnect:</span>
                                    <span className="text-red-600 text-xs">
                                        {status.lastDisconnectReason}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="border-t pt-3 space-y-2">
                            {!status.connected && (
                                <button
                                    onClick={handleRetryConnection}
                                    className="w-full px-3 py-2 bg-[#5767D0] text-white rounded-md text-sm font-medium hover:bg-[#4F0DCE] transition-colors"
                                >
                                    🔄 Retry Connection
                                </button>
                            )}

                            <button
                                onClick={handleForceSync}
                                className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                                🔄 Force Sync
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConnectionStatus;