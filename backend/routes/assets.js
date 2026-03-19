const router           = require('express').Router()
const assetsController = require('../controllers/assets.controller')
const { isAdmin }      = require('../middleware/auth.middleware')

// หมายเหตุ: verifyToken ถูก apply แล้วที่ index.js ก่อนถึง router นี้
// ดังนั้นทุก route ในนี้ต้อง login อยู่แล้ว
// isAdmin จะถูกเพิ่มเฉพาะ route ที่ต้องการสิทธิ์ admin

// ดึงสถิติสรุปสำหรับ Dashboard (ทุกคนที่ login)
router.get('/stats/summary', assetsController.getSummary)

// ดึงหมวดหมู่ทั้งหมด (ทุกคนที่ login)
router.get('/categories', assetsController.getCategories)

// ดึงครุภัณฑ์ทั้งหมด รองรับ query: ?search=&category=&status= (ทุกคนที่ login)
router.get('/', assetsController.getAll)

// ดึงครุภัณฑ์ตาม id (ทุกคนที่ login)
router.get('/:id', assetsController.getOne)

// เพิ่มครุภัณฑ์ใหม่ (เฉพาะ admin)
router.post('/', isAdmin, assetsController.create)

// แก้ไขครุภัณฑ์ (เฉพาะ admin)
router.put('/:id', isAdmin, assetsController.update)

// ลบครุภัณฑ์ (เฉพาะ admin)
router.delete('/:id', isAdmin, assetsController.remove)

module.exports = router
