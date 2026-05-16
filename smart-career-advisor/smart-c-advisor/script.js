const API_BASE_URL = window.location.origin.startsWith("http")
    ? window.location.origin
    : "http://127.0.0.1:5000";

const ROLE_COMPANIES = {
    "Software Developer": "TCS, Infosys, Accenture, Wipro",
    "Data Analyst": "Google, Amazon, Deloitte",
    "AI Engineer": "Microsoft, NVIDIA, OpenAI",
    "Cybersecurity Analyst": "Cisco, Palo Alto Networks",
    "Cloud Engineer": "AWS, Azure, IBM",
    "Web Developer": "Zoho, Flipkart, Swiggy",
    "Project Manager": "Accenture, Cognizant, Capgemini",
    "System Administrator": "IBM, HCL, Wipro",
};

let cachedCareers = null;
let cachedJobs = null;

document.addEventListener("DOMContentLoaded", () => {
    initializeAuthUi();
    initializeCareerForm();
    initializeFeedbackForm();
});

function initializeAuthUi() {
    const userGreeting = document.getElementById("userGreeting");
    const logoutBtn = document.getElementById("logoutBtn");

    if (userGreeting) {
        const username = localStorage.getItem("loggedInUser");
        if (username) {
            userGreeting.textContent = `Hello, ${username}`;
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            const username = localStorage.getItem("loggedInUser");

            try {
                if (username) {
                    await fetch(`${API_BASE_URL}/logout`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username }),
                    });
                }
            } catch (error) {
                console.error("Logout logging failed:", error);
            } finally {
                localStorage.removeItem("loggedInUser");
                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("adminToken");
                window.location.href = "login.html";
            }
        });
    }
}

function initializeCareerForm() {
    const careerForm = document.getElementById("careerForm");
    if (!careerForm) {
        return;
    }

    const yearsGroup = document.getElementById("yearsGroup");
    const resultsSection = document.getElementById("resultsSection");
    const careersDiv = document.getElementById("careerResults");
    const jobsDiv = document.getElementById("jobResults");
    const preferredRoleEl = document.getElementById("preferredRole");
    const roleMsgEl = document.getElementById("roleCompanyMsg");

    const updateYearsVisibility = () => {
        const experienceType = document.querySelector('input[name="expType"]:checked')?.value || "Fresher";
        if (!yearsGroup) {
            return;
        }

        if (experienceType === "Experienced") {
            yearsGroup.classList.remove("hidden");
        } else {
            yearsGroup.classList.add("hidden");
        }
    };

    document.querySelectorAll('input[name="expType"]').forEach((radio) => {
        radio.addEventListener("change", updateYearsVisibility);
    });
    updateYearsVisibility();

    if (preferredRoleEl && roleMsgEl) {
        preferredRoleEl.addEventListener("change", () => {
            const role = preferredRoleEl.value;
            roleMsgEl.textContent = role
                ? `${role} roles are available at companies such as: ${ROLE_COMPANIES[role] || "various companies"}.`
                : "";
        });
    }

    careerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const profile = {
            branch: document.getElementById("branch")?.value || "",
            interested: gatherCheckedValues("interestedSkill"),
            learned: gatherCheckedValues("learnedSkill"),
            experienceType: document.querySelector('input[name="expType"]:checked')?.value || "Fresher",
            years: document.getElementById("years")?.value || "",
            preferredRole: document.getElementById("preferredRole")?.value || "",
            preferredLocation: document.getElementById("preferredLocation")?.value || "",
        };

        if (!profile.branch) {
            alert("Please select your academic branch.");
            return;
        }

        careersDiv.innerHTML = `<div class="card"><div class="small-muted">Loading recommendations...</div></div>`;
        jobsDiv.innerHTML = "";

        try {
            const { careers, jobs } = await loadDatasets();
            const recommendedRoles = recommendCareers(profile, careers, jobs);
            const matchedJobs = matchJobs(profile, recommendedRoles, jobs);

            renderCareers(careersDiv, recommendedRoles);
            renderJobs(jobsDiv, matchedJobs);

            if (resultsSection) {
                resultsSection.classList.remove("hidden");
                resultsSection.scrollIntoView({ behavior: "smooth" });
            }
        } catch (error) {
            console.error("Recommendation flow failed:", error);
            careersDiv.innerHTML = `<div class="card"><div style="color:#ffb3b3">Error: ${escapeHtml(error.message)}</div></div>`;
            jobsDiv.innerHTML = "";
        }
    });
}

function initializeFeedbackForm() {
    const feedbackForm = document.getElementById("feedbackForm");
    if (!feedbackForm) {
        return;
    }

    feedbackForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("name")?.value.trim();
        const email = document.getElementById("email")?.value.trim();
        const message = document.getElementById("message")?.value.trim();

        if (!name || !email || !message) {
            showPopup("Please fill all fields.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, message }),
            });

            const data = await response.json();
            if (response.ok) {
                showPopup("Feedback sent successfully.");
                feedbackForm.reset();
            } else {
                showPopup(data.error || "Failed to send feedback.");
            }
        } catch (error) {
            console.error("Feedback submission failed:", error);
            showPopup("Error connecting to server.");
        }
    });
}

async function loadDatasets() {
    if (cachedCareers && cachedJobs) {
        return { careers: cachedCareers, jobs: cachedJobs };
    }

    const [careersResponse, jobsResponse] = await Promise.all([
        fetch("data/careers.json"),
        fetch("data/jobs.json"),
    ]);

    if (!careersResponse.ok) {
        throw new Error(`Failed to load careers data (${careersResponse.status})`);
    }

    if (!jobsResponse.ok) {
        throw new Error(`Failed to load jobs data (${jobsResponse.status})`);
    }

    cachedCareers = await careersResponse.json();
    cachedJobs = await jobsResponse.json();
    return { careers: cachedCareers, jobs: cachedJobs };
}

function gatherCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((element) => element.value);
}

function recommendCareers(profile, careers, jobs = []) {
    const branch = String(profile.branch || "").trim().toUpperCase();
    const preferredRole = String(profile.preferredRole || "").trim();
    const preferredLocation = String(profile.preferredLocation || "").trim();
    const selectedSkills = new Set(
        [...profile.interested, ...profile.learned].map((skill) => String(skill).toLowerCase())
    );

    const rankedCareers = careers
        .map((career, index) => {
            const careerName = career.career || career.title || "Suggested Role";
            const requiredSkills = (career.skills || []).map((skill) => String(skill).toLowerCase());
            const skillScore = requiredSkills.filter((skill) => selectedSkills.has(skill)).length;
            const branchScore = (career.branch || "").toUpperCase() === branch ? 1 : 0;
            const preferredRoleScore = !preferredRole
                ? 0
                : careerName.toLowerCase() === preferredRole.toLowerCase()
                  ? 2
                  : rolesCloselyMatch(preferredRole, careerName)
                    ? 1
                    : 0;
            const locationScore = countRoleMatchesInLocation(careerName, preferredLocation, jobs);

            return {
                name: careerName,
                preferredRoleScore,
                skillScore,
                locationScore,
                branchScore,
                index,
            };
        })
        .sort((left, right) => {
            if (preferredRole) {
                return (
                    right.preferredRoleScore - left.preferredRoleScore ||
                    right.skillScore - left.skillScore ||
                    right.locationScore - left.locationScore ||
                    right.branchScore - left.branchScore ||
                    left.index - right.index
                );
            }

            return (
                right.skillScore - left.skillScore ||
                right.locationScore - left.locationScore ||
                right.branchScore - left.branchScore ||
                left.index - right.index
            );
        });

    if (!rankedCareers.length) {
        return [];
    }

    return [rankedCareers[0].name];
}

function tokenizeText(text) {
    return new Set(
        String(text || "")
            .toLowerCase()
            .trim()
            .split(/[^a-z0-9]+/)
            .filter((token) => token.length >= 2)
    );
}

function expandRoleTokens(tokens) {
    const roleTokenEquivalents = {
        administrator: ["admin"],
        admin: ["administrator"],
        cybersecurity: ["security"],
        developer: ["engineer"],
        engineer: ["developer"],
        frontend: ["web"],
        security: ["cybersecurity"],
        web: ["frontend"],
    };

    const expandedTokens = new Set(tokens);
    tokens.forEach((token) => {
        (roleTokenEquivalents[token] || []).forEach((equivalentToken) => {
            expandedTokens.add(equivalentToken);
        });
    });
    return expandedTokens;
}

function rolesCloselyMatch(primaryRole, comparisonRole) {
    const normalizedPrimaryRole = String(primaryRole || "").trim().toLowerCase();
    const normalizedComparisonRole = String(comparisonRole || "").trim().toLowerCase();

    if (!normalizedPrimaryRole || !normalizedComparisonRole) {
        return false;
    }

    if (normalizedPrimaryRole === normalizedComparisonRole) {
        return true;
    }

    if (
        normalizedPrimaryRole.includes(normalizedComparisonRole) ||
        normalizedComparisonRole.includes(normalizedPrimaryRole)
    ) {
        return true;
    }

    const primaryRoleTokens = tokenizeText(normalizedPrimaryRole);
    const comparisonRoleTokens = tokenizeText(normalizedComparisonRole);

    if (primaryRoleTokens.size === 0 || comparisonRoleTokens.size === 0) {
        return false;
    }

    const expandedPrimaryRoleTokens = expandRoleTokens(primaryRoleTokens);
    const expandedComparisonRoleTokens = expandRoleTokens(comparisonRoleTokens);

    return (
        [...primaryRoleTokens].every((token) => expandedComparisonRoleTokens.has(token)) ||
        [...comparisonRoleTokens].every((token) => expandedPrimaryRoleTokens.has(token))
    );
}

function countRoleMatchesInLocation(roleName, preferredLocation, jobs) {
    const normalizedLocation = String(preferredLocation || "").trim().toLowerCase();
    if (!normalizedLocation) {
        return 0;
    }

    return jobs.reduce((totalMatches, company) => {
        const roles = company.job_roles || company.jobs || company.positions || [];

        return (
            totalMatches +
            roles.filter((job) => {
                const jobRole = String(job.role || "");
                const location = String(job.location || "").trim().toLowerCase();

                return location.includes(normalizedLocation) && rolesCloselyMatch(roleName, jobRole);
            }).length
        );
    }, 0);
}

function matchJobs(profile, recommendedRoles, jobs) {
    const interestedSkills = profile.interested.map((skill) => skill.toLowerCase());
    const learnedSkills = profile.learned.map((skill) => skill.toLowerCase());
    const preferredRole = String(profile.preferredRole || "").trim().toLowerCase();
    const preferredLocation = String(profile.preferredLocation || "").trim().toLowerCase();
    const hasPreferredRole = preferredRole.length > 0;
    const recommendedRoleTokens = new Set(recommendedRoles.flatMap((role) => [...tokenizeText(role)]));

    const results = [];

    jobs.forEach((company) => {
        const companyName = company.company || company.name || "Company";
        const roles = company.job_roles || company.jobs || company.positions || [];

        roles.forEach((job) => {
            const jobSkills = (job.skills || []).map((skill) => String(skill).toLowerCase());
            const skillMatches = jobSkills.filter(
                (skill) => interestedSkills.includes(skill) || learnedSkills.includes(skill)
            );
            const jobRole = String(job.role || "").toLowerCase();
            const location = String(job.location || "").trim().toLowerCase();
            const jobRoleTokens = tokenizeText(jobRole);
            const roleMatchesRecommendation = [...recommendedRoleTokens].some((token) => jobRoleTokens.has(token));
            const roleMatchesPreference = hasPreferredRole && rolesCloselyMatch(preferredRole, jobRole);
            const locationMatches = !preferredLocation || location.includes(preferredLocation);

            if (!locationMatches) {
                return;
            }

            if (hasPreferredRole && !roleMatchesPreference) {
                return;
            }

            if (!hasPreferredRole && skillMatches.length === 0 && !roleMatchesRecommendation) {
                return;
            }

            results.push({
                company: companyName,
                role: job.role || "Role",
                location: job.location || "",
                seniority: job.seniority || "",
                employmentType: job.employment_type || job.employmentType || job.employment || "",
                matchedSkills: skillMatches,
                matchCount: skillMatches.length,
                applyUrl: resolveJobApplyUrl(companyName, job),
            });
        });
    });

    return results
        .sort((left, right) => right.matchCount - left.matchCount)
        .slice(0, 12);
}

function renderCareers(container, careers) {
    if (!careers.length) {
        container.innerHTML = `<div class="card"><div class="small-muted">No career suggestions found for your profile.</div></div>`;
        return;
    }

    container.innerHTML = `
        <h3>Recommended Career Paths</h3>
        ${careers
            .map(
                (career) => `
                    <div class="card">
                        <strong>${escapeHtml(career)}</strong>
                        <div class="small-muted">Selected using your skills, preferences, and location.</div>
                    </div>
                `
            )
            .join("")}
    `;
}

function renderJobs(container, jobs) {
    if (!jobs.length) {
        container.innerHTML = `<div class="card"><div class="small-muted">No jobs available in the selected location.</div></div>`;
        return;
    }

    container.innerHTML = `
        <h3>Matching Job Vacancies</h3>
        ${jobs
            .map(
                (job) => {
                    const hasApplyUrl = isValidUrl(job.applyUrl);
                    return `
                    <div class="card job-card">
                        <div class="job-card-top">
                            <div>
                                <strong>${escapeHtml(job.role)}</strong>
                                <div class="small-muted">${escapeHtml(job.company)}</div>
                                <div class="small-muted">Skills: ${escapeHtml(job.matchedSkills.join(", ") || "Not specified")}</div>
                            </div>
                            <div class="job-card-meta">
                                <div class="small-muted">${escapeHtml(job.location)}</div>
                                <div class="small-muted">${escapeHtml(job.employmentType || "Work condition not specified")}</div>
                                <div class="small-muted">${escapeHtml(job.seniority)}</div>
                            </div>
                        </div>
                        ${hasApplyUrl ? `
                            <div class="job-card-actions">
                                <a
                                    class="btn primary apply-btn"
                                    href="${escapeHtml(job.applyUrl)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Apply Now
                                </a>
                            </div>
                        ` : ""}
                    </div>
                `;
                }
            )
            .join("")}
    `;
}

function resolveJobApplyUrl(companyName, job) {
    const directUrl = job.applyUrl || job.apply_url || job.url || job.job_apply_link;
    if (isValidUrl(directUrl)) {
        return directUrl;
    }

    const searchParts = [companyName, job.role, job.location, "apply"].filter(Boolean);
    if (!searchParts.length) {
        return "";
    }

    return `https://www.google.com/search?q=${encodeURIComponent(searchParts.join(" "))}`;
}

function isValidUrl(value) {
    if (!value || typeof value !== "string") {
        return false;
    }

    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (error) {
        return false;
    }
}

function showPopup(message) {
    const popup = document.createElement("div");
    popup.textContent = message;
    popup.style.position = "fixed";
    popup.style.bottom = "20px";
    popup.style.left = "50%";
    popup.style.transform = "translateX(-50%)";
    popup.style.background = "rgba(0,0,0,0.8)";
    popup.style.color = "white";
    popup.style.padding = "12px 24px";
    popup.style.borderRadius = "8px";
    popup.style.zIndex = "9999";
    popup.style.fontWeight = "bold";
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 2000);
}

function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };
        return replacements[character];
    });
}
