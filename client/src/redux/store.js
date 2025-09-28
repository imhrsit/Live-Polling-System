import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import pollReducer from './slices/pollSlice';
import studentsReducer from './slices/studentsSlice';

export const store = configureStore({
    reducer: {
        user: userReducer,
        poll: pollReducer,
        students: studentsReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types for serializable check
                ignoredActions: [
                    'persist/PERSIST',
                    'persist/REHYDRATE',
                    'persist/REGISTER',
                ],
            },
        }),
    devTools: process.env.NODE_ENV !== 'production',
});

// Export store for use in components
export default store;