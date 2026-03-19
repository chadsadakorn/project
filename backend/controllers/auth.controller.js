const asyncHandler = require('../middleware/asyncHandler')
const authModule   = require('../modules/auth.module')

// POST /api/auth/signup  (ทุกคน)
// POST /api/auth/register (admin เท่านั้น)
const register = asyncHandler(async (req, res) => {
  res.status(201).json(await authModule.register(req.body))
})

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  res.json(await authModule.login(req.body))
})

// GET /api/auth/users
const getUsers = asyncHandler(async (req, res) => {
  res.json(await authModule.getUsers())
})

// DELETE /api/auth/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    throw { statusCode: 400, message: 'ไม่สามารถลบบัญชีตัวเองได้' }
  }
  await authModule.deleteUser(req.params.id)
  res.json({ message: 'ลบผู้ใช้สำเร็จ' })
})

module.exports = { register, login, getUsers, deleteUser }
