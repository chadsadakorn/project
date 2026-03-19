// โหลดตัวแปร environment จากไฟล์ .env (เช่น PORT, DB_HOST)
require('dotenv').config()

const express = require('express')
const cors    = require('cors')
const path    = require('path')

// Routes
const authRouter     = require('./routes/auth')
const assetsRouter   = require('./routes/assets')
const borrowingRouter = require('./routes/borrowing')

// Middleware
const { verifyToken, isAdmin } = require('./middleware/auth.middleware')
const upload = require('./middleware/upload.middleware')

const app = express()

// ==============================
// Middleware ทั่วไป
// ==============================
app.use(cors())                                                          // อนุญาต Cross-Origin Request จาก frontend
app.use(express.json())                                                  // parse body แบบ JSON
app.use(express.urlencoded({ extended: true }))                          // parse body แบบ form
app.use(express.static(path.join(__dirname, '../frontend')))             // serve ไฟล์ HTML/CSS/JS จาก frontend/
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))     // serve รูปภาพที่ upload ไว้

// ==============================
// API Routes
// ==============================
app.use('/api/auth',     authRouter)                          // login, register, users (ไม่ต้อง token)
app.use('/api/assets',   verifyToken, assetsRouter)           // ครุภัณฑ์ (ต้อง login)
app.use('/api/borrowing', verifyToken, borrowingRouter)       // ยืม-คืน (ต้อง login)

// ==============================
// Upload รูปภาพ (เฉพาะ admin)
// ==============================
app.post('/api/upload', verifyToken, isAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    // ถ้าเกิด error จาก multer (เช่น ไฟล์ไม่ใช่รูป หรือขนาดเกิน)
    if (err) return res.status(400).json({ message: err.message })

    // ถ้าไม่มีไฟล์ส่งมา
    if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' })

    // สร้าง URL เต็มสำหรับเข้าถึงรูป เช่น http://localhost:3001/uploads/asset_123.jpg
    const baseUrl = `${req.protocol}://${req.get('host')}`
    res.json({ url: `${baseUrl}/uploads/${req.file.filename}` })
  })
})

// ==============================
// Start Server
// ==============================
app.listen(process.env.PORT, () => {
  console.log(`ระบบจัดการครุภัณฑ์ กำลังทำงานที่ http://localhost:${process.env.PORT}`)
})
