const { getPool, generateAssetCode } = require('../database')

function validateData({ asset_name, category, status }) {
  const errors = []
  if (!asset_name || asset_name.trim() === '') errors.push('กรุณากรอกชื่อครุภัณฑ์')
  if (!category   || category.trim() === '')   errors.push('กรุณากรอกหมวดหมู่')
  const validStatuses = ['ปกติ', 'ยืม', 'ชำรุด', 'สูญหาย', 'จำหน่าย']
  if (status && !validStatuses.includes(status)) errors.push('สถานะไม่ถูกต้อง')
  return errors
}

async function getSummary() {
  const pool = getPool()

  // รัน query ทั้ง 7 พร้อมกัน
  const [
    [totalRows],
    [pendingRows],
    [overdueRows],
    [damagedRows],
    [byCategory],
    [byStatus],
    [recentAssets],
  ] = await Promise.all([
    pool.query('SELECT COALESCE(SUM(quantity), 0) as total FROM assets'),
    pool.query(`SELECT COUNT(*) as pendingBorrowCount FROM borrowing WHERE status = 'borrowed'`),
    pool.query(`SELECT COUNT(*) as overdueCount FROM borrowing WHERE status = 'borrowed' AND expected_return_date < CURDATE()`),
    pool.query(`SELECT COALESCE(SUM(quantity), 0) as damagedTotal FROM assets WHERE status IN ('ชำรุด', 'สูญหาย', 'จำหน่าย')`),
    pool.query('SELECT category, SUM(quantity) as count FROM assets GROUP BY category ORDER BY count DESC'),
    pool.query('SELECT status, SUM(quantity) as count FROM assets GROUP BY status ORDER BY count DESC'),
    pool.query('SELECT id, asset_code, asset_name, category, status, created_at FROM assets ORDER BY created_at DESC LIMIT 5'),
  ])

  const total              = totalRows[0].total
  const pendingBorrowCount = pendingRows[0].pendingBorrowCount
  const overdueCount       = overdueRows[0].overdueCount
  const damagedTotal       = damagedRows[0].damagedTotal
  const normalCount        = total - pendingBorrowCount - damagedTotal

  return { total, normalCount, pendingBorrowCount, overdueCount, byCategory, byStatus, recentAssets }
}

async function getCategories() {
  const pool = getPool()
  const [rows] = await pool.query('SELECT DISTINCT category FROM assets ORDER BY category')
  return rows.map(r => r.category)
}

async function getAll({ search, category, status } = {}) {
  const pool = getPool()

  // active_borrows = จำนวนที่ยืมอยู่ตอนนี้
  
  let query = `
    SELECT a.*,
      (SELECT COUNT(*) FROM borrowing WHERE asset_id = a.id AND status = 'borrowed') AS active_borrows,
      (SELECT GROUP_CONCAT(user_id) FROM borrowing WHERE asset_id = a.id AND status = 'borrowed') AS borrow_user_ids
    FROM assets a
    WHERE 1=1`
  const params = []

  if (search) {
    query += ` AND (a.asset_code LIKE ? OR a.asset_name LIKE ? OR a.responsible_person LIKE ? OR a.location LIKE ?)`
    const like = `%${search}%`
    params.push(like, like, like, like)
  }
  if (category) { query += ' AND a.category = ?'; params.push(category) }
  if (status)   { query += ' AND a.status = ?';   params.push(status) }

  query += ' ORDER BY a.created_at DESC'
  const [rows] = await pool.query(query, params)
  return rows
}

async function getOne(id) {
  const pool = getPool()
  const [rows] = await pool.query('SELECT * FROM assets WHERE id = ?', [id])
  return rows[0] || null
}

async function create(data) {
  const errors = validateData(data)
  if (errors.length > 0) throw { statusCode: 400, message: 'ข้อมูลไม่ถูกต้อง', errors }

  const pool      = getPool()
  const assetCode = await generateAssetCode()

  const [result] = await pool.query(
    `INSERT INTO assets (asset_code, asset_name, category, price, quantity, purchase_date, location, responsible_person, status, notes, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assetCode,
      data.asset_name.trim(),
      data.category           || 'อื่นๆ',
      data.price              || 0,
      data.quantity           || 1,
      data.purchase_date      || null,
      data.location           || null,
      data.responsible_person || null,
      data.status             || 'ปกติ',
      data.notes              || null,
      data.image_url          || null,
    ]
  )
  return getOne(result.insertId)
}

async function update(id, data) {
  const errors = validateData(data)
  if (errors.length > 0) throw { statusCode: 400, message: 'ข้อมูลไม่ถูกต้อง', errors }

  const pool     = getPool()
  const existing = await getOne(id)
  if (!existing) throw { statusCode: 404, message: 'ไม่พบครุภัณฑ์', errors: [] }

  // pick: ถ้าส่งค่ามา → ใช้ค่าใหม่ / ถ้าไม่ส่ง (undefined) → ใช้ค่าเดิม
  const pick = (newVal, oldVal) => newVal !== undefined ? newVal : oldVal

  await pool.query(
    `UPDATE assets SET
      asset_name = ?, category = ?, price = ?, quantity = ?, purchase_date = ?,
      location = ?, responsible_person = ?, status = ?, notes = ?, image_url = ?
     WHERE id = ?`,
    [
      data.asset_name || existing.asset_name,
      data.category   || existing.category,
      pick(data.price,              existing.price),
      pick(data.quantity,           existing.quantity),
      pick(data.purchase_date,      existing.purchase_date),
      pick(data.location,           existing.location),
      pick(data.responsible_person, existing.responsible_person),
      data.status || existing.status,
      pick(data.notes,              existing.notes),
      pick(data.image_url,          existing.image_url),
      id,
    ]
  )
  return getOne(id)
}

async function remove(id) {
  const pool     = getPool()
  const existing = await getOne(id)
  if (!existing) throw { statusCode: 404, message: 'ไม่พบครุภัณฑ์', errors: [] }

  const [active] = await pool.query(
    `SELECT id FROM borrowing WHERE asset_id = ? AND status = 'borrowed'`, [id]
  )
  if (active.length > 0) {
    throw { statusCode: 400, message: 'ไม่สามารถลบครุภัณฑ์ที่อยู่ระหว่างการยืมได้', errors: [] }
  }

  await pool.query('DELETE FROM borrowing WHERE asset_id = ?', [id])
  await pool.query('DELETE FROM assets WHERE id = ?', [id])
}

module.exports = { validateData, getSummary, getCategories, getAll, getOne, create, update, remove }
