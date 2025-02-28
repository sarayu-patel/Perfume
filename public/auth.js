// Authentication Functions
const API_URL = window.location.origin + '/api';

function validateAndSignup() {
    console.log('Signup validation started'); // Debug log
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    console.log('Form values:', { name, email }); // Debug log

    // Validate name
    if (name.length < 2) {
        showNotification('Name must be at least 2 characters long', 'error');
        return;
    }

    // Validate email
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    // Validate password
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    signup(name, email, password);
}

function validateAndLogin() {
    console.log('Login validation started'); // Debug log
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    console.log('Login attempt:', { email }); // Debug log

    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    if (!password) {
        showNotification('Please enter your password', 'error');
        return;
    }

    login(email, password);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function signup(name, email, password) {
    try {
        console.log('Making signup request to:', API_URL); // Debug log
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
            credentials: 'include'
        });

        const data = await response.json();
        console.log('Signup response:', data); // Debug log

        if (!response.ok) {
            throw new Error(data.error || 'Signup failed. Please try again.');
        }
        
        showNotification('Signup successful! Please log in.', 'success');
        closeAuthModal('signupModal');
        openAuthModal('loginModal');
        
        // Clear signup form
        document.getElementById('signupForm').reset();
    } catch (error) {
        console.error('Signup error:', error); // Debug log
        showNotification(error.message || 'An error occurred during signup', 'error');
    }
}

async function login(email, password) {
    try {
        console.log('Making login request to:', API_URL); // Debug log
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });

        const data = await response.json();
        console.log('Login response:', data); // Debug log

        if (!response.ok) {
            throw new Error(data.error || 'Login failed. Please try again.');
        }

        showNotification('Login successful!', 'success');
        closeAuthModal('loginModal');
        updateUIForLoggedInUser(data.user);
        
        // Clear login form
        document.getElementById('loginForm').reset();
    } catch (error) {
        console.error('Login error:', error); // Debug log
        showNotification(error.message || 'An error occurred during login', 'error');
    }
}

async function logout() {
    try {
        const response = await fetch(`${API_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showNotification('Logged out successfully', 'success');
        updateUIForLoggedOutUser();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_URL}/user`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            updateUIForLoggedInUser(data.user);
        } else {
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        updateUIForLoggedOutUser();
    }
}

// UI Helper Functions
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <div class="message">
            <div class="message-text">${message}</div>
        </div>
    `;

    document.body.appendChild(notification);
    notification.style.display = 'flex';
    
    // Add show class for animation
    setTimeout(() => notification.classList.add('show'), 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function openAuthModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        // Clear any existing form data and errors
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            const errorMessages = form.querySelectorAll('.error-message');
            errorMessages.forEach(error => error.remove());
        }
    }
}

function closeAuthModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Clear form data and errors
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            const errorMessages = form.querySelectorAll('.error-message');
            errorMessages.forEach(error => error.remove());
        }
    }
}

function updateUIForLoggedInUser(user) {
    if (!user) return;
    
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    if (authButtons) authButtons.style.display = 'none';
    if (userMenu) {
        userMenu.style.display = 'flex';
        const userNameElement = userMenu.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = user.name;
        }
    }
}

function updateUIForLoggedOutUser() {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    if (authButtons) authButtons.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded'); // Debug log
    checkAuthStatus();
    
    // Add form submit event listeners
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            validateAndLogin();
        });
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            validateAndSignup();
        });
    }
    
    // Close modals when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('auth-modal')) {
            closeAuthModal(event.target.id);
        }
    };

    // Add input validation listeners
    const signupPassword = document.getElementById('signupPassword');
    const confirmPassword = document.getElementById('signupConfirmPassword');
    
    if (signupPassword && confirmPassword) {
        confirmPassword.addEventListener('input', () => {
            if (signupPassword.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Passwords do not match');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });

        signupPassword.addEventListener('input', () => {
            if (signupPassword.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Passwords do not match');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });
    }
}); 