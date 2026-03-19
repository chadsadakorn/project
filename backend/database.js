const mysql = require('mysql2/promise')

// เก็บ pool ไว้ใน module-level variable (singleton)
let pool

// คืน connection pool สำหรับ query ฐานข้อมูล
// ถ้ายังไม่มี pool → สร้างใหม่ครั้งเดียว แล้วใช้ซ้ำตลอด (Singleton Pattern)
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:     process.env.DB_HOST,           // hostname ของ MySQL (จาก .env)
      port:     Number(process.env.DB_PORT),   // port (ปกติ 3306)
      user:     process.env.DB_USER,           // username
      password: process.env.DB_PASSWORD,       // password
      database: process.env.DB_NAME,           // ชื่อฐานข้อมูล
      waitForConnections: true,                // รอ connection ถ้า pool เต็ม
      connectionLimit:    10,                  // จำนวน connection สูงสุด
      timezone: '+07:00',                      // timezone ไทย
    })
  }
  return pool
}

// สร้างรหัสครุภัณฑ์อัตโนมัติ เช่น KPD-2026-001
async function generateAssetCode() {
  const pool  = getPool()
  const year   = new Date().getFullYear()
  const prefix = `KPD-${year}-`

  // ดึงรหัสล่าสุดของปีนี้ เรียงจากมากไปน้อย
  const [rows] = await pool.query(
    `SELECT asset_code FROM assets WHERE asset_code LIKE ? ORDER BY asset_code DESC LIMIT 1`,
    [`${prefix}%`]
  )

  // ถ้ายังไม่มีในปีนี้ → เริ่มที่ 001
  let nextNum = 1
  if (rows.length > 0) {
    const parts   = rows[0].asset_code.split('-')    // ["KPD", "2026", "001"]
    const lastNum = parseInt(parts[parts.length - 1], 10) // แปลง "001" → 1
    if (!isNaN(lastNum)) nextNum = lastNum + 1       // เพิ่ม 1
  }

  // padStart(3, '0') → แปลง 1 เป็น "001", 12 เป็น "012"
  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

module.exports = { getPool, generateAssetCode }
