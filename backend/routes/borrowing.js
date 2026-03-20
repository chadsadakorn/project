const router              = require('express').Router()
const borrowingController = require('../controllers/borrowing.controller')


// ดึงรายการที่ยังไม่คืน 
router.get('/pending', borrowingController.getPending)

// ดึงรายการยืมทั้งหมด 
router.get('/', borrowingController.getAll)

// สร้างรายการยืมใหม่ 
router.post('/', borrowingController.create)

// บันทึกการคืนครุภัณฑ์ 
router.put('/:id/return', borrowingController.returnAsset)

module.exports = router
