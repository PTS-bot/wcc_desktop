const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

// --- 1. Config Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(session({
    secret: 'my-secret-key-1234',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// --- 2. MongoDB Connection ---
// เชื่อมต่อ MongoDB (ปรับ URL ตามการใช้งานของคุณ เช่น localhost หรือชื่อ service ใน docker)
mongoose.connect('mongodb://mongo:27017/userDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// --- 3. Schemas ---
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }, // user, admin, superadmin
    status: { type: String, default: 'pending' }, // ✅ ค่าเริ่มต้นเป็น pending เพื่อรออนุมัติ
    groups: [String], // เก็บชื่อ Group ที่สังกัด
    permissions: [String] // เก็บ ID เมนูสิทธิ์รายบุคคล
});

const groupSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    permissions: [String] // สิทธิ์กลางของกลุ่ม
});

const User = mongoose.model('User', userSchema);
const Group = mongoose.model('Group', groupSchema);

// --- 4. Auth & Registration APIs ---

// 4.1 Login API
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });

        if (!user) return res.json({ success: false, message: 'Invalid username or password' });
        
        // ตรวจสอบสถานะ (ต้องเป็น approved เท่านั้นถึงจะเข้าหน้า Home ได้)
        if (user.status !== 'approved') {
            return res.json({ success: false, message: 'Your account is pending or blocked' });
        }

        // รวมสิทธิ์: สิทธิ์ส่วนตัว + สิทธิ์จากทุกกลุ่มที่สังกัด
        let combinedPermissions = [...(user.permissions || [])];
        if (user.groups && user.groups.length > 0) {
            const groupsData = await Group.find({ name: { $in: user.groups } });
            groupsData.forEach(g => {
                combinedPermissions = [...new Set([...combinedPermissions, ...g.permissions])];
            });
        }

        const userData = {
            username: user.username,
            role: user.role,
            status: user.status,
            permissions: combinedPermissions
        };

        req.session.user = userData;
        res.json({ success: true, user: userData });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// 4.2 Register API (สำหรับคนสมัครเองจากหน้า index)
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const exists = await User.findOne({ username });
        if (exists) return res.json({ success: false, message: 'Username already exists' });

        await User.create({
            username,
            password,
            role: 'user',
            status: 'pending', // ✅ บังคับเป็น pending เพื่อรอ Admin อนุมัติ
            groups: [],
            permissions: []
        });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// 4.3 Change Password (User เปลี่ยนเอง)
app.post('/api/change-password', async (req, res) => {
    try {
        const { username, oldPassword, newPassword } = req.body;
        const user = await User.findOne({ username, password: oldPassword });
        if (!user) return res.json({ success: false, message: 'Old password incorrect' });
        
        user.password = newPassword;
        await user.save();
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

// --- 5. User Management APIs (สำหรับหน้า Admin) ---

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // ไม่ส่ง password ออกไป
        res.json(users);
    } catch (e) { res.status(500).json([]); }
});

// Admin สร้าง User เอง (กำหนดให้เป็น approved ทันที)
app.post('/api/create-user', async (req, res) => {
    try {
        const { username, password, group } = req.body;
        const exists = await User.findOne({ username });
        if (exists) return res.json({ success: false, message: 'User already exists' });

        await User.create({
            username,
            password,
            role: 'user',
            status: 'approved', // สร้างโดย Admin ให้ผ่านเลย
            groups: group ? [group] : [],
            permissions: []
        });
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

// อัปเดตข้อมูล User (เปลี่ยนสถานะ approved/pending/role/กลุ่ม/สิทธิ์)
app.post('/api/update-user', async (req, res) => {
    try {
        const { username, role, status, groups, permissions } = req.body;
        const updateData = {};
        if (role) updateData.role = role;
        if (status) updateData.status = status;
        if (groups) updateData.groups = groups;
        if (permissions) updateData.permissions = permissions;

        await User.findOneAndUpdate({ username }, updateData);
        res.json({ success: true });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.post('/api/admin-reset-password', async (req, res) => {
    try {
        const { targetUsername, newPassword } = req.body;
        await User.findOneAndUpdate({ username: targetUsername }, { password: newPassword });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/delete-user', async (req, res) => {
    try {
        await User.findOneAndDelete({ username: req.body.username });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// --- 6. Group Management APIs ---

app.get('/api/groups', async (req, res) => {
    try {
        const groups = await Group.find({});
        res.json(groups);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/create-group', async (req, res) => {
    try {
        const { name } = req.body;
        const exists = await Group.findOne({ name });
        if (exists) return res.json({ success: false, message: 'Group already exists' });

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
        const { name } = req.body;
        await Group.findOneAndDelete({ name });
        await User.updateMany({ groups: name }, { $pull: { groups: name } });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// --- 6.5 Initial Setup (สร้าง Superadmin ตัวแรก) ---
async function initDB() {
    try {
        const adminExist = await User.findOne({ username: 'admin' });
        if (!adminExist) {
            await User.create({
                username: 'admin',
                password: 'admin', 
                role: 'superadmin',
                status: 'approved',
                groups: [],
                permissions: []
            });
            console.log('👑 Superadmin created: admin / admin');
        }
    } catch (err) {
        console.error('❌ InitDB Error:', err);
    }
}

initDB();

// --- 7. Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Auth Service running on http://localhost:${PORT}`);
});