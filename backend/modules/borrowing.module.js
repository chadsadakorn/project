const { getPool } = require('../database')

// SQL ฐานสำหรับดึงรายการยืม พร้อม JOIN ข้อมูลครุภัณฑ์และผู้ใช้
// ใช้ LEFT JOIN users เพราะ user อาจถูกลบไปแล้ว (user_id = NULL ได้)
const BORROW_SELECT = `
  SELECT b.*, a.asset_code, a.asset_name, a.category, a.location,
         u.firstname, u.lastname, u.username
  FROM borrowing b
  JOIN assets a ON b.asset_id = a.id
  LEFT JOIN users u ON b.user_id = u.id
`

// ตรวจสอบความถูกต้องของข้อมูลการยืม
function validateData({ asset_id, borrower_name, borrow_date, expected_return_date }) {
  const errors = []
  if (!asset_id)                                    errors.push('กรุณาเลือกครุภัณฑ์')
  if (!borrower_name || borrower_name.trim() === '') errors.push('กรุณากรอกชื่อผู้ยืม')
  if (!borrow_date)                                 errors.push('กรุณาระบุวันที่ยืม')
  if (!expected_return_date)                        errors.push('กรุณาระบุวันที่คืนที่คาดว่าจะคืน')
  return errors
}

// ดึงรายการยืมทั้งหมด พร้อมฟิลเตอร์
async function getAll({ status, search } = {}) {
  const pool = getPool()

  let query  = BORROW_SELECT + ' WHERE 1=1'
  const params = []

  // กรองตามสถานะ (borrowed / returned)
  if (status) {
    query += ' AND b.status = ?'
    params.push(status)
  }

  // กรองตามคำค้นหา
  if (search) {
    query += ' AND (b.borrower_name LIKE ? OR a.asset_code LIKE ? OR a.asset_name LIKE ?)'
    const like = `%${search}%`
    params.push(like, like, like)
  }

  // เรียงตามกำหนดคืน (ใกล้ถึงกำหนดก่อน) เหมือนกับ tab ยังไม่คืน
  query += ' ORDER BY b.expected_return_date ASC'
  const [rows] = await pool.query(query, params)
  return rows
}

// ดึงรายการที่ยังไม่คืน เรียงตามวันที่กำหนดคืน (ใกล้ถึงกำหนดก่อน)
async function getPending() {
  const pool = getPool()
  const [rows] = await pool.query(
    BORROW_SELECT + `WHERE b.status = 'borrowed' ORDER BY b.expected_return_date ASC`
  )
  return rows
}

// สร้างรายการยืมใหม่
async function create({ asset_id, user_id, borrower_name, borrow_date, expected_return_date, notes }) {
  const errors = validateData({ asset_id, borrower_name, borrow_date, expected_return_date })
  if (errors.length > 0) {
    throw { statusCode: 400, message: 'ข้อมูลไม่ถูกต้อง', errors }
  }

  const pool = getPool()

  // ตรวจสอบว่าครุภัณฑ์มีอยู่จริง
  const [assetRows] = await pool.query('SELECT * FROM assets WHERE id = ?', [asset_id])
  if (assetRows.length === 0) {
    throw { statusCode: 404, message: 'ไม่พบครุภัณฑ์', errors: [] }
  }
  const asset = assetRows[0]

  // ห้ามยืมถ้าสถานะเป็นชำรุด/สูญหาย/จำหน่าย
  if (asset.status !== 'ปกติ' && asset.status !== 'ยืม') {
    throw { statusCode: 400, message: `ครุภัณฑ์นี้มีสถานะ "${asset.status}" ไม่สามารถยืมได้`, errors: [] }
  }

  // นับจำนวนที่ยืมอยู่ตอนนี้
  const [[{ activeCount }]] = await pool.query(
    `SELECT COUNT(*) AS activeCount FROM borrowing WHERE asset_id = ? AND status = 'borrowed'`,
    [asset_id]
  )

  const quantity = asset.quantity || 1

  // ถ้ายืมครบทุกชิ้นแล้ว → ไม่ให้ยืมเพิ่ม
  if (activeCount >= quantity) {
    throw {
      statusCode: 400,
      message: `ครุภัณฑ์นี้ถูกยืมครบทุกชิ้นแล้ว (${activeCount}/${quantity})`,
      errors: []
    }
  }

  // บันทึกรายการยืม
  const [result] = await pool.query(
    `INSERT INTO borrowing (asset_id, user_id, borrower_name, borrow_date, expected_return_date, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, 'borrowed')`,
    [asset_id, user_id || null, borrower_name.trim(), borrow_date, expected_return_date, notes || null]
  )

  // อัปเดตสถานะครุภัณฑ์:
  // ถ้ายืมครบทุกชิ้น → 'ยืม' (ไม่มีให้ยืมอีก)
  // ถ้ายังมีเหลือ → 'ปกติ' (ยังยืมได้)
  if (activeCount + 1 >= quantity) {
    await pool.query(`UPDATE assets SET status = 'ยืม' WHERE id = ?`, [asset_id])
  } else {
    await pool.query(`UPDATE assets SET status = 'ปกติ' WHERE id = ?`, [asset_id])
  }

  // คืนรายการที่สร้างใหม่พร้อมข้อมูล JOIN
  const [rows] = await pool.query(BORROW_SELECT + 'WHERE b.id = ?', [result.insertId])
  return rows[0]
}

// บันทึกการคืนครุภัณฑ์
async function returnAsset(id, { actual_return_date, notes } = {}) {
  const pool = getPool()

  // ดึงรายการยืมที่ต้องการคืน
  const [recordRows] = await pool.query('SELECT * FROM borrowing WHERE id = ?', [id])
  if (recordRows.length === 0) {
    throw { statusCode: 404, message: 'ไม่พบรายการยืม', errors: [] }
  }
  const record = recordRows[0]

  // ถ้าคืนแล้ว → ไม่ให้คืนซ้ำ
  if (record.status === 'returned') {
    throw { statusCode: 400, message: 'รายการนี้คืนแล้ว', errors: [] }
  }

  // ถ้าไม่ส่งวันที่คืน → ใช้วันนี้
  const returnDate = actual_return_date || new Date().toISOString().substring(0, 10)

  // อัปเดตสถานะเป็น returned
  // COALESCE(?, notes) = ถ้าส่ง notes มา → ใช้ใหม่, ถ้าไม่ส่ง → ใช้ notes เดิม
  await pool.query(
    `UPDATE borrowing SET status = 'returned', actual_return_date = ?, notes = COALESCE(?, notes) WHERE id = ?`,
    [returnDate, notes || null, id]
  )

  // ตรวจสอบว่ายังมีคนยืมอยู่ไหม (หลังคืน)
  const [[{ remainingCount }]] = await pool.query(
    `SELECT COUNT(*) AS remainingCount FROM borrowing WHERE asset_id = ? AND status = 'borrowed'`,
    [record.asset_id]
  )

  if (remainingCount === 0) {
    // ไม่มีการยืมเหลืออยู่เลย → คืนสถานะครุภัณฑ์เป็น 'ปกติ'
    await pool.query(`UPDATE assets SET status = 'ปกติ' WHERE id = ?`, [record.asset_id])
  } else {
    // ยังมีการยืมบางส่วน แต่ไม่เต็มทุกชิ้น → เปลี่ยนจาก 'ยืม' กลับเป็น 'ปกติ' (มีเหลือให้ยืม)
    await pool.query(`UPDATE assets SET status = 'ปกติ' WHERE id = ? AND status = 'ยืม'`, [record.asset_id])
  }

  // คืนรายการที่อัปเดตแล้ว
  const [rows] = await pool.query(BORROW_SELECT + 'WHERE b.id = ?', [id])
  return rows[0]
}

// ดึงรายงานการยืม พร้อมสรุปสถิติ
async function getReport({ dateFrom, dateTo, status } = {}) {
  const pool = getPool()

  let query  = BORROW_SELECT + ' WHERE 1=1'
  const params = []

  // กรองตามช่วงวันที่ยืม
  if (dateFrom) { query += ' AND b.borrow_date >= ?'; params.push(dateFrom) }
  if (dateTo)   { query += ' AND b.borrow_date <= ?'; params.push(dateTo) }
  if (status)   { query += ' AND b.status = ?';       params.push(status) }

  query += ' ORDER BY b.borrow_date DESC'
  const [rows] = await pool.query(query, params)

  const today = new Date().toISOString().substring(0, 10)

  // สรุปสถิติ
  const summary = {
    total:    rows.length,
    returned: rows.filter(r => r.status === 'returned').length,
    pending:  rows.filter(r => r.status === 'borrowed').length,
    overdue:  rows.filter(r => r.status === 'borrowed' && r.expected_return_date < today).length,
  }

  return { summary, records: rows }
}

// ดึงรายงานประจำปี (สำหรับรายงานสรุปประจำปีงบประมาณ)
async function getAnnualReport(year) {
  const pool  = getPool()
  const today = new Date().toISOString().substring(0, 10)

  // สรุปรวมทั้งปี
  const [[summary]] = await pool.query(
    `SELECT
      COUNT(*)                                                    AS total,
      SUM(status = 'returned')                                    AS returned,
      SUM(status = 'borrowed')                                    AS pending,
      SUM(status = 'borrowed' AND expected_return_date < ?)       AS overdue
     FROM borrowing WHERE YEAR(borrow_date) = ?`,
    [today, year]
  )

  // สถิติรายเดือน (1-12)
  const [monthly] = await pool.query(
    `SELECT MONTH(borrow_date) AS month, COUNT(*) AS total,
            SUM(status = 'returned') AS returned,
            SUM(status = 'borrowed') AS pending
     FROM borrowing WHERE YEAR(borrow_date) = ?
     GROUP BY MONTH(borrow_date) ORDER BY month`,
    [year]
  )

  // Top 5 ครุภัณฑ์ที่ถูกยืมมากที่สุดในปีนี้
  const [topAssets] = await pool.query(
    `SELECT a.asset_code, a.asset_name, a.category, COUNT(*) AS borrow_count
     FROM borrowing b JOIN assets a ON b.asset_id = a.id
     WHERE YEAR(b.borrow_date) = ?
     GROUP BY b.asset_id ORDER BY borrow_count DESC LIMIT 5`,
    [year]
  )

  // สรุปตามหมวดหมู่
  const [byCategory] = await pool.query(
    `SELECT a.category, COUNT(*) AS count
     FROM borrowing b JOIN assets a ON b.asset_id = a.id
     WHERE YEAR(b.borrow_date) = ?
     GROUP BY a.category ORDER BY count DESC`,
    [year]
  )

  // จำนวนครุภัณฑ์ที่เพิ่มในปีนี้
  const [[{ newAssets }]] = await pool.query(
    `SELECT COUNT(*) AS newAssets FROM assets WHERE YEAR(created_at) = ?`,
    [year]
  )

  // รายการยืมทั้งหมดในปี เรียงตามวันที่
  const [records] = await pool.query(
    BORROW_SELECT + `WHERE YEAR(b.borrow_date) = ? ORDER BY b.borrow_date ASC`,
    [year]
  )

  return { year, summary, monthly, topAssets, byCategory, newAssets, records }
}

module.exports = { validateData, getAll, getPending, create, returnAsset, getReport, getAnnualReport }
