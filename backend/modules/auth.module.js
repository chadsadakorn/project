const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const { getPool } = require('../database')

const JWT_SECRET  = process.env.JWT_SECRET
const SALT_ROUNDS = 10  // ยิ่งมากยิ่งปลอดภัย แต่ช้ากว่า (10 = มาตรฐาน)

// ตรวจสอบความถูกต้องของข้อมูลก่อนสมัครสมาชิก
function validateRegisterData({ username, password, firstname, lastname }) {
  const errors = []
  if (!username || username.trim() === '')  errors.push('กรุณากรอกชื่อผู้ใช้')
  if (!password || password.length < 6)    errors.push('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
  if (!firstname || firstname.trim() === '') errors.push('กรุณากรอกชื่อ')
  if (!lastname || lastname.trim() === '')   errors.push('กรุณากรอกนามสกุล')
  return errors
}

// สมัครสมาชิก / เพิ่มผู้ใช้ใหม่
async function register({ username, password, firstname, lastname, role }) {
  // ตรวจสอบข้อมูลก่อน
  const errors = validateRegisterData({ username, password, firstname, lastname })
  if (errors.length > 0) {
    throw { statusCode: 400, message: 'ข้อมูลไม่ถูกต้อง', errors }
  }

  const pool = getPool()

  // ตรวจสอบว่า username ซ้ำไหม
  const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username.trim()])
  if (existing.length > 0) {
    throw { statusCode: 409, message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว', errors: [] }
  }

  // เข้ารหัส password ด้วย bcrypt (ไม่เก็บรหัสจริงในฐานข้อมูล)
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

  // จำกัด role ให้เป็นแค่ 'admin' หรือ 'user' เท่านั้น
  const userRole = role === 'admin' ? 'admin' : 'user'

  // บันทึกลงฐานข้อมูล
  const [result] = await pool.query(
    `INSERT INTO users (username, password, firstname, lastname, role) VALUES (?, ?, ?, ?, ?)`,
    [username.trim(), hashedPassword, firstname.trim(), lastname.trim(), userRole]
  )

  // ดึงข้อมูลที่สร้างใหม่กลับมา (ไม่รวม password)
  const [rows] = await pool.query(
    'SELECT id, username, firstname, lastname, role, created_at FROM users WHERE id = ?',
    [result.insertId]
  )
  return rows[0]
}

// เข้าสู่ระบบ และสร้าง JWT token
async function login({ username, password }) {
  if (!username || !password) {
    throw { statusCode: 400, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', errors: [] }
  }

  const pool = getPool()

  // ค้นหา user จาก username
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username.trim()])
  if (rows.length === 0) {
    // ไม่บอกว่า username ไม่มีอยู่ เพื่อความปลอดภัย
    throw { statusCode: 401, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', errors: [] }
  }

  const user = rows[0]

  // เทียบรหัสผ่านกับ hash ในฐานข้อมูล
  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) {
    throw { statusCode: 401, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', errors: [] }
  }

  // สร้าง JWT token อายุ 7 วัน
  // payload: ข้อมูลที่ฝังใน token (อย่าใส่ข้อมูลลับ)
  const payload = { id: user.id, username: user.username, role: user.role }
  const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })

  return {
    token,
    user: {
      id:        user.id,
      username:  user.username,
      firstname: user.firstname,
      lastname:  user.lastname,
      role:      user.role,
    },
  }
}

// ดึงรายชื่อผู้ใช้ทั้งหมด (ไม่รวม password)
async function getUsers() {
  const pool = getPool()
  const [rows] = await pool.query(
    'SELECT id, username, firstname, lastname, role, created_at FROM users ORDER BY created_at DESC'
  )
  return rows
}

// ลบผู้ใช้ตาม id
async function deleteUser(id) {
  const pool = getPool()

  // ตรวจว่า user มีอยู่จริงไหม
  const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [id])
  if (rows.length === 0) {
    throw { statusCode: 404, message: 'ไม่พบผู้ใช้', errors: [] }
  }

  // ลบ user (borrowing ที่เกี่ยวข้องจะถูก SET NULL ตาม FK constraint)
  await pool.query('DELETE FROM users WHERE id = ?', [id])
}

module.exports = { register, login, getUsers, deleteUser }
