const API_URL = window.location.origin.startsWith("http")
    ? window.location.origin
    : "http://127.0.0.1:5000";

function registerUser() {
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const result = document.getElementById("result");

    result.className = "auth-message";
    result.textContent = "";

    if (!username || !email || !password || !confirmPassword) {
        result.classList.add("auth-error");
        result.textContent = "Please fill in all required fields.";
        return;
    }

    if (password !== confirmPassword) {
        result.classList.add("auth-error");
        result.textContent = "Passwords do not match.";
        return;
    }

    fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username,
            password,
            email,
        }),
    })
        .then(async (response) => {
            const data = await response.json();
            if (response.ok) {
                result.classList.add("auth-success");
                result.textContent = data.message || "Registration completed successfully.";
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1400);
            } else {
                result.classList.add("auth-error");
                result.textContent = data.message || "Unable to register user.";
            }
        })
        .catch(() => {
            result.classList.add("auth-error");
            result.textContent = "Unable to reach server. Please try again.";
        });
}
