const API_BASE = "http://localhost:8000/auth";
let currentAccessToken = localStorage.getItem("access_token");
let currentRefreshToken = localStorage.getItem("refresh_token");
const loginEmailError = document.getElementById("login-email-error");

const loginPasswordError = document.getElementById("login-password-error");

const signupEmailError = document.getElementById("signup-email-error");

const signupPasswordError = document.getElementById("signup-password-error");

const signupConfirmPasswordError = document.getElementById(
  "signup-confirm-password-error",
);
// Helper to refresh access token
async function refreshAccessToken() {
  if (!currentRefreshToken) return false;
  try {
    const response = await fetch(`${API_BASE}/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentRefreshToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      currentAccessToken = data.access_token;
      currentRefreshToken = data.refresh_token;
      return true;
    }
  } catch (err) {}
  return false;
}

// Wrapper for fetch that auto-refreshes on 401
async function authFetch(url, options = {}) {
  let res = await fetch(url, options);
  if (res.status === 401 && currentRefreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry original request with new token
      const newOptions = { ...options };
      newOptions.headers = {
        ...newOptions.headers,
        Authorization: `Bearer ${currentAccessToken}`,
      };
      res = await fetch(url, newOptions);
    }
  }
  return res;
}

const authContainer = document.getElementById("auth-container");
const dashboard = document.getElementById("dashboard");
const userEmailSpan = document.getElementById("user-email");
const userCreatedSpan = document.getElementById("user-created");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const loginErrorDiv = document.getElementById("login-error");
const signupErrorDiv = document.getElementById("signup-error");
const signupSuccessDiv = document.getElementById("signup-success");

function setLoading(form, isLoading) {
  const submitBtn = form.querySelector('input[type="submit"]');
  if (isLoading) {
    submitBtn.value = "Please wait...";
    submitBtn.disabled = true;
  } else {
    submitBtn.value = form.classList.contains("login") ? "Login" : "Sign Up";
    submitBtn.disabled = false;
  }
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");

  toast.textContent = message;

  toast.className = "toast";

  if (isError) {
    toast.classList.add("error");
  }

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function clearMessages() {
  if (loginErrorDiv) loginErrorDiv.innerText = "";
  if (signupErrorDiv) signupErrorDiv.innerText = "";
  if (signupSuccessDiv) signupSuccessDiv.innerText = "";

  if (loginEmailError) loginEmailError.innerText = "";
  if (loginPasswordError) loginPasswordError.innerText = "";

  if (signupEmailError) signupEmailError.innerText = "";
  if (signupPasswordError) signupPasswordError.innerText = "";
  if (signupConfirmPasswordError) signupConfirmPasswordError.innerText = "";
}

async function showDashboard() {
  if (!currentAccessToken) return;
  try {
    const res = await authFetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${currentAccessToken}` },
    });
    if (res.ok) {
      const user = await res.json();
      userEmailSpan.innerText = user.email;
      userCreatedSpan.innerText = new Date(
        user.created_at,
      ).toLocaleDateString();
      authContainer.style.display = "none";
      dashboard.style.display = "block";
    } else {
      logout();
    }
  } catch (err) {
    logout();
  }
}

function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  currentAccessToken = null;
  currentRefreshToken = null;
  authContainer.style.display = "block";
  dashboard.style.display = "none";
  loginForm.reset();
  signupForm.reset();
  clearMessages();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessages();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  if (!email || !password) {
    loginErrorDiv.innerText = "Please fill all fields.";
    return;
  }
  setLoading(loginForm, true);
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      loginPasswordError.innerText = data.detail || "Login failed.";

      setLoading(loginForm, false);
      return;
    }
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    currentAccessToken = data.access_token;
    currentRefreshToken = data.refresh_token;
    showToast("✅ Login Successful");

    await showDashboard();
  } catch (err) {
    loginErrorDiv.innerText = "Network error. Is the backend running?";

    showToast("❌ Network error. Backend unavailable.", true);
  } finally {
    setLoading(loginForm, false);
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessages();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("signup-confirm").value;
  if (!email || !password || !confirm) {
    signupErrorDiv.innerText = "All fields are required.";
    return;
  }
  if (password !== confirm) {
    signupConfirmPasswordError.innerText = "Passwords do not match.";
    return;
  }
  if (password.length < 8) {
    signupPasswordError.innerText = "Password must be at least 8 characters.";
    return;
  }
  setLoading(signupForm, true);
  try {
    const response = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      signupEmailError.innerText = data.detail || "Signup failed.";

      setLoading(signupForm, false);
      return;
    }
    showToast("✅ Account Created Successfully! Please login.");
    signupForm.reset();
    loginBtn.click();
    setTimeout(() => (signupSuccessDiv.innerText = ""), 3000);
  } catch (err) {
    signupErrorDiv.innerText = "Network error. Is the backend running?";

    showToast("❌ Network error. Backend unavailable.", true);
  } finally {
    setLoading(signupForm, false);
  }
});

// Slide controls
const loginText = document.querySelector(".title-text .login");
const loginFormSlide = document.querySelector("form.login");
const loginBtn = document.querySelector("label.login");
const signupBtn = document.querySelector("label.signup");

const signupLink = document.getElementById("go-signup");
const loginLink = document.getElementById("go-login");

signupBtn.onclick = () => {
  loginFormSlide.style.marginLeft = "-50%";
  loginText.style.marginLeft = "-50%";
  clearMessages();
};
loginBtn.onclick = () => {
  loginFormSlide.style.marginLeft = "0%";
  loginText.style.marginLeft = "0%";
  clearMessages();
};
signupLink?.addEventListener("click", (e) => {
  e.preventDefault();
  signupBtn.click();
});

loginLink?.addEventListener("click", (e) => {
  e.preventDefault();
  loginBtn.click();
});

document.getElementById("logout-btn")?.addEventListener("click", () => {
  logout();

  showToast("✅ Logged Out Successfully");
});

if (currentAccessToken) {
  showDashboard().catch(() => logout());
} else {
  authContainer.style.display = "block";
  dashboard.style.display = "none";
}
