const asyncHandler = require('../middleware/asyncHandler')
const authModule   = require('../modules/auth.module')


const register = asyncHandler(async (req, res) => {
  res.status(201).json(await authModule.register(req.body))
})

// POST 
const login = asyncHandler(async (req, res) => {
  res.json(await authModule.login(req.body))
})

// GET 
const getUsers = asyncHandler(async (req, res) => {
  res.json(await authModule.getUsers())
})

// DELETE 
const deleteUser = asyncHandler(async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    throw { statusCode: 400, message: 'ไม่สามารถลบบัญชีตัวเองได้' }
  }
  await authModule.deleteUser(req.params.id)
  res.json({ message: 'ลบผู้ใช้สำเร็จ' })
})

module.exports = { register, login, getUsers, deleteUser }
