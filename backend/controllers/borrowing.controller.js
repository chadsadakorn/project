const asyncHandler    = require('../middleware/asyncHandler')
const borrowingModule = require('../modules/borrowing.module')
const { getPool }     = require('../database')


const getAll = asyncHandler(async (req, res) => {
  res.json(await borrowingModule.getAll(req.query))
})

 
const getPending = asyncHandler(async (req, res) => {
  res.json(await borrowingModule.getPending())
})


const create = asyncHandler(async (req, res) => {
  
  res.status(201).json(
    await borrowingModule.create({ ...req.body, user_id: req.user.id })
  )
})


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


module.exports = { getAll, getPending, create, returnAsset }
