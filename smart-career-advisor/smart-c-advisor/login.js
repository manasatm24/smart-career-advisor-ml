const API_URL = window.location.origin.startsWith("http")
    ? window.location.origin
    : "http://127.0.0.1:5000";

function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const result = document.getElementById('result');

    result.className = 'auth-message';
    result.textContent = '';

    if (!username || !password) {
        result.classList.add('auth-error');
        result.textContent = 'Please enter your username and password.';
        return;
    }

    // Check if admin login
    if (username === 'admin') {
        // Admin login
        fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        })
        .then(async response => {
            const data = await response.json();
            if (response.ok && data.token) {
                localStorage.setItem('adminToken', data.token);
                result.classList.add('auth-success');
                result.textContent = 'Admin login successful. Redirecting...';
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 900);
            } else {
                result.classList.add('auth-error');
                result.textContent = data.error || 'Invalid admin credentials.';
            }
        })
        .catch(() => {
            result.classList.add('auth-error');
            result.textContent = 'Server error. Please try again later.';
        });
    } else {
        // Regular user login
        fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        })
        .then(async response => {
            const data = await response.json();
            if (response.ok && data.message === 'Login successful') {
                localStorage.setItem('loggedInUser', username);
                localStorage.setItem('isLoggedIn', 'true');
                result.classList.add('auth-success');
                result.textContent = 'Login successful. Redirecting...';
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 900);
            } else {
                result.classList.add('auth-error');
                result.textContent = data.message || 'Invalid username or password.';
            }
        })
        .catch(() => {
            result.classList.add('auth-error');
            result.textContent = 'Server error. Please try again later.';
        });
    }
}
