// ... (keeping existing category navigation and cart functionality) ...

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Clear previous errors
    showError('loginForm', '');

    // Validate input
    if (!email || !password) {
        showError('loginForm', 'Please fill in all fields');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Close modal and show success
            closeLoginModal();
            showNotification('Successfully logged in!', 'success');
            
            // Scroll to categories section
            const categoriesSection = document.querySelector('#fragrance-categories');
            if (categoriesSection) {
                categoriesSection.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Update UI
            updateAuthUI();
        } else {
            showError('loginForm', data.message || 'Invalid email or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('loginForm', 'Unable to connect to the server. Make sure start-server.js is running.');
    }
}

// ... (rest of your existing code) ... 