const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const { getPool } = require('../database')

const JWT_SECRET  = process.env.JWT_SECRET
const SALT_ROUNDS = 10

function validateRegisterData({ username, password, firstname, lastname }) {
  const errors = []
  if (!username || username.trim() === '')  errors.push('กรุณากรอกชื่อผู้ใช้')
  if (!password || password.length < 6)    errors.push('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
  if (!firstname || firstname.trim() === '') errors.push('กรุณากรอกชื่อ')
  if (!lastname || lastname.trim() === '')   errors.push('กรุณากรอกนามสกุล')
  return errors
}

async function register({ username, password, firstname, lastname, role }) {
  const errors = validateRegisterData({ username, password, firstname, lastname })
  if (errors.length > 0) throw { statusCode: 400, message: 'ข้อมูลไม่ถูกต้อง', errors }

  const pool = getPool()

  const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username.trim()])
  if (existing.length > 0) throw { statusCode: 409, message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว', errors: [] }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
  const userRole = role === 'admin' ? 'admin' : 'user'

  const [result] = await pool.query(
    `INSERT INTO users (username, password, firstname, lastname, role) VALUES (?, ?, ?, ?, ?)`,
    [username.trim(), hashedPassword, firstname.trim(), lastname.trim(), userRole]
  )

  // คืน object ตรงๆ ไม่ต้อง SELECT ซ้ำ
  return { id: result.insertId, username: username.trim(), firstname: firstname.trim(), lastname: lastname.trim(), role: userRole }
}

async function login({ username, password }) {
  if (!username || !password) {
    throw { statusCode: 400, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', errors: [] }
  }

  const pool = getPool()
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username.trim()])
  if (rows.length === 0) {
    throw { statusCode: 401, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', errors: [] }
  }

  const user = rows[0]
  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) {
    throw { statusCode: 401, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', errors: [] }
  }

  // สร้าง JWT token อายุ 7 วัน
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  return {
    token,
    user: { id: user.id, username: user.username, firstname: user.firstname, lastname: user.lastname, role: user.role },
  }
}

async function getUsers() {
  const pool = getPool()
  const [rows] = await pool.query(
    'SELECT id, username, firstname, lastname, role, created_at FROM users ORDER BY created_at DESC'
  )
  return rows
}

async function deleteUser(id) {
  const pool = getPool()
  const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [id])
  if (rows.length === 0) throw { statusCode: 404, message: 'ไม่พบผู้ใช้', errors: [] }
  // borrowing ที่เกี่ยวข้องจะถูก SET NULL ตาม FK constraint
  await pool.query('DELETE FROM users WHERE id = ?', [id])
}

module.exports = { register, login, getUsers, deleteUser }
