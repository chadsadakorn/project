const { getPool } = require('../database')


const BORROW_SELECT = `
  SELECT b.*, a.asset_code, a.asset_name, a.category, a.location,
         u.firstname, u.lastname, u.username
  FROM borrowing b
  JOIN assets a ON b.asset_id = a.id
  LEFT JOIN users u ON b.user_id = u.id
`

function validateData({ asset_id, borrower_name, borrow_date, expected_return_date }) {
  const errors = []
  if (!asset_id)                                    errors.push('กรุณาเลือกครุภัณฑ์')
  if (!borrower_name || borrower_name.trim() === '') errors.push('กรุณากรอกชื่อผู้ยืม')
  if (!borrow_date)                                 errors.push('กรุณาระบุวันที่ยืม')
  if (!expected_return_date)                        errors.push('กรุณาระบุวันที่คืนที่คาดว่าจะคืน')
  return errors
}

async function getAll({ status, search } = {}) {
  const pool = getPool()
  let query  = BORROW_SELECT + ' WHERE 1=1'
  const params = []

  if (status) { query += ' AND b.status = ?'; params.push(status) }
  if (search) {
    query += ' AND (b.borrower_name LIKE ? OR a.asset_code LIKE ? OR a.asset_name LIKE ?)'
    const like = `%${search}%`
    params.push(like, like, like)
  }

  query += ' ORDER BY b.expected_return_date ASC'
  const [rows] = await pool.query(query, params)
  return rows
}

function getPending() {
  return getAll({ status: 'borrowed' })
}

async function create({ asset_id, user_id, borrower_name, borrow_date, expected_return_date, notes }) {
  const errors = validateData({ asset_id, borrower_name, borrow_date, expected_return_date })
  if (errors.length > 0) throw { statusCode: 400, message: 'ข้อมูลไม่ถูกต้อง', errors }

  const pool = getPool()

  const [assetRows] = await pool.query('SELECT * FROM assets WHERE id = ?', [asset_id])
  if (assetRows.length === 0) throw { statusCode: 404, message: 'ไม่พบครุภัณฑ์', errors: [] }
  const asset = assetRows[0]

  if (asset.status !== 'ปกติ' && asset.status !== 'ยืม') {
    throw { statusCode: 400, message: `ครุภัณฑ์นี้มีสถานะ "${asset.status}" ไม่สามารถยืมได้`, errors: [] }
  }

  const [[{ activeCount }]] = await pool.query(
    `SELECT COUNT(*) AS activeCount FROM borrowing WHERE asset_id = ? AND status = 'borrowed'`,
    [asset_id]
  )
  const quantity = asset.quantity || 1

  // ถ้ายืมครบทุกชิ้นแล้ว → ไม่ให้ยืมเพิ่ม
  if (activeCount >= quantity) {
    throw { statusCode: 400, message: `ครุภัณฑ์นี้ถูกยืมครบทุกชิ้นแล้ว (${activeCount}/${quantity})`, errors: [] }
  }

  const [result] = await pool.query(
    `INSERT INTO borrowing (asset_id, user_id, borrower_name, borrow_date, expected_return_date, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, 'borrowed')`,
    [asset_id, user_id || null, borrower_name.trim(), borrow_date, expected_return_date, notes || null]
  )

  // status 'ยืม' | ยังมีเหลือ → 'ปกติ'
  await pool.query(
    `UPDATE assets SET status = ? WHERE id = ?`,
    [activeCount + 1 >= quantity ? 'ยืม' : 'ปกติ', asset_id]
  )

  const [rows] = await pool.query(BORROW_SELECT + 'WHERE b.id = ?', [result.insertId])
  return rows[0]
}

async function returnAsset(id, { actual_return_date, notes } = {}) {
  const pool = getPool()

  const [recordRows] = await pool.query('SELECT * FROM borrowing WHERE id = ?', [id])
  if (recordRows.length === 0) throw { statusCode: 404, message: 'ไม่พบรายการยืม', errors: [] }
  const record = recordRows[0]

  if (record.status === 'returned') throw { statusCode: 400, message: 'รายการนี้คืนแล้ว', errors: [] }

  const returnDate = actual_return_date || new Date().toISOString().substring(0, 10)

  
  await pool.query(
    `UPDATE borrowing SET status = 'returned', actual_return_date = ?, notes = COALESCE(?, notes) WHERE id = ?`,
    [returnDate, notes || null, id]
  )

  const [[{ remainingCount }]] = await pool.query(
    `SELECT COUNT(*) AS remainingCount FROM borrowing WHERE asset_id = ? AND status = 'borrowed'`,
    [record.asset_id]
  )

  // คืนหมดแล้ว ตั้งเป็นปกติเลย | ยังมีอยู่ → ตั้งปกติเฉพาะถ้าเคยถูก mark ว่า 'ยืม'
  const extraCondition = remainingCount === 0 ? '' : "AND status = 'ยืม'"
  await pool.query(`UPDATE assets SET status = 'ปกติ' WHERE id = ? ${extraCondition}`, [record.asset_id])

  const [rows] = await pool.query(BORROW_SELECT + 'WHERE b.id = ?', [id])
  return rows[0]
}

module.exports = { validateData, getAll, getPending, create, returnAsset }
