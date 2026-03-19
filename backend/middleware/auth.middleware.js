const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'khrupphand_secret_key_2024'

// ตรวจสอบ JWT token จาก Authorization header → แนบ req.user
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw { statusCode: 401, message: 'ไม่มี token กรุณาเข้าสู่ระบบ' }
    }
    const token   = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'token ไม่ถูกต้องหรือหมดอายุ' })
    }
    console.error(error)
    res.status(error.statusCode || 500).json({ message: error.message || 'เกิดข้อผิดพลาด' })
  }
}

// จำกัดเฉพาะ admin เท่านั้น (ใช้ต่อจาก verifyToken)
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
