const jwt = require('jsonwebtoken')

// ใช้ JWT_SECRET จาก .env หรือ fallback ถ้าไม่ได้ตั้งค่า
const JWT_SECRET = process.env.JWT_SECRET || 'khrupphand_secret_key_2024'

// ==============================
// verifyToken — ตรวจสอบ JWT token
// ==============================
// ใช้เป็น middleware ก่อนทุก route ที่ต้อง login
// ดึง token จาก Authorization header รูปแบบ: "Bearer <token>"
// ถ้าผ่าน → แนบ req.user ไว้เพื่อใช้ใน controller
// ถ้าไม่ผ่าน → ส่ง 401 กลับทันที

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']

    // ต้องมี header และต้องขึ้นต้นด้วย "Bearer "
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw { statusCode: 401, message: 'ไม่มี token กรุณาเข้าสู่ระบบ' }
    }

    const token   = authHeader.split(' ')[1]          // ตัด "Bearer " ออก เหลือแค่ token
    const decoded = jwt.verify(token, JWT_SECRET)      // ถอดรหัสและตรวจความถูกต้อง
    req.user = decoded                                 // แนบข้อมูล user ไว้ใน request
    next()                                             // ผ่านไปยัง controller ถัดไป
  } catch (error) {
    // token หมดอายุหรือไม่ถูกต้อง
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'token ไม่ถูกต้องหรือหมดอายุ' })
    }
    console.error(error)
    res.status(error.statusCode || 500).json({ message: error.message || 'เกิดข้อผิดพลาด' })
  }
}

// ==============================
// isAdmin — ตรวจสอบสิทธิ์ admin
// ==============================
// ใช้ต่อจาก verifyToken เพื่อจำกัดเฉพาะ admin
// ถ้าไม่ใช่ admin → ส่ง 403 Forbidden

const isAdmin = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      throw { statusCode: 403, message: 'ไม่มีสิทธิ์เข้าถึง เฉพาะผู้ดูแลระบบเท่านั้น' }
    }
    next()
  } catch (error) {
    console.error(error)
    res.status(error.statusCode || 500).json({ message: error.message || 'เกิดข้อผิดพลาด' })
  }
}

module.exports = { verifyToken, isAdmin }
