import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentPoll: null,
    results: [],
    timeRemaining: 0,
    isActive: false,
    hasAnswered: false,
    selectedAnswer: null,
    selectedAnswerIndex: null,
    pollHistory: [],
    loading: false,
    error: null,
    totalResponses: 0,
    statistics: null
};

const pollSlice = createSlice({
    name: 'poll',
    initialState,
    reducers: {
        setPoll: (state, action) => {
            state.currentPoll = action.payload;
            state.error = null;
        },
        startPoll: (state, action) => {
            if (state.currentPoll) {
                state.currentPoll.isActive = true;
                state.currentPoll.startedAt = action.payload.startedAt;
            }
            state.isActive = true;
            state.timeRemaining = action.payload.timeLimit || 60;
            state.hasAnswered = false;
            state.selectedAnswer = null;
            state.selectedAnswerIndex = null;
        },
        endPoll: (state, action) => {
            state.isActive = false;
            state.timeRemaining = 0;
            if (state.currentPoll) {
                state.currentPoll.isActive = false;
                state.currentPoll.endedAt = action.payload.endedAt;
            }
            if (action.payload.results) {
                state.results = action.payload.results;
            }
            if (action.payload.stats) {
                state.statistics = action.payload.stats;
            }
        },
        updateTimer: (state, action) => {
            state.timeRemaining = Math.max(0, action.payload);
            if (state.timeRemaining === 0) {
                state.isActive = false;
            }
        },
        decrementTimer: (state) => {
            if (state.timeRemaining > 0) {
                state.timeRemaining -= 1;
            }
            if (state.timeRemaining === 0) {
                state.isActive = false;
            }
        },
        setResults: (state, action) => {
            state.results = action.payload.results || [];
            state.totalResponses = action.payload.totalResponses || 0;
        },
        updateResults: (state, action) => {
            state.results = action.payload.results || state.results;
            state.totalResponses = action.payload.totalResponses || state.totalResponses;
        },
        setAnswer: (state, action) => {
            state.selectedAnswer = action.payload.answer;
            state.selectedAnswerIndex = action.payload.answerIndex;
        },
        submitAnswer: (state) => {
            state.hasAnswered = true;
            state.loading = true;
        },
        confirmAnswerSubmitted: (state, action) => {
            state.hasAnswered = true;
            state.loading = false;
            if (action.payload) {
                state.selectedAnswer = action.payload.answer;
                state.selectedAnswerIndex = action.payload.answerIndex;
            }
        },
        clearPoll: (state) => {
            return initialState;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
        addToPollHistory: (state, action) => {
            state.pollHistory.unshift(action.payload);
        },
        setPollHistory: (state, action) => {
            state.pollHistory = action.payload;
        },
        setStatistics: (state, action) => {
            state.statistics = action.payload;
        }
    }
});

export const {
    setPoll,
    startPoll,
    endPoll,
    updateTimer,
    decrementTimer,
    setResults,
    updateResults,
    setAnswer,
    submitAnswer,
    confirmAnswerSubmitted,
    clearPoll,
    setLoading,
    setError,
    addToPollHistory,
    setPollHistory,
    setStatistics
} = pollSlice.actions;

export default pollSlice.reducer;

// Selectors
export const selectCurrentPoll = (state) => state.poll.currentPoll;
export const selectPollResults = (state) => state.poll.results;
export const selectTimeRemaining = (state) => state.poll.timeRemaining;
export const selectIsPollActive = (state) => state.poll.isActive;
export const selectHasAnswered = (state) => state.poll.hasAnswered;
export const selectSelectedAnswer = (state) => ({
    answer: state.poll.selectedAnswer,
    answerIndex: state.poll.selectedAnswerIndex
});
export const selectPollLoading = (state) => state.poll.loading;
export const selectPollError = (state) => state.poll.error;
export const selectTotalResponses = (state) => state.poll.totalResponses;
export const selectPollStatistics = (state) => state.poll.statistics;
export const selectPollHistory = (state) => state.poll.pollHistory;