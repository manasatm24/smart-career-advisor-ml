const API_URL = window.location.origin.startsWith("http")
    ? window.location.origin
    : "http://127.0.0.1:5000";

async function clearSession() {
    const username = localStorage.getItem('loggedInUser');
    const logoutMessage = document.getElementById('logoutMessage');

    try {
        if (username) {
            await fetch(`${API_URL}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });
        }
    } catch (error) {
        console.error('Logout logging failed:', error);
    } finally {
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('isLoggedIn');
        if (logoutMessage) {
            logoutMessage.textContent = username
                ? 'You are signed out. Redirect to login if you want to continue.'
                : 'No active user session was found. You can login again whenever you are ready.';
        }
    }
}

function goToLogin() {
    window.location.href = 'login.html';
}

window.addEventListener('DOMContentLoaded', () => {
    void clearSession();
});
