const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Set default JWT secret if not provided in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'perfume_shop_secret_key_2024';
console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI:', process.env.MONGODB_URI ? '****' : 'NOT SET');
console.log('Using JWT Secret:', JWT_SECRET ? '****' : 'NOT SET');

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Initialize express app
const app = express();

// Enhanced Security Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'https://perfume-3elz.onrender.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());
app.use(cookieParser());

// Print environment variables for debugging (remove in production)
console.log('Environment variables loaded:', {
    MONGODB_URI: process.env.MONGODB_URI,
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV
});

// MongoDB Connection with Enhanced Retry Logic
const connectWithRetry = async () => {
    const MONGODB_URI = process.env.MONGODB_URI;
    const MAX_RETRIES = 5;
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            console.log('Successfully connected to MongoDB Atlas');
            break;
        } catch (err) {
            retries++;
            console.error(`MongoDB connection attempt ${retries} failed:`, err.message);
            if (retries === MAX_RETRIES) {
                console.error('Max retries reached. Exiting...');
                process.exit(1);
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

// Connect to MongoDB
connectWithRetry();

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    connectWithRetry();
});

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
});

// Product Schema
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Product description is required']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['men', 'women', 'unisex']
    },
    imageUrl: {
        type: String,
        required: [true, 'Image URL is required']
    },
    stock: {
        type: Number,
        default: 0,
        min: [0, 'Stock cannot be negative']
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    },
    reviews: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Order Schema
const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Update User Schema with additional fields
const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long']
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    cart: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1
        }
    }],
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    addresses: [{
        type: {
            type: String,
            enum: ['home', 'work', 'other'],
            default: 'home'
        },
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        isDefault: {
            type: Boolean,
            default: false
        }
    }],
    phoneNumber: String,
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    lastLogin: {
        type: Date
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Add method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Create models
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const User = mongoose.model('User', userSchema);

// Initialize sample data function
async function initializeSampleData() {
    try {
        // Check if products already exist
        const productsCount = await Product.countDocuments();
        if (productsCount === 0) {
            // Sample products data
            const sampleProducts = [
                {
                    name: "Baccarat Rouge 540",
                    description: "A luxurious amber floral fragrance",
                    price: 299.99,
                    category: "unisex",
                    imageUrl: "./image copy 13.png",
                    stock: 50,
                    rating: { average: 4.5, count: 124 }
                },
                {
                    name: "Bleu de Chanel",
                    description: "A woody aromatic fragrance for men",
                    price: 145.00,
                    category: "men",
                    imageUrl: "./image copy 10.png",
                    stock: 75,
                    rating: { average: 4.8, count: 189 }
                },
                {
                    name: "Miss Dior",
                    description: "A floral feminine fragrance",
                    price: 120.00,
                    category: "women",
                    imageUrl: "./image copy 14.png",
                    stock: 60,
                    rating: { average: 4.7, count: 156 }
                }
            ];

            // Insert sample products
            await Product.insertMany(sampleProducts);
            console.log('Sample products initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing sample data:', error);
    }
}

// Call initialization after database connection
mongoose.connection.once('open', () => {
    console.log('MongoDB connection established successfully');
    initializeSampleData();
});

// Authentication Middleware
const auth = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            throw new Error('Authentication required');
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        res.status(401).json({ error: 'Please authenticate' });
    }
};

// Routes
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Create new user
        const user = new User({ name, email, password });
        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email is already registered' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'An error occurred during signup' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
        
        // Set cookie options based on environment
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/logout', auth, (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

app.get('/api/user', auth, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                email: req.user.email,
                name: req.user.name
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user data' });
    }
});

// Product Routes
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Error fetching products' });
    }
});

app.get('/api/products/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const products = await Product.find({ category });
        res.json(products);
    } catch (error) {
        console.error('Error fetching products by category:', error);
        res.status(500).json({ message: 'Error fetching products' });
    }
});

// Cart Routes
app.post('/api/cart/add', auth, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const user = req.user;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if product already in cart
        const cartItemIndex = user.cart.findIndex(item => 
            item.productId.toString() === productId
        );

        if (cartItemIndex > -1) {
            // Update quantity if product exists
            user.cart[cartItemIndex].quantity += quantity;
        } else {
            // Add new product to cart
            user.cart.push({ productId, quantity });
        }

        await user.save();
        
        // Populate cart items with product details
        await user.populate('cart.productId');
        
        res.json({ 
            message: 'Product added to cart',
            cart: user.cart 
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Error adding to cart' });
    }
});

app.post('/api/cart/remove', auth, async (req, res) => {
    try {
        const { productId } = req.body;
        const user = req.user;

        // Remove item from cart
        user.cart = user.cart.filter(item => 
            item.productId.toString() !== productId
        );

        await user.save();
        
        // Populate cart items with product details
        await user.populate('cart.productId');
        
        res.json({ 
            message: 'Product removed from cart',
            cart: user.cart 
        });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ message: 'Error removing from cart' });
    }
});

app.get('/api/cart', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('cart.productId');
        res.json({ cart: user.cart });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Error fetching cart' });
    }
});

// Order Routes
app.post('/api/orders', auth, async (req, res) => {
    try {
        const { shippingAddress } = req.body;
        const user = await User.findById(req.user._id).populate('cart.productId');

        if (!user.cart.length) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Calculate total amount
        const totalAmount = user.cart.reduce((total, item) => {
            return total + (item.productId.price * item.quantity);
        }, 0);

        // Create order items
        const orderItems = user.cart.map(item => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.productId.price
        }));

        // Create new order
        const order = new Order({
            userId: user._id,
            items: orderItems,
            totalAmount,
            shippingAddress,
            status: 'pending',
            paymentStatus: 'pending'
        });

        await order.save();

        // Clear user's cart
        user.cart = [];
        await user.save();

        res.status(201).json({
            message: 'Order created successfully',
            order
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Error creating order' });
    }
});

app.get('/api/orders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id })
            .populate('items.productId')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Error fetching orders' });
    }
});

// Serve static files
app.use(express.static(__dirname));

// Serve index.html for all routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Environment:', process.env.NODE_ENV);
}); 