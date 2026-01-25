const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

// --- Config Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(session({
    secret: 'my-secret-key-1234',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// --- MongoDB Connection ---
mongoose.connect('mongodb://mongo:27017/userDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// --- Schemas ---
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }, // user, admin, superadmin
    status: { type: String, default: 'pending' }, // pending, approved, blocked
    groups: [String] // เก็บชื่อ Group ที่อยู่
});

const groupSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    permissions: [String] // เก็บ ID ของเมนูที่เข้าได้ เช่น ['jupyter', 'obsidian']
});

const User = mongoose.model('User', userSchema);
const Group = mongoose.model('Group', groupSchema);

// --- 🛠️ Initial Setup (สร้าง Superadmin ถ้ายังไม่มี) ---
async function initDB() {
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
        await User.create({
            username: 'admin',
            password: 'password', // ⚠️ อย่าลืมเปลี่ยนรหัส
            role: 'superadmin',
            status: 'approved',
            groups: []
        });
        console.log('👑 Superadmin created: admin / password');
    }
}
initDB();

// ==========================================
// 🚀 API ROUTES
// ==========================================

// 1. Login / Register / Logout
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            // ดึง Permission ของ Group ทั้งหมดมารวมกัน
            let permissions = [];
            if (user.groups && user.groups.length > 0) {
                const groups = await Group.find({ name: { $in: user.groups } });
                groups.forEach(g => {
                    permissions = [...new Set([...permissions, ...g.permissions])];
                });
            }
            
            // ส่งข้อมูลกลับไปให้ Frontend (รวม permissions ด้วย)
            req.session.user = user;
            res.json({ success: true, user: { ...user.toObject(), permissions } });
        } else {
            res.json({ success: false, message: 'Invalid credentials' });
        }
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if(await User.findOne({ username })) return res.json({ success: false, message: 'User exists' });
        await User.create({ username, password, status: 'pending' });
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 2. User Management
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // ไม่ส่ง password ไป
        res.json(users);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/create-user', async (req, res) => {
    try {
        const { username, password, group } = req.body;
        if(await User.findOne({ username })) return res.json({ success: false, message: 'Username taken' });
        
        await User.create({
            username, 
            password, 
            status: 'approved', // สร้างโดย Admin ให้ผ่านเลย
            role: 'user',
            groups: group ? [group] : []
        });
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

app.post('/api/update-user', async (req, res) => {
    try {
        const { username, role, status, groups } = req.body;
        let updateData = {};
        if (role) updateData.role = role;
        if (status) updateData.status = status;
        if (groups) updateData.groups = groups;

        await User.findOneAndUpdate({ username }, updateData);
        res.json({ success: true });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.post('/api/delete-user', async (req, res) => {
    try {
        await User.findOneAndDelete({ username: req.body.username });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/admin-reset-password', async (req, res) => {
    try {
        const { targetUsername, newPassword } = req.body;
        await User.findOneAndUpdate({ username: targetUsername }, { password: newPassword });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// 3. Group Management (ที่ขาดหายไป)
app.get('/api/groups', async (req, res) => {
    try {
        const groups = await Group.find({});
        res.json(groups);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/create-group', async (req, res) => {
    try {
        const { name } = req.body;
        if(await Group.findOne({ name })) return res.json({ success: false, message: 'Group exists' });
        
        await Group.create({ name, permissions: [] });
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

app.post('/api/update-group', async (req, res) => {
    try {
        const { name, permissions } = req.body;
        await Group.findOneAndUpdate({ name }, { permissions });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/delete-group', async (req, res) => {
    try {
        await Group.findOneAndDelete({ name: req.body.name });
        // Optional: เอา Group ออกจาก User ด้วยก็ได้ แต่ไม่ซีเรียส
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});



// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Auth Service running on port ${PORT}`);
}); 