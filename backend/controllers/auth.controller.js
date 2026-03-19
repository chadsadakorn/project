const asyncHandler = require('../middleware/asyncHandler')
const authModule   = require('../modules/auth.module')

// สมัครสมาชิก / เพิ่มผู้ใช้ใหม่
// POST /api/auth/signup  (ทุกคน)
// POST /api/auth/register (admin เท่านั้น)
const register = asyncHandler(async (req, res) => {
  // ส่ง body ทั้งหมดให้ module จัดการ (validate + hash password + insert DB)
  res.status(201).json(await authModule.register(req.body))
})

// เข้าสู่ระบบ
// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  // คืน token + ข้อมูล user กลับมา
  res.json(await authModule.login(req.body))
})

// ดึงรายชื่อผู้ใช้ทั้งหมด (ไม่รวม password)
// GET /api/auth/users
const getUsers = asyncHandler(async (req, res) => {
  res.json(await authModule.getUsers())
})

// ลบผู้ใช้
// DELETE /api/auth/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  // ป้องกัน admin ลบตัวเอง
  if (parseInt(req.params.id) === req.user.id) {
    throw { statusCode: 400, message: 'ไม่สามารถลบบัญชีตัวเองได้' }
  }
  await authModule.deleteUser(req.params.id)
  res.json({ message: 'ลบผู้ใช้สำเร็จ' })
})

module.exports = { register, login, getUsers, deleteUser }
