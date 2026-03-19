require('dotenv').config()
const bcrypt = require('bcryptjs')
const { getPool } = require('./database')

async function seed() {
  const pool = getPool()
  const password = await bcrypt.hash('admin1234', 10)

  await pool.query(
    `INSERT INTO users (username, password, firstname, lastname, role)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE role = 'admin'`,
    ['admin', password, 'ผู้ดูแล', 'ระบบ', 'admin']
  )

  console.log('สร้าง admin สำเร็จ')
  console.log('username: admin')
  console.log('password: admin1234')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
