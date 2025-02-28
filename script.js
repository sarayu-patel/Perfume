// Smooth scrolling for category navigation
document.addEventListener('DOMContentLoaded', function() {
    const categoryLinks = document.querySelectorAll('.category-btn');
    
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Cart functionality
let cart = [];

async function addToCart(productId, quantity = 1) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            openLoginModal();
            return;
        }

        const response = await fetch(`${API_URL}/api/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({ productId, quantity })
        });

        const data = await response.json();
        
        if (response.ok) {
            showNotification('Product added to cart!', 'success');
            await loadCart(); // Reload cart after adding item
        } else {
            showNotification(data.message || 'Error adding to cart', 'error');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding to cart', 'error');
    }
}

async function removeFromCart(productId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/api/cart/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({ productId })
        });

        if (response.ok) {
            await loadCart(); // Reload cart after removing item
            showNotification('Item removed from cart', 'success');
        } else {
            showNotification('Error removing item from cart', 'error');
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        showNotification('Error removing item from cart', 'error');
    }
}

async function checkout() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            openLoginModal();
            return;
        }

        // Get shipping details from the form
        const shippingAddress = {
            street: document.getElementById('street').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            zipCode: document.getElementById('zipCode').value,
            country: document.getElementById('country').value
        };

        const response = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
            body: JSON.stringify({ shippingAddress })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Order placed successfully!', 'success');
            closeCart();
            await loadCart(); // Reload empty cart
        } else {
            showNotification(data.message || 'Error placing order', 'error');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('Error processing checkout', 'error');
    }
}

function updateCartDisplay(cartItems) {
    const cartContainer = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    if (!cartContainer || !cartTotal) return;

    if (!cartItems || cartItems.length === 0) {
        cartContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        cartTotal.textContent = '$0.00';
        return;
    }

    let total = 0;
    cartContainer.innerHTML = cartItems.map(item => {
        const itemTotal = item.productId.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <img src="${item.productId.imageUrl}" alt="${item.productId.name}">
                <div class="item-details">
                    <h4>${item.productId.name}</h4>
                    <p>$${item.productId.price.toFixed(2)} x ${item.quantity}</p>
                </div>
                <div class="item-total">$${itemTotal.toFixed(2)}</div>
                <button onclick="removeFromCart('${item.productId._id}')" class="remove-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');

    cartTotal.textContent = `$${total.toFixed(2)}`;

    // Show/hide checkout form based on cart items
    const checkoutSection = document.querySelector('.checkout-section');
    if (checkoutSection) {
        checkoutSection.style.display = cartItems.length > 0 ? 'block' : 'none';
    }
}

// Cart modal
function openCart() {
    const modal = document.getElementById('cartModal');
    modal.style.display = 'flex';
    updateCartItems();
}

function closeCart() {
    const modal = document.getElementById('cartModal');
    modal.style.display = 'none';
}

// Authentication Functions
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function openSignupModal() {
    document.getElementById('signupModal').style.display = 'flex';
}

function closeSignupModal() {
    document.getElementById('signupModal').style.display = 'none';
}

function switchToSignup() {
    closeLoginModal();
    openSignupModal();
}

function switchToLogin() {
    closeSignupModal();
    openLoginModal();
}

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://perfume-3elz.onrender.com';

// Product loading functions
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

async function loadProductsByCategory(category) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${category}`);
        const products = await response.json();
        displayProducts(products, category);
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

function displayProducts(products, category = null) {
    const container = category ? 
        document.querySelector(`.${category}-collection .product-grid`) :
        document.querySelector('.featured-products .product-grid');
    
    if (!container) return;

    container.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.imageUrl}" alt="${product.name}">
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="rating">
                    ${getRatingStars(product.rating.average)}
                    <span>(${product.rating.count})</span>
                </div>
                <p class="price">$${product.price.toFixed(2)}</p>
                <button class="add-to-cart" onclick="addToCart('${product._id}', 1)">
                    Add to Cart
                </button>
            </div>
        </div>
    `).join('');
}

function getRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half"></i>';
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    return stars;
}

// Cart functions
async function loadCart() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        const data = await response.json();
        
        if (response.ok) {
            updateCartDisplay(data.cart);
            updateCartCount(data.cart.length);
        }
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

function updateCartCount(count) {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = count;
    }
}

// Authentication functions
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        showError('loginForm', '');
        
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            closeLoginModal();
            updateAuthUI();
            showNotification('Successfully logged in!', 'success');
            loadCart(); // Load cart after login
        } else {
            showError('loginForm', data.message || 'Invalid email or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('loginForm', 'Connection error. Please try again.');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    showNotification('Logged out successfully', 'success');
}

function updateAuthUI() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const authBtn = document.querySelector('.auth-btn');
    
    if (token && user) {
        authBtn.textContent = 'Logout';
        authBtn.onclick = logout;
    } else {
        authBtn.textContent = 'Sign In';
        authBtn.onclick = openLoginModal;
    }
}

function showError(formId, message) {
    const form = document.getElementById(formId);
    let errorDiv = form.querySelector('.error-message');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        form.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Authentication functions
async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Basic validation
    if (!name || !email || !password || !confirmPassword) {
        showError('signupForm', 'Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        showError('signupForm', 'Passwords do not match');
        return;
    }

    try {
        console.log('Attempting signup with:', { name, email }); // Debug log

        const response = await fetch(`${API_BASE_URL}/api/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ name, email, password })
        });

        console.log('Signup response status:', response.status); // Debug log
        const data = await response.json();
        console.log('Signup response data:', data); // Debug log

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            closeSignupModal();
            updateAuthUI();
            showNotification('Account created successfully!', 'success');
            
            // Redirect to categories section after successful signup
            setTimeout(() => {
                window.location.href = '#fragrance-categories';
                const categoriesSection = document.querySelector('#fragrance-categories');
                if (categoriesSection) {
                    categoriesSection.scrollIntoView({ behavior: 'smooth' });
                }
            }, 1000);
        } else {
            showError('signupForm', data.message || 'Signup failed. Please try again.');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showError('signupForm', 'Connection error. Please try again.');
    }
}

// Hero Slider functionality
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');

function showSlide(n) {
    // Reset current slide
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    
    // Calculate new slide index
    currentSlide = (n + slides.length) % slides.length;
    
    // Show new slide
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
}

function changeSlide(direction) {
    showSlide(currentSlide + direction);
}

function goToSlide(n) {
    showSlide(n);
}

// Auto advance slides
let slideInterval = setInterval(() => changeSlide(1), 5000);

// Pause auto-advance on hover
document.querySelector('.hero').addEventListener('mouseenter', () => {
    clearInterval(slideInterval);
});

// Resume auto-advance when mouse leaves
document.querySelector('.hero').addEventListener('mouseleave', () => {
    slideInterval = setInterval(() => changeSlide(1), 5000);
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateAuthUI();
    if (localStorage.getItem('token')) {
        loadCart();
    }

    // Add event listeners for category navigation
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.target.getAttribute('href').replace('#', '');
            loadProductsByCategory(category);
        });
    });

    // Add form submission handlers
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// Close modals when clicking outside
window.onclick = function(event) {
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === signupModal) {
        closeSignupModal();
    }
};
