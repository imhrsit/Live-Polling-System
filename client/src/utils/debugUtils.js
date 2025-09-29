// Utility functions for debugging and clearing cached poll data

export const clearAllPollCache = () => {
    // Clear sessionStorage poll-related data
    const keysToRemove = ['pollData', 'currentPoll', 'pollResults'];
    keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });
    
    console.log('🧹 Cleared all poll cache data');
};

export const debugPollState = () => {
    const state = window.__REDUX_DEVTOOLS_EXTENSION__ ? 
        window.__REDUX_DEVTOOLS_EXTENSION__.getState() : 
        null;
    
    if (state) {
        console.log('📊 Current Poll State:', {
            currentPoll: state.poll?.currentPoll,
            isActive: state.poll?.isActive,
            hasAnswered: state.poll?.hasAnswered,
            results: state.poll?.results
        });
    }
};

export const debugSocketConnection = () => {
    const socketService = window.socketService || null;
    if (socketService) {
        console.log('🔌 Socket Connection Status:', socketService.getConnectionStatus());
    }
};

// Add to window for easy debugging
if (typeof window !== 'undefined') {
    window.clearAllPollCache = clearAllPollCache;
    window.debugPollState = debugPollState;
    window.debugSocketConnection = debugSocketConnection;
    
    console.log('🔧 Debug utilities added to window:');
    console.log('- window.clearAllPollCache()');
    console.log('- window.debugPollState()');
    console.log('- window.debugSocketConnection()');
}