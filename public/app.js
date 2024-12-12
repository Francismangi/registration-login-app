document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");
    const registerMessage = document.getElementById("register-message");
    const loginMessage = document.getElementById("login-message");

    // Helper function to display messages
    const displayMessage = (element, message, isSuccess = true) => {
        element.textContent = message;
        element.style.color = isSuccess ? "green" : "red";
    };

    // Registration Handler
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("register-username").value;
        const password = document.getElementById("register-password").value;

        try {
            const response = await fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (response.ok) {
                displayMessage(registerMessage, data.message, true);
                registerForm.reset(); // Clear the form
            } else {
                // Handle different response status codes
                if (response.status === 400) {
                    displayMessage(registerMessage, data.message, false);
                } else {
                    displayMessage(registerMessage, "An unexpected error occurred. Please try again later.", false);
                }
            }
        } catch (error) {
            console.error("Registration Error:", error);
            displayMessage(registerMessage, "An error occurred. Please check your network connection and try again.", false);
        }
    });

    // Login Handler
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("login-username").value;
        const password = document.getElementById("login-password").value;

        try {
            const response = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (response.ok) {
                displayMessage(loginMessage, data.message, true);
                localStorage.setItem("token", data.token); // Save the token
                loginForm.reset(); // Clear the form

                // Optionally redirect to a secure page
                setTimeout(() => {
                    window.location.href = "/dashboard.html"; // Replace with your secure page
                }, 1000);
            } else {
                // Handle different response status codes
                if (response.status === 404) {
                    displayMessage(loginMessage, "User not found. Please check your username.", false);
                } else if (response.status === 401) {
                    displayMessage(loginMessage, "Invalid credentials. Please try again.", false);
                } else {
                    displayMessage(loginMessage, "An unexpected error occurred. Please try again later.", false);
                }
            }
        } catch (error) {
            console.error("Login Error:", error);
            displayMessage(loginMessage, "An error occurred. Please check your network connection and try again.", false);
        }
    });

    // Token-based actions example
    const token = localStorage.getItem("token");
    if (token) {
        console.log("Token detected:", token);
        // Perform authenticated actions here, like fetching user profile data
        fetch("/profile", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to fetch profile data.");
                }
                return res.json();
            })
            .then((data) => {
                console.log("Profile Data:", data);
            })
            .catch((err) => {
                console.error("Profile Fetch Error:", err);
                console.log("You may need to log in again.");
                // Optionally clear token if it's invalid
                localStorage.removeItem("token");
            });
    } else {
        console.log("No token found. Login required.");
    }
});
