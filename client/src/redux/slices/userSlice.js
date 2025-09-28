import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    type: null, // 'teacher' | 'student' | null
    name: null,
    id: null,
    tabId: null,
    isConnected: false,
    socketId: null
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUserType: (state, action) => {
            state.type = action.payload;
        },
        setTeacher: (state, action) => {
            state.type = 'teacher';
            state.name = action.payload.name;
            state.id = action.payload.id || 'teacher';
            state.isConnected = true;
        },
        setStudent: (state, action) => {
            state.type = 'student';
            state.name = action.payload.name;
            state.id = action.payload.id;
            state.tabId = action.payload.tabId;
            state.isConnected = true;
        },
        setSocketId: (state, action) => {
            state.socketId = action.payload;
        },
        setConnectionStatus: (state, action) => {
            state.isConnected = action.payload;
        },
        clearUser: (state) => {
            return initialState;
        },
        updateUserInfo: (state, action) => {
            Object.assign(state, action.payload);
        }
    }
});

export const {
    setUserType,
    setTeacher,
    setStudent,
    setSocketId,
    setConnectionStatus,
    clearUser,
    updateUserInfo
} = userSlice.actions;

export default userSlice.reducer;

// Selectors
export const selectUser = (state) => state.user;
export const selectUserType = (state) => state.user.type;
export const selectIsTeacher = (state) => state.user.type === 'teacher';
export const selectIsStudent = (state) => state.user.type === 'student';
export const selectIsConnected = (state) => state.user.isConnected;