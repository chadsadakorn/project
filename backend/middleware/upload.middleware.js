const multer = require('multer')
const path   = require('path')
const fs     = require('fs')

// กำหนดโฟลเดอร์สำหรับเก็บรูปภาพ (backend/uploads/)
const uploadDir = path.join(__dirname, '../uploads')

// สร้างโฟลเดอร์อัตโนมัติถ้ายังไม่มี (recursive = สร้างทุก parent ที่ขาดหายไปด้วย)
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// กำหนดวิธีเก็บไฟล์ลงดิสก์
const storage = multer.diskStorage({
  // บอกว่าจะเก็บไว้ที่ไหน
  destination: (req, file, cb) => cb(null, uploadDir),

  // ตั้งชื่อไฟล์ใหม่ เช่น asset_1718000000000.jpg
  // ใช้ Date.now() เพื่อป้องกันชื่อซ้ำ
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() // นามสกุลไฟล์ เช่น .jpg
    const name = `asset_${Date.now()}${ext}`
    cb(null, name)
  },
})

// กรองประเภทไฟล์ — รับเฉพาะรูปภาพเท่านั้น
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']
  const ext     = path.extname(file.originalname).toLowerCase()

  if (allowed.includes(ext)) {
    cb(null, true)   // อนุญาต
  } else {
    cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ (.jpg, .jpeg, .png, .webp, .gif, .avif)'))
  }
}

// สร้าง multer instance พร้อมกำหนด:
// - storage: วิธีเก็บไฟล์
// - fileFilter: กรองประเภทไฟล์
// - limits: จำกัดขนาดไฟล์ไม่เกิน 5MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

module.exports = upload
