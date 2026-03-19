const mysql = require('mysql2/promise')

let pool

// Singleton — สร้าง connection pool ครั้งเดียวแล้วใช้ซ้ำตลอด
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:     process.env.DB_HOST,
      port:     Number(process.env.DB_PORT),
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit:    10,
      timezone: '+07:00',
    })
  }
  return pool
}

// สร้างรหัสครุภัณฑ์อัตโนมัติ เช่น KPD-2026-001
async function generateAssetCode() {
  const pool   = getPool()
  const year   = new Date().getFullYear()
  const prefix = `KPD-${year}-`

  const [rows] = await pool.query(
    `SELECT asset_code FROM assets WHERE asset_code LIKE ? ORDER BY asset_code DESC LIMIT 1`,
    [`${prefix}%`]
  )

  let nextNum = 1
  if (rows.length > 0) {
    const parts   = rows[0].asset_code.split('-')
    const lastNum = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastNum)) nextNum = lastNum + 1
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

module.exports = { getPool, generateAssetCode }
