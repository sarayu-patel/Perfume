const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key';

// In-memory storage
const users = [];

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.post('/api/signup', (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
    }

    const user = { id: users.length + 1, name, email, password };
    users.push(user);
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    console.log(`User registered: ${email}`);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    console.log(`User logged in: ${email}`);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Users in memory:', users.length);
}); 