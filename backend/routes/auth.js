const router         = require('express').Router()
const authController = require('../controllers/auth.controller')
const { verifyToken, isAdmin } = require('../middleware/auth.middleware')

// สมัครสมาชิก — ทุกคนทำได้ 
router.post('/signup', authController.register)

// เพิ่มผู้ใช้ใหม่ — เฉพาะ admin 
router.post('/register', verifyToken, isAdmin, authController.register)

// เข้าสู่ระบบ — ทุกคนทำได้ 
router.post('/login', authController.login)

// ดึงรายชื่อผู้ใช้ทั้งหมด — เฉพาะ admin
router.get('/users', verifyToken, isAdmin, authController.getUsers)

// ลบผู้ใช้ตาม id — เฉพาะ admin
router.delete('/users/:id', verifyToken, isAdmin, authController.deleteUser)

module.exports = router
