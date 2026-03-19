const asyncHandler   = require('../middleware/asyncHandler')
const assetsModule   = require('../modules/assets.module')

// ดึงสถิติสรุปสำหรับ Dashboard
// GET /api/assets/stats/summary
const getSummary = asyncHandler(async (req, res) => {
  res.json(await assetsModule.getSummary())
})

// ดึงหมวดหมู่ทั้งหมดที่มีในระบบ
// GET /api/assets/categories
const getCategories = asyncHandler(async (req, res) => {
  res.json(await assetsModule.getCategories())
})

// ดึงครุภัณฑ์ทั้งหมด พร้อมรองรับการกรอง
// GET /api/assets?search=&category=&status=
const getAll = asyncHandler(async (req, res) => {
  res.json(await assetsModule.getAll(req.query)) // ส่ง query string ไปกรองใน module
})

// ดึงข้อมูลครุภัณฑ์ชิ้นเดียวตาม id
// GET /api/assets/:id
const getOne = asyncHandler(async (req, res) => {
  const asset = await assetsModule.getOne(req.params.id)
  if (!asset) throw { statusCode: 404, message: 'ไม่พบครุภัณฑ์' }
  res.json(asset)
})

// เพิ่มครุภัณฑ์ใหม่ (เฉพาะ admin)
// POST /api/assets
const create = asyncHandler(async (req, res) => {
  res.status(201).json(await assetsModule.create(req.body))
})

// แก้ไขข้อมูลครุภัณฑ์ (เฉพาะ admin)
// PUT /api/assets/:id
const update = asyncHandler(async (req, res) => {
  const asset = await assetsModule.update(req.params.id, req.body)
  if (!asset) throw { statusCode: 404, message: 'ไม่พบครุภัณฑ์' }
  res.json(asset)
})

// ลบครุภัณฑ์ (เฉพาะ admin)
// DELETE /api/assets/:id
const remove = asyncHandler(async (req, res) => {
  await assetsModule.remove(req.params.id)
  res.json({ message: 'ลบครุภัณฑ์สำเร็จ' })
})

module.exports = { getSummary, getCategories, getAll, getOne, create, update, remove }
