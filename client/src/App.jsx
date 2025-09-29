import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './redux/store';
import RoleSelection from './components/Common/RoleSelection';
import TeacherDashboard from './components/Teacher/TeacherDashboard';
import StudentInterface from './components/Student/StudentInterface';
import ConnectionStatus from './components/common/ConnectionStatus';

// Import debug utilities in development
if (import.meta.env.DEV) {
    import('./utils/debugUtils');
}

function App() {
    return (
        <Provider store={store}>
            <Router>
                <div className="App">
                    {/* Global Connection Status Indicator */}
                    <ConnectionStatus />
                    
                    <Routes>
                        {/* Default route - Role Selection */}
                        <Route path="/" element={<RoleSelection />} />

                        {/* Teacher Dashboard */}
                        <Route path="/teacher" element={<TeacherDashboard />} />

                        {/* Student Interface */}
                        <Route path="/student" element={<StudentInterface />} />

                        {/* Catch all routes and redirect to home */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </Router>
        </Provider>
    );
}

export default App;