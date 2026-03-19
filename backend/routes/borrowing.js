const router              = require('express').Router()
const borrowingController = require('../controllers/borrowing.controller')

// หมายเหตุ: verifyToken ถูก apply แล้วที่ index.js ก่อนถึง router นี้
// ทุก route ในนี้ต้อง login ก่อนเสมอ

// ดึงรายการที่ยังไม่คืน (status = 'borrowed')
router.get('/pending', borrowingController.getPending)

// ดึงรายการยืมทั้งหมด รองรับ query: ?status=&search=
router.get('/', borrowingController.getAll)

// สร้างรายการยืมใหม่ (ทุกคนที่ login)
router.post('/', borrowingController.create)

// บันทึกการคืนครุภัณฑ์ (admin คืนได้ทุกรายการ / user คืนได้เฉพาะของตัวเอง)
router.put('/:id/return', borrowingController.returnAsset)

module.exports = router
