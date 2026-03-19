require('dotenv').config()

const express = require('express')
const cors    = require('cors')
const path    = require('path')

const authRouter     = require('./routes/auth')
const assetsRouter   = require('./routes/assets')
const borrowingRouter = require('./routes/borrowing')

const { verifyToken, isAdmin } = require('./middleware/auth.middleware')
const upload = require('./middleware/upload.middleware')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, '../frontend')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth',      authRouter)
app.use('/api/assets',    verifyToken, assetsRouter)
app.use('/api/borrowing', verifyToken, borrowingRouter)

// Upload รูปภาพ — เฉพาะ admin
app.post('/api/upload', verifyToken, isAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message })
    if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' })
    const baseUrl = `${req.protocol}://${req.get('host')}`
    res.json({ url: `${baseUrl}/uploads/${req.file.filename}` })
  })
})

app.listen(process.env.PORT, () => {
  console.log(`ระบบจัดการครุภัณฑ์ กำลังทำงานที่ http://localhost:${process.env.PORT}`)
})
