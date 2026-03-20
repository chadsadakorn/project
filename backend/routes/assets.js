const router           = require('express').Router()
const assetsController = require('../controllers/assets.controller')
const { isAdmin }      = require('../middleware/auth.middleware')


// ดึงสถิติสรุปสำหรับ Dashboard 
router.get('/stats/summary', assetsController.getSummary)

// ดึงหมวดหมู่ทั้งหมด 
router.get('/categories', assetsController.getCategories)

// ดึงครุภัณฑ์ทั้งหมด 
router.get('/', assetsController.getAll)

// ดึงครุภัณฑ์ตาม 
router.get('/:id', assetsController.getOne)

// เพิ่มครุภัณฑ์ใหม่ 
router.post('/', isAdmin, assetsController.create)

// แก้ไขครุภัณฑ์ 
router.put('/:id', isAdmin, assetsController.update)

// ลบครุภัณฑ์ 
router.delete('/:id', isAdmin, assetsController.remove)

module.exports = router
