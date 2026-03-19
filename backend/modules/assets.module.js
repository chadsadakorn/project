const { getPool, generateAssetCode } = require('../database')

// ตรวจสอบความถูกต้องของข้อมูลครุภัณฑ์
function validateData({ asset_name, category, status }) {
  const errors = []
  if (!asset_name || asset_name.trim() === '') errors.push('กรุณากรอกชื่อครุภัณฑ์')
  if (!category   || category.trim() === '')   errors.push('กรุณากรอกหมวดหมู่')
  const validStatuses = ['ปกติ', 'ยืม', 'ชำรุด', 'สูญหาย', 'จำหน่าย']
  if (status && !validStatuses.includes(status)) errors.push('สถานะไม่ถูกต้อง')
  return errors
}

// ดึงสถิติสรุปสำหรับ Dashboard
async function getSummary() {
  const pool = getPool()

  // จำนวนครุภัณฑ์ทั้งหมด (นับตาม quantity ไม่ใช่จำนวน record)
  const [[{ total }]] = await pool.query(
    'SELECT COALESCE(SUM(quantity), 0) as total FROM assets'
  )

  // จำนวนรายการที่กำลังยืมอยู่
  const [[{ pendingBorrowCount }]] = await pool.query(
    `SELECT COUNT(*) as pendingBorrowCount FROM borrowing WHERE status = 'borrowed'`
  )

  // จำนวนรายการที่เกินกำหนดคืน
  const [[{ overdueCount }]] = await pool.query(
    `SELECT COUNT(*) as overdueCount FROM borrowing WHERE status = 'borrowed' AND expected_return_date < CURDATE()`
  )

  // จำนวนชิ้นที่ชำรุด/สูญหาย/จำหน่าย
  const [[{ damagedTotal }]] = await pool.query(
    `SELECT COALESCE(SUM(quantity), 0) as damagedTotal FROM assets WHERE status IN ('ชำรุด', 'สูญหาย', 'จำหน่าย')`
  )

  // ปกติ = ทั้งหมด - ยืม - เสียหาย
  const normalCount = total - pendingBorrowCount - damagedTotal

  // สรุปตามหมวดหมู่ (SUM quantity เพื่อนับจำนวนชิ้น)
  const [byCategory] = await pool.query(
    'SELECT category, SUM(quantity) as count FROM assets GROUP BY category ORDER BY count DESC'
  )

  // สรุปตามสถานะ (SUM quantity)
  const [byStatus] = await pool.query(
    'SELECT status, SUM(quantity) as count FROM assets GROUP BY status ORDER BY count DESC'
  )

  // ครุภัณฑ์ที่เพิ่มล่าสุด 5 รายการ
  const [recentAssets] = await pool.query(
    'SELECT id, asset_code, asset_name, category, status, created_at FROM assets ORDER BY created_at DESC LIMIT 5'
  )

  return { total, normalCount, pendingBorrowCount, overdueCount, byCategory, byStatus, recentAssets }
}

// ดึงหมวดหมู่ทั้งหมดที่มีในระบบ (ไม่ซ้ำ)
async function getCategories() {
  const pool = getPool()
  const [rows] = await pool.query('SELECT DISTINCT category FROM assets ORDER BY category')
  return rows.map(r => r.category) // คืนเป็น array ของ string เช่น ["IT", "ยานพาหนะ"]
}

// ดึงครุภัณฑ์ทั้งหมด พร้อมฟิลเตอร์และข้อมูลการยืม
async function getAll({ search, category, status } = {}) {
  const pool = getPool()

  // Subquery:
  // active_borrows   = จำนวนที่ยืมอยู่ตอนนี้ (เพื่อตรวจว่าเหลือยืมได้ไหม)
  // borrow_user_ids  = รายชื่อ user_id ที่ยืมอยู่ คั่นด้วย comma (เพื่อตรวจสิทธิ์การคืน)
  let query = `
    SELECT a.*,
      (SELECT COUNT(*) FROM borrowing WHERE asset_id = a.id AND status = 'borrowed') AS active_borrows,
      (SELECT GROUP_CONCAT(user_id) FROM borrowing WHERE asset_id = a.id AND status = 'borrowed') AS borrow_user_ids
    FROM assets a
    WHERE 1=1`
  const params = []

  // กรองตามคำค้นหา (ค้นได้จากหลายฟิลด์)
  if (search) {
    query += ` AND (a.asset_code LIKE ? OR a.asset_name LIKE ? OR a.responsible_person LIKE ? OR a.location LIKE ?)`
    const like = `%${search}%`
    params.push(like, like, like, like)
  }

  // กรองตามหมวดหมู่
  if (category) {
    query += ' AND a.category = ?'
    params.push(category)
  }

  // กรองตามสถานะ
  if (status) {
    query += ' AND a.status = ?'
    params.push(status)
  }

  query += ' ORDER BY a.created_at DESC'
  const [rows] = await pool.query(query, params)
  return rows
}

// ดึงครุภัณฑ์ชิ้นเดียวตาม id
async function getOne(id) {
  const pool = getPool()
  const [rows] = await pool.query('SELECT * FROM assets WHERE id = ?', [id])
  return rows[0] || null  // คืน null ถ้าหาไม่เจอ
}

// เพิ่มครุภัณฑ์ใหม่
async function create(data) {
  const errors = validateData(data)
  if (errors.length > 0) {
    throw { statusCode: 400, message: 'ข้อมูลไม่ถูกต้อง', errors }
  }

  const pool      = getPool()
  const assetCode = await generateAssetCode()  // สร้างรหัสอัตโนมัติ เช่น KPD-2026-001

  const [result] = await pool.query(
    `INSERT INTO assets (asset_code, asset_name, category, price, quantity, purchase_date, location, responsible_person, status, notes, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assetCode,
      data.asset_name.trim(),
      data.category          || 'อื่นๆ',
      data.price             || 0,
      data.quantity          || 1,
      data.purchase_date     || null,
      data.location          || null,
      data.responsible_person || null,
      data.status            || 'ปกติ',
      data.notes             || null,
      data.image_url         || null,
    ]
  )

  // คืน record ที่สร้างใหม่กลับไป
  return getOne(result.insertId)
}

// แก้ไขข้อมูลครุภัณฑ์
async function update(id, data) {
  const errors = validateData(data)
  if (errors.length > 0) {
    throw { statusCode: 400, message: 'ข้อมูลไม่ถูกต้อง', errors }
  }

  const pool     = getPool()
  const existing = await getOne(id)
  if (!existing) {
    throw { statusCode: 404, message: 'ไม่พบครุภัณฑ์', errors: [] }
  }

  // ถ้าไม่ส่งค่ามา → ใช้ค่าเดิม (PATCH-like behavior)
  await pool.query(
    `UPDATE assets SET
      asset_name = ?, category = ?, price = ?, quantity = ?, purchase_date = ?,
      location = ?, responsible_person = ?, status = ?, notes = ?, image_url = ?
     WHERE id = ?`,
    [
      data.asset_name         || existing.asset_name,
      data.category           || existing.category,
      data.price              !== undefined ? data.price              : existing.price,
      data.quantity           !== undefined ? data.quantity           : existing.quantity,
      data.purchase_date      !== undefined ? data.purchase_date      : existing.purchase_date,
      data.location           !== undefined ? data.location           : existing.location,
      data.responsible_person !== undefined ? data.responsible_person : existing.responsible_person,
      data.status             || existing.status,
      data.notes              !== undefined ? data.notes              : existing.notes,
      data.image_url          !== undefined ? data.image_url          : existing.image_url,
      id,
    ]
  )

  // คืน record ที่อัปเดตแล้ว
  return getOne(id)
}

// ลบครุภัณฑ์
async function remove(id) {
  const pool     = getPool()
  const existing = await getOne(id)
  if (!existing) {
    throw { statusCode: 404, message: 'ไม่พบครุภัณฑ์', errors: [] }
  }

  // ห้ามลบถ้ายังมีการยืมอยู่
  const [active] = await pool.query(
    `SELECT id FROM borrowing WHERE asset_id = ? AND status = 'borrowed'`,
    [id]
  )
  if (active.length > 0) {
    throw { statusCode: 400, message: 'ไม่สามารถลบครุภัณฑ์ที่อยู่ระหว่างการยืมได้', errors: [] }
  }

  // ลบประวัติการยืมก่อน แล้วค่อยลบครุภัณฑ์ (ป้องกัน FK constraint error)
  await pool.query('DELETE FROM borrowing WHERE asset_id = ?', [id])
  await pool.query('DELETE FROM assets WHERE id = ?', [id])
}

module.exports = { validateData, getSummary, getCategories, getAll, getOne, create, update, remove }
