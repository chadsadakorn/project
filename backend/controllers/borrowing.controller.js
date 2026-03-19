const asyncHandler    = require('../middleware/asyncHandler')
const borrowingModule = require('../modules/borrowing.module')
const { getPool }     = require('../database')

// GET /api/borrowing?status=&search=
const getAll = asyncHandler(async (req, res) => {
  res.json(await borrowingModule.getAll(req.query))
})

// GET /api/borrowing/pending
const getPending = asyncHandler(async (req, res) => {
  res.json(await borrowingModule.getPending())
})

// POST /api/borrowing
const create = asyncHandler(async (req, res) => {
  // แนบ user_id จาก token (ป้องกัน frontend ปลอม user_id)
  res.status(201).json(
    await borrowingModule.create({ ...req.body, user_id: req.user.id })
  )
})

// PUT /api/borrowing/:id/return
const returnAsset = asyncHandler(async (req, res) => {
  const pool = getPool()
  const [[record]] = await pool.query('SELECT * FROM borrowing WHERE id = ?', [req.params.id])

  if (!record) return res.status(404).json({ message: 'ไม่พบรายการยืม' })

  // admin คืนได้ทุกรายการ | user คืนได้เฉพาะของตัวเอง
  if (req.user.role !== 'admin' && record.user_id !== req.user.id) {
    return res.status(403).json({ message: 'ไม่มีสิทธิ์คืนรายการนี้ เนื่องจากไม่ใช่รายการที่คุณยืม' })
  }

  res.json(await borrowingModule.returnAsset(req.params.id, req.body))
})

// GET /api/borrowing/report?dateFrom=&dateTo=&status=
const getReport = asyncHandler(async (req, res) => {
  res.json(await borrowingModule.getReport(req.query))
})

// GET /api/borrowing/annual?year=
const getAnnualReport = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear()
  res.json(await borrowingModule.getAnnualReport(year))
})

module.exports = { getAll, getPending, create, returnAsset, getReport, getAnnualReport }
