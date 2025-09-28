import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    list: [],
    count: 0,
    responses: [],
    liveStats: {
        totalStudents: 0,
        totalResponses: 0,
        activePollId: null
    },
    recentJoins: [],
    loading: false,
    error: null
};

const studentsSlice = createSlice({
    name: 'students',
    initialState,
    reducers: {
        setStudents: (state, action) => {
            state.list = action.payload;
            state.count = action.payload.length;
        },
        addStudent: (state, action) => {
            const student = action.payload.student;
            const existingIndex = state.list.findIndex(s => s.id === student.id);

            if (existingIndex >= 0) {
                // Update existing student
                state.list[existingIndex] = student;
            } else {
                // Add new student
                state.list.push(student);
                state.recentJoins.unshift({
                    ...student,
                    joinedAt: new Date().toISOString()
                });

                // Keep only last 5 recent joins
                if (state.recentJoins.length > 5) {
                    state.recentJoins = state.recentJoins.slice(0, 5);
                }
            }

            state.count = action.payload.totalStudents || state.list.length;
        },
        removeStudent: (state, action) => {
            const studentId = action.payload.studentId;
            state.list = state.list.filter(student => student.id !== studentId);
            state.count = action.payload.totalStudents || state.list.length;
        },
        addResponse: (state, action) => {
            const response = {
                id: Date.now() + Math.random(),
                pollId: action.payload.pollId,
                studentName: action.payload.studentName,
                answer: action.payload.answer,
                answerIndex: action.payload.answerIndex,
                responseTime: action.payload.responseTime,
                timestamp: new Date().toISOString()
            };

            state.responses.unshift(response);

            // Keep only last 50 responses
            if (state.responses.length > 50) {
                state.responses = state.responses.slice(0, 50);
            }
        },
        setResponses: (state, action) => {
            state.responses = action.payload;
        },
        clearResponses: (state) => {
            state.responses = [];
        },
        updateLiveStats: (state, action) => {
            state.liveStats = {
                ...state.liveStats,
                ...action.payload
            };

            // Update count if totalStudents is provided
            if (action.payload.totalStudents !== undefined) {
                state.count = action.payload.totalStudents;
            }
        },
        clearStudents: (state) => {
            state.list = [];
            state.count = 0;
            state.recentJoins = [];
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
        clearError: (state) => {
            state.error = null;
        },
        markStudentAsAnswered: (state, action) => {
            const studentName = action.payload;
            const student = state.list.find(s => s.name === studentName);
            if (student) {
                student.hasAnswered = true;
                student.answeredAt = new Date().toISOString();
            }
        },
        resetStudentsAnswerStatus: (state) => {
            state.list.forEach(student => {
                student.hasAnswered = false;
                student.answeredAt = null;
            });
        }
    }
});

export const {
    setStudents,
    addStudent,
    removeStudent,
    addResponse,
    setResponses,
    clearResponses,
    updateLiveStats,
    clearStudents,
    setLoading,
    setError,
    clearError,
    markStudentAsAnswered,
    resetStudentsAnswerStatus
} = studentsSlice.actions;

export default studentsSlice.reducer;

// Selectors
export const selectStudents = (state) => state.students.list;
export const selectStudentCount = (state) => state.students.count;
export const selectStudentResponses = (state) => state.students.responses;
export const selectLiveStats = (state) => state.students.liveStats;
export const selectRecentJoins = (state) => state.students.recentJoins;
export const selectStudentsLoading = (state) => state.students.loading;
export const selectStudentsError = (state) => state.students.error;
export const selectAnsweredStudents = (state) =>
    state.students.list.filter(student => student.hasAnswered);
export const selectUnansweredStudents = (state) =>
    state.students.list.filter(student => !student.hasAnswered);