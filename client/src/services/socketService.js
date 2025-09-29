import { io } from 'socket.io-client';
import { store } from '../redux/store';
import {
    setConnectionStatus,
    setSocketId,
} from '../redux/slices/userSlice';
import {
    setPoll,
    startPoll,
    endPoll,
    updateResults,
    updateTimer,
    confirmAnswerSubmitted,
    clearPoll,
    setError as setPollError,
} from '../redux/slices/pollSlice';
import {
    addStudent,
    removeStudent,
    addResponse,
    updateLiveStats,
    setError as setStudentsError,
} from '../redux/slices/studentsSlice';

class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.roomId = null;
        this.userType = null; // 'teacher' or 'student'
        this.connectionStatus = 'disconnected'; // 'connecting', 'connected', 'disconnected', 'error'
        this.lastDisconnectReason = null;
        this.stateRecovery = {
            enabled: true,
            lastPollState: null,
            lastUserState: null
        };
    }

    connect() {
        try {
            // Use import.meta.env for Vite or fallback to default
            const serverUrl = import.meta.env?.VITE_SOCKET_URL || 'http://localhost:5003';
            
            console.log('🔌 Connecting to socket server:', serverUrl);
            
            // Enhanced auto-reconnection configuration

            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                timeout: 20000,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay,
                reconnectionDelayMax: 5000,
                forceNew: false,
                autoConnect: true,
            });

            this.setupEventListeners();
            return this.socket;
        } catch (error) {
            console.error('Socket connection error:', error);
            this.handleConnectionError(error);
            return null;
        }
    }

    setupEventListeners() {
        if (!this.socket) return;

        // Connection events with enhanced status tracking
        this.socket.on('connect', () => {
            console.log('📡 Connected to server:', this.socket.id);
            this.isConnected = true;
            this.connectionStatus = 'connected';
            this.reconnectAttempts = 0;
            this.lastDisconnectReason = null;

            store.dispatch(setConnectionStatus({
                connected: true,
                socketId: this.socket.id,
                status: 'connected'
            }));
            store.dispatch(setSocketId(this.socket.id));

            // Attempt state recovery
            this.attemptStateRecovery();
        });

        this.socket.on('disconnect', (reason) => {
            console.log('📡 Disconnected from server:', reason);
            this.isConnected = false;
            this.connectionStatus = 'disconnected';
            this.lastDisconnectReason = reason;

            store.dispatch(setConnectionStatus({
                connected: false,
                status: 'disconnected',
                reason: reason
            }));

            // Attempt to reconnect if not a manual disconnect
            if (reason !== 'io client disconnect') {
                this.handleReconnection();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('📡 Connection error:', error);
            this.connectionStatus = 'error';
            this.handleConnectionError(error);
        });

        // Room Events
        this.socket.on('room-created', (data) => {
            console.log('🏠 Room created:', data);
            this.roomId = data.roomId;
            this.userType = 'teacher';
            
            store.dispatch(setConnectionStatus({
                connected: true,
                roomId: data.roomId,
                userType: 'teacher'
            }));
        });

        this.socket.on('joined-room', (data) => {
            console.log('🚪 Joined room:', data);
            this.roomId = data.roomId;
            this.userType = 'student';
            
            store.dispatch(setConnectionStatus({
                connected: true,
                roomId: data.roomId,
                userType: 'student'
            }));
        });

        this.socket.on('teacher-disconnected', (data) => {
            console.log('👨‍🏫 Teacher disconnected:', data);
            store.dispatch(setPollError(`Teacher has disconnected from the room`));
        });

        this.socket.on('room-closed', (data) => {
            console.log('🚪 Room closed:', data);
            this.roomId = null;
            this.userType = null;
            store.dispatch(setPollError(`Room has been closed: ${data.reason}`));
        });

        // Poll Events
        this.socket.on('poll-created', (data) => {
            console.log('📊 Poll created event received:', {
                newPoll: data.poll,
                previousPoll: store.getState().poll.currentPoll,
                roomId: data.roomId
            });
            
            // Always clear previous poll state when a new poll is created
            console.log('🧹 Clearing previous poll state for new poll');
            store.dispatch(clearPoll());
            
            // Set the new poll immediately for students
            store.dispatch(setPoll(data.poll));
            console.log('✅ New poll set in Redux:', data.poll);
            
            // Store for state recovery
            this.stateRecovery.lastPollState = data.poll;
        });

        this.socket.on('poll-started', (data) => {
            console.log('▶️ Poll started:', data);
            store.dispatch(startPoll({
                pollId: data.pollId,
                timeLimit: data.timeLimit,
                startedAt: data.startedAt
            }));
        });

        this.socket.on('poll-ended', (data) => {
            console.log('⏹️ Poll ended:', data);
            store.dispatch(endPoll({
                pollId: data.pollId,
                results: data.results,
                stats: data.stats,
                endedAt: data.endedAt,
                reason: data.reason
            }));
        });

        this.socket.on('results-update', (data) => {
            console.log('📈 Results updated:', data);
            store.dispatch(updateResults({
                results: data.results,
                totalResponses: data.totalResponses
            }));
        });

        this.socket.on('new-response', (data) => {
            console.log('✅ New response:', data);
            store.dispatch(addResponse(data));
        });

        // Student Events
        this.socket.on('student-joined', (data) => {
            console.log('👨‍🎓 Student joined:', data);
            store.dispatch(addStudent(data));
        });

        this.socket.on('student-disconnected', (data) => {
            console.log('👋 Student disconnected:', data);
            store.dispatch(removeStudent(data));
        });

        // Live Statistics
        this.socket.on('live-stats', (data) => {
            store.dispatch(updateLiveStats(data));
        });

        // Active Poll for Students
        this.socket.on('active-poll', (data) => {
            console.log('📊 Active poll received:', data.poll);
            store.dispatch(setPoll(data.poll));
            if (data.poll.isActive) {
                store.dispatch(startPoll({
                    timeLimit: data.poll.timeLimit,
                    startedAt: data.poll.startedAt
                }));
            }
        });

        // Poll Status Response
        this.socket.on('poll-status', (data) => {
            console.log('📊 Poll status received:', data);
            
            if (data.activePoll) {
                // Set the current poll (setPoll now handles active state properly)
                store.dispatch(setPoll(data.activePoll));
                console.log('✅ Poll status updated in Redux:', {
                    question: data.activePoll.question,
                    isActive: data.activePoll.isActive,
                    options: data.activePoll.options
                });
                
                if (data.results) {
                    store.dispatch(updateResults({
                        results: data.results,
                        totalResponses: data.totalResponses
                    }));
                }
            } else {
                console.log('📊 No active poll found');
                // Clear poll state if no poll exists
                store.dispatch(clearPoll());
            }
        });

        // Answer Confirmation
        this.socket.on('answer-submitted', (data) => {
            console.log('✅ Answer confirmed:', data);
            store.dispatch(confirmAnswerSubmitted(data));
        });

        // Timer Sync Response
        this.socket.on('timer-sync', (data) => {
            if (data.pollActive && data.timeLeft > 0) {
                store.dispatch(updateTimer(data.timeLeft));
            }
        });

        // Error Handling
        this.socket.on('error', (error) => {
            console.error('📡 Socket error received:', error);
            const errorMessage = error.message || 'An error occurred';

            // Dispatch to appropriate error handler based on error type
            if (error.type === 'poll' || error.type === 'server') {
                store.dispatch(setPollError(errorMessage));
            } else if (error.type === 'student') {
                store.dispatch(setStudentsError(errorMessage));
            }
        });
    }

    handleConnectionError(error) {
        this.isConnected = false;
        this.connectionStatus = 'error';
        
        store.dispatch(setConnectionStatus({
            connected: false,
            status: 'error',
            error: error.message || 'Connection failed',
            attempt: this.reconnectAttempts
        }));
        
        console.error('Socket connection failed:', error);
        
        // Try to reconnect after a delay
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.handleReconnection();
            }, 2000);
        } else {
            store.dispatch(setPollError('Unable to connect to server. Please check your connection and refresh the page.'));
        }
    }

    attemptStateRecovery() {
        if (!this.stateRecovery.enabled) return;

        // Recover user state if we were previously connected
        if (this.stateRecovery.lastUserState) {
            const { userType, roomId } = this.stateRecovery.lastUserState;
            
            if (userType === 'teacher' && roomId) {
                console.log('🔄 Attempting to recover teacher state...');
                // Teachers would need to rejoin their room
            } else if (userType === 'student' && roomId) {
                console.log('🔄 Attempting to recover student state...');
                // Students can rejoin with their existing session data
                const studentData = JSON.parse(sessionStorage.getItem('studentData') || '{}');
                if (studentData.name) {
                    this.joinAsStudent(studentData);
                }
            }
        }

        // Request current poll status
        this.getPollStatus();
    }

    handleReconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.connectionStatus = 'connecting';
            
            store.dispatch(setConnectionStatus({
                connected: false,
                status: 'connecting',
                attempt: this.reconnectAttempts,
                maxAttempts: this.maxReconnectAttempts
            }));

            console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                if (!this.isConnected) {
                    this.connect();
                }
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.connectionStatus = 'error';
            
            store.dispatch(setConnectionStatus({
                connected: false,
                status: 'error',
                message: 'Connection lost. Please refresh the page.'
            }));
            
            store.dispatch(setPollError('Connection lost. Please refresh the page.'));
        }
    }

    // Emit Events
    emit(event, data) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
            return true;
        } else {
            console.warn('Socket not connected. Cannot emit:', event);
            return false;
        }
    }

    // Room Management
    joinAsTeacher(teacherData) {
        // Store teacher state for recovery
        this.stateRecovery.lastUserState = {
            userType: 'teacher',
            data: teacherData
        };
        return this.emit('teacher-join', teacherData);
    }

    // Teacher Events
    createPoll(pollData) {
        // Use new room-aware event name
        return this.emit('create-poll', {
            ...pollData,
            roomId: this.roomId
        });
    }

    startPoll(pollId) {
        return this.emit('teacher-start-poll', { 
            pollId,
            roomId: this.roomId
        });
    }

    endPoll(pollId) {
        return this.emit('teacher-end-poll', { 
            pollId,
            roomId: this.roomId
        });
    }

    // Student Events
    joinAsStudent(studentData) {
        // Store student state for recovery
        this.stateRecovery.lastUserState = {
            userType: 'student',
            roomId: studentData.roomId || null,
            data: studentData
        };
        
        // Store in session storage for persistence
        sessionStorage.setItem('studentData', JSON.stringify(studentData));
        
        return this.emit('student-join', {
            ...studentData,
            roomId: this.roomId || studentData.roomId
        });
    }

    submitAnswer(answerData) {
        return this.emit('submit-answer', {
            ...answerData,
            roomId: this.roomId
        });
    }

    // Utility Events
    getPollStatus() {
        return this.emit('get-poll-status');
    }

    syncTimer(pollId) {
        return this.emit('sync-timer', { pollId });
    }

    // Enhanced utility methods
    forceTimerSync() {
        const state = store.getState();
        const currentPoll = state.poll.currentPoll;
        if (currentPoll?.id) {
            this.syncTimer(currentPoll.id);
        }
    }

    // Connection Management
    disconnect() {
        if (this.socket) {
            this.isConnected = false;
            this.connectionStatus = 'disconnected';
            this.socket.disconnect();
            
            // Clear state
            this.roomId = null;
            this.userType = null;
            
            store.dispatch(setConnectionStatus({
                connected: false,
                status: 'disconnected'
            }));
        }
    }

    // Connection status helpers
    isSocketConnected() {
        return this.socket && this.isConnected && this.connectionStatus === 'connected';
    }

    getConnectionStatus() {
        return {
            connected: this.isConnected,
            status: this.connectionStatus,
            socketId: this.getSocketId(),
            roomId: this.roomId,
            userType: this.userType,
            reconnectAttempts: this.reconnectAttempts,
            lastDisconnectReason: this.lastDisconnectReason
        };
    }

    getSocketId() {
        return this.socket ? this.socket.id : null;
    }

    getRoomId() {
        return this.roomId;
    }

    getUserType() {
        return this.userType;
    }

    // State management
    clearStateRecovery() {
        this.stateRecovery.lastPollState = null;
        this.stateRecovery.lastUserState = null;
        sessionStorage.removeItem('studentData');
    }

    enableStateRecovery(enabled = true) {
        this.stateRecovery.enabled = enabled;
    }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;