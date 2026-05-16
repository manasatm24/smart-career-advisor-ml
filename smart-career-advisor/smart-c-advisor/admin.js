const API_URL = window.location.origin.startsWith("http")
    ? window.location.origin
    : "http://127.0.0.1:5000";

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
        alert("Access denied! Please login first.");
        window.location.href = "index.html";
        return;
    }

    loadStatistics();
    loadFeedback();
    loadLoginActivity();
    setupEventListeners();
});

function setupEventListeners() {
    const logoutButton = document.getElementById("logoutBtn");
    if (logoutButton) {
        logoutButton.addEventListener("click", handleAdminLogout);
    }

    const loadCareersButton = document.getElementById("loadCareersBtn");
    if (loadCareersButton) {
        loadCareersButton.addEventListener("click", loadCareers);
    }

    const addCareerButton = document.getElementById("addCareerBtn");
    if (addCareerButton) {
        addCareerButton.addEventListener("click", () => showModal("careerModal"));
    }

    const loadJobsButton = document.getElementById("loadJobsBtn");
    if (loadJobsButton) {
        loadJobsButton.addEventListener("click", loadJobs);
    }

    const addJobButton = document.getElementById("addJobBtn");
    if (addJobButton) {
        addJobButton.addEventListener("click", () => showModal("jobModal"));
    }

    const refreshFeedbackButton = document.getElementById("refreshFeedbackBtn");
    if (refreshFeedbackButton) {
        refreshFeedbackButton.addEventListener("click", loadFeedback);
    }

    const refreshLoginActivityButton = document.getElementById("refreshLoginActivityBtn");
    if (refreshLoginActivityButton) {
        refreshLoginActivityButton.addEventListener("click", loadLoginActivity);
    }

    document.querySelectorAll(".close").forEach((closeButton) => {
        closeButton.addEventListener("click", () => {
            document.querySelectorAll(".modal").forEach((modal) => {
                modal.style.display = "none";
            });
        });
    });

    const careerForm = document.getElementById("careerForm");
    if (careerForm) {
        careerForm.addEventListener("submit", handleCareerSubmit);
    }

    const jobForm = document.getElementById("jobForm");
    if (jobForm) {
        jobForm.addEventListener("submit", handleJobSubmit);
    }

    window.addEventListener("click", (event) => {
        if (event.target.classList.contains("modal")) {
            event.target.style.display = "none";
        }
    });
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "block";
    }
}

async function handleAdminLogout() {
    const token = localStorage.getItem("adminToken");

    try {
        if (token) {
            await fetch(`${API_URL}/admin/logout`, {
                method: "POST",
                headers: { "X-Admin-Token": token },
            });
        }
    } catch (error) {
        console.error("Error logging out admin:", error);
    } finally {
        localStorage.removeItem("adminToken");
        alert("Logged out!");
        window.location.href = "index.html";
    }
}

async function loadStatistics() {
    try {
        const feedbackResponse = await fetch(`${API_URL}/api/get_feedback`);
        const feedbackData = await feedbackResponse.json();

        document.getElementById("totalFeedback").textContent = Array.isArray(feedbackData)
            ? feedbackData.length
            : 0;
    } catch (error) {
        console.error("Error loading statistics:", error);
        document.getElementById("totalFeedback").textContent = "0";
    }
}

async function loadCareers() {
    const careersList = document.getElementById("careersList");
    if (!careersList) {
        return;
    }

    try {
        const token = localStorage.getItem("adminToken");
        const response = await fetch(`${API_URL}/admin/careers`, {
            headers: { "X-Admin-Token": token },
        });
        const careers = await response.json();

        careersList.innerHTML = "";

        careers.forEach((career) => {
            const careerDiv = document.createElement("div");
            careerDiv.innerHTML = `
                <div class="item-info">
                    <strong>${career.role}</strong> - ${career.branch}<br>
                    <small>Skills: ${career.skills}</small>
                </div>
                <div class="item-actions">
                    <button class="delete-btn" onclick="deleteCareer(${career.id})">Delete</button>
                </div>
            `;
            careersList.appendChild(careerDiv);
        });
    } catch (error) {
        console.error("Error loading careers:", error);
        careersList.innerHTML = "<p>Error loading careers</p>";
    }
}

async function loadJobs() {
    const jobsList = document.getElementById("jobsList");
    if (!jobsList) {
        return;
    }

    try {
        const token = localStorage.getItem("adminToken");
        const response = await fetch(`${API_URL}/admin/jobs`, {
            headers: { "X-Admin-Token": token },
        });
        const jobs = await response.json();

        jobsList.innerHTML = "";

        jobs.forEach((job) => {
            const jobDiv = document.createElement("div");
            jobDiv.innerHTML = `
                <div class="item-info">
                    <strong>${job.role}</strong> at ${job.company}<br>
                    <small>${job.location} - ${job.salary}</small>
                </div>
                <div class="item-actions">
                    <button class="delete-btn" onclick="deleteJob(${job.id})">Delete</button>
                </div>
            `;
            jobsList.appendChild(jobDiv);
        });
    } catch (error) {
        console.error("Error loading jobs:", error);
        jobsList.innerHTML = "<p>Error loading jobs</p>";
    }
}

async function handleCareerSubmit(event) {
    event.preventDefault();

    const branch = document.getElementById("careerBranch").value;
    const role = document.getElementById("careerRole").value;
    const skills = document.getElementById("careerSkills").value;
    const description = document.getElementById("careerDescription").value;

    try {
        const token = localStorage.getItem("adminToken");
        const response = await fetch(`${API_URL}/admin/careers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Admin-Token": token,
            },
            body: JSON.stringify({
                branch: branch,
                role: role,
                skills: skills.split(",").map((skill) => skill.trim()),
                description: description,
            }),
        });

        if (response.ok) {
            alert("Career added successfully!");
            document.getElementById("careerForm").reset();
            document.getElementById("careerModal").style.display = "none";
            loadCareers();
        } else {
            alert("Error adding career");
        }
    } catch (error) {
        console.error("Error adding career:", error);
        alert("Error adding career");
    }
}

async function handleJobSubmit(event) {
    event.preventDefault();

    const title = document.getElementById("jobTitle").value;
    const company = document.getElementById("jobCompany").value;
    const location = document.getElementById("jobLocation").value;
    const eligibility = document.getElementById("jobEligibility").value;
    const salary = document.getElementById("jobSalary").value;

    try {
        const token = localStorage.getItem("adminToken");
        const response = await fetch(`${API_URL}/admin/jobs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Admin-Token": token,
            },
            body: JSON.stringify({
                company: company,
                role: title,
                location: location,
                eligibility: eligibility,
                salary: salary,
            }),
        });

        if (response.ok) {
            alert("Job added successfully!");
            document.getElementById("jobForm").reset();
            document.getElementById("jobModal").style.display = "none";
            loadJobs();
            loadStatistics();
        } else {
            alert("Error adding job");
        }
    } catch (error) {
        console.error("Error adding job:", error);
        alert("Error adding job");
    }
}

async function deleteCareer(id) {
    if (!confirm("Delete this career?")) {
        return;
    }

    try {
        const token = localStorage.getItem("adminToken");
        await fetch(`${API_URL}/admin/careers/${id}`, {
            method: "DELETE",
            headers: { "X-Admin-Token": token },
        });

        loadCareers();
    } catch (error) {
        console.error("Error deleting career:", error);
    }
}

async function deleteJob(id) {
    if (!confirm("Delete this job?")) {
        return;
    }

    try {
        const token = localStorage.getItem("adminToken");
        await fetch(`${API_URL}/admin/jobs/${id}`, {
            method: "DELETE",
            headers: { "X-Admin-Token": token },
        });

        loadJobs();
        loadStatistics();
    } catch (error) {
        console.error("Error deleting job:", error);
    }
}

async function loadFeedback() {
    const tableBody = document.querySelector("#feedbackTable tbody");
    if (!tableBody) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/get_feedback`);
        const data = await response.json();

        tableBody.innerHTML = "";

        data.forEach((feedbackItem) => {
            tableBody.innerHTML += `
                <tr>
                    <td>${feedbackItem.user_name}</td>
                    <td>${feedbackItem.email}</td>
                    <td>${feedbackItem.comments}</td>
                    <td>${feedbackItem.rating}/5</td>
                    <td><button class="delete-btn" onclick="deleteFeedback(${feedbackItem.id})">Delete</button></td>
                </tr>
            `;
        });

        document.getElementById("totalFeedback").textContent = data.length;
    } catch (error) {
        console.error("Error loading feedback:", error);
    }
}

async function deleteFeedback(id) {
    if (!confirm("Delete this feedback?")) {
        return;
    }

    await fetch(`${API_URL}/api/delete_feedback/${id}`, {
        method: "DELETE",
    });

    loadFeedback();
}

async function loadLoginActivity() {
    const tableBody = document.querySelector("#loginActivityTable tbody");
    if (!tableBody) {
        return;
    }

    const refreshButton = document.getElementById("refreshLoginActivityBtn");
    const status = document.getElementById("loginActivityStatus");
    const token = localStorage.getItem("adminToken");

    if (!token) {
        renderLoginActivityError("Admin session expired. Please login again.");
        return;
    }

    if (refreshButton) {
        refreshButton.disabled = true;
    }

    if (status) {
        status.className = "status-text";
        status.textContent = "Loading the latest 50 login events...";
    }

    try {
        const response = await fetch(`${API_URL}/admin/login-logs`, {
            headers: { "X-Admin-Token": token },
        });
        const logs = await response.json();

        if (!response.ok) {
            throw new Error(logs.error || "Unable to load login activity.");
        }

        renderLoginActivityRows(logs);

        if (status) {
            status.textContent = logs.length
                ? ""
                : "No login or logout activity has been recorded yet.";
        }
    } catch (error) {
        console.error("Error loading login activity:", error);
        renderLoginActivityError(error.message || "Unable to load login activity.");
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
        }
    }
}

function renderLoginActivityRows(logs) {
    const tableBody = document.querySelector("#loginActivityTable tbody");
    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!Array.isArray(logs) || logs.length === 0) {
        const emptyRow = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.colSpan = 3;
        emptyCell.textContent = "No recent login activity found.";
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
        return;
    }

    logs.forEach((log) => {
        const row = document.createElement("tr");
        appendCell(row, log.username || "Unknown user");
        appendCell(row, formatAction(log.action));
        appendCell(row, formatTimestamp(log.timestamp));
        tableBody.appendChild(row);
    });
}

function renderLoginActivityError(message) {
    const tableBody = document.querySelector("#loginActivityTable tbody");
    const status = document.getElementById("loginActivityStatus");

    if (status) {
        status.className = "status-text error";
        status.textContent = message;
    }

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    const errorRow = document.createElement("tr");
    const errorCell = document.createElement("td");
    errorCell.colSpan = 3;
    errorCell.textContent = "Recent activity could not be loaded.";
    errorRow.appendChild(errorCell);
    tableBody.appendChild(errorRow);
}

function appendCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
}

function formatAction(action) {
    const normalizedAction = String(action || "").trim().toLowerCase();
    if (!normalizedAction) {
        return "Unknown";
    }

    return normalizedAction.charAt(0).toUpperCase() + normalizedAction.slice(1);
}

function formatTimestamp(timestamp) {
    if (!timestamp) {
        return "Unknown";
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return timestamp;
    }

    return date.toLocaleString();
}
