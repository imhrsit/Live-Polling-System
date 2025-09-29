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
    }

    connect() {
        try {
            // Use import.meta.env for Vite or fallback to default
            const serverUrl = import.meta.env?.VITE_SOCKET_URL || 'http://localhost:5003';
            
            console.log('🔌 Connecting to socket server:', serverUrl);

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

        // Connection events
        this.socket.on('connect', () => {
            console.log('📡 Connected to server:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;

            store.dispatch(setConnectionStatus(true));
            store.dispatch(setSocketId(this.socket.id));
        });

        this.socket.on('disconnect', (reason) => {
            console.log('📡 Disconnected from server:', reason);
            this.isConnected = false;

            store.dispatch(setConnectionStatus(false));

            // Attempt to reconnect if not a manual disconnect
            if (reason !== 'io client disconnect') {
                this.handleReconnection();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('📡 Connection error:', error);
            this.handleConnectionError(error);
        });

        // Poll Events
        this.socket.on('poll-created', (data) => {
            console.log('📊 Poll created:', data.poll);
            store.dispatch(setPoll(data.poll));
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
            if (data.activePoll) {
                store.dispatch(setPoll(data.activePoll));
                if (data.results) {
                    store.dispatch(updateResults({
                        results: data.results,
                        totalResponses: data.totalResponses
                    }));
                }
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
        store.dispatch(setConnectionStatus(false));
        console.error('Socket connection failed:', error);
        
        // Try to reconnect after a delay
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.handleReconnection();
            }, 2000);
        }
    }

    handleReconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                if (!this.isConnected) {
                    this.connect();
                }
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('❌ Max reconnection attempts reached');
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

    // Teacher Events
    createPoll(pollData) {
        return this.emit('teacher-create-poll', pollData);
    }

    startPoll(pollId) {
        return this.emit('teacher-start-poll', { pollId });
    }

    endPoll(pollId) {
        return this.emit('teacher-end-poll', { pollId });
    }

    // Student Events
    joinAsStudent(studentData) {
        return this.emit('student-join', studentData);
    }

    submitAnswer(answerData) {
        return this.emit('submit-answer', answerData);
    }

    // Utility Events
    getPollStatus() {
        return this.emit('get-poll-status');
    }

    syncTimer(pollId) {
        return this.emit('sync-timer', { pollId });
    }

    // Connection Management
    disconnect() {
        if (this.socket) {
            this.isConnected = false;
            this.socket.disconnect();
            store.dispatch(setConnectionStatus(false));
        }
    }

    isSocketConnected() {
        return this.socket && this.isConnected;
    }

    getSocketId() {
        return this.socket ? this.socket.id : null;
    }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;