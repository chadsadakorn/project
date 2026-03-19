// dashboard.js — หน้า Dashboard แสดงภาพรวมระบบ
// admin → เห็นสถิติรวม / user → เห็นเฉพาะรายการยืมของตัวเอง

const user = initPage()  // ตรวจสอบ login และดึงข้อมูล user

window.onload = async () => {
  // แสดง section ที่เหมาะสมตาม role
  if (user.role === 'admin') {
    document.getElementById('adminDashboard').classList.remove('d-none')
    loadAdminDashboard()
  } else {
    document.getElementById('userDashboard').classList.remove('d-none')
    loadUserDashboard()
  }
}

// ==============================
// Dashboard สำหรับ Admin
// ==============================
async function loadAdminDashboard() {
  try {
    // ดึงข้อมูลสรุปจาก API
    const { data } = await axios.get(`${BASE_URL}/assets/stats/summary`)
    const { total, normalCount, pendingBorrowCount, overdueCount, byCategory, byStatus, recentAssets } = data

    // อัปเดต stat cards
    document.getElementById('totalAssets').textContent   = total               // ทั้งหมด
    document.getElementById('normalCount').textContent   = normalCount          // ปกติ
    document.getElementById('borrowedCount').textContent = pendingBorrowCount   // กำลังยืม
    document.getElementById('pendingCount').textContent  = overdueCount         // เกินกำหนด

    // แสดงสรุปตามหมวดหมู่ พร้อม progress bar
    document.getElementById('categoryList').innerHTML = byCategory.length === 0
      ? '<p class="text-muted text-center">ยังไม่มีข้อมูล</p>'
      : byCategory.map(c => `
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span><i class="bi bi-tag me-2 text-muted"></i>${c.category}</span>
            <span class="badge bg-primary rounded-pill">${c.count}</span>
          </div>
          <div class="progress mb-3" style="height:6px">
            <div class="progress-bar" style="width:${Math.round((c.count / total) * 100)}%"></div>
          </div>`).join('')

    // แสดงสรุปตามสถานะ
    document.getElementById('statusList').innerHTML = byStatus.length === 0
      ? '<p class="text-muted text-center">ยังไม่มีข้อมูล</p>'
      : byStatus.map(s => `
          <div class="d-flex justify-content-between align-items-center mb-2">
            ${statusBadge(s.status)}
            <span class="fw-medium">${s.count} รายการ</span>
          </div>`).join('')

    // แสดงตารางรายการยืมปัจจุบัน (ใครยืมอะไรอยู่)
    await loadCurrentBorrowing()

    // แสดงตารางครุภัณฑ์ที่เพิ่มล่าสุด
    document.getElementById('recentAssetsBody').innerHTML = recentAssets.length === 0
      ? '<tr><td colspan="5" class="text-center text-muted py-3">ยังไม่มีข้อมูล</td></tr>'
      : recentAssets.map(a => `
          <tr>
            <td><code>${a.asset_code}</code></td>
            <td>${a.asset_name}</td>
            <td>${a.category}</td>
            <td>${statusBadge(a.status)}</td>
            <td>${formatDate(a.created_at)}</td>
          </tr>`).join('')

  } catch (err) {
    handleApiError(err)
  }
}

// ==============================
// โหลดรายการยืมปัจจุบัน (admin)
// ==============================
async function loadCurrentBorrowing() {
  try {
    const { data } = await axios.get(`${BASE_URL}/borrowing/pending`)
    const today    = new Date().toISOString().substring(0, 10)

    document.getElementById('currentBorrowingBody').innerHTML = data.length === 0
      ? `<tr><td colspan="6" class="text-center text-muted py-3">ไม่มีรายการยืมขณะนี้</td></tr>`
      : data.map(r => {
          const overdue = r.expected_return_date < today
          return `
            <tr class="${overdue ? 'table-warning' : ''}">
              <td><code class="text-primary">${r.asset_code}</code></td>
              <td>${r.asset_name}</td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="avatar-circle bg-primary-soft text-primary" style="width:28px;height:28px;font-size:11px;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                    ${r.firstname ? r.firstname[0] + (r.lastname ? r.lastname[0] : '') : '?'}
                  </div>
                  <span>${r.borrower_name}</span>
                </div>
              </td>
              <td>${formatDate(r.borrow_date)}</td>
              <td class="${overdue ? 'text-danger fw-medium' : ''}">${formatDate(r.expected_return_date)}${overdue ? ' <span class="badge bg-danger ms-1">เกินกำหนด</span>' : ''}</td>
              <td><span class="badge badge-borrowed">ยืม</span></td>
            </tr>`
        }).join('')
  } catch (err) {
    document.getElementById('currentBorrowingBody').innerHTML =
      `<tr><td colspan="6" class="text-center text-muted py-3">ไม่สามารถโหลดข้อมูลได้</td></tr>`
  }
}

// ==============================
// Dashboard สำหรับ User ทั่วไป
// ==============================
async function loadUserDashboard() {
  try {
    // ดึงรายการยืมทั้งหมด แล้วกรองเฉพาะของตัวเอง
    const { data } = await axios.get(`${BASE_URL}/borrowing`)

    // Number() เพื่อให้แน่ใจว่าเป็น int ก่อนเทียบ (user_id อาจมาเป็น string จาก DB)
    const myRecords = data.filter(r => Number(r.user_id) === Number(user.id))

    const today = new Date().toISOString().substring(0, 10)

    // แยกประเภทรายการ
    const borrowing = myRecords.filter(r => r.status === 'borrowed')
    const overdue   = borrowing.filter(r => r.expected_return_date < today)  // เกินกำหนดคืน
    const returned  = myRecords.filter(r => r.status === 'returned')

    // อัปเดต stat cards
    document.getElementById('myBorrowing').textContent = borrowing.length
    document.getElementById('myOverdue').textContent   = overdue.length
    document.getElementById('myReturned').textContent  = returned.length

    // แสดงตาราง 10 รายการล่าสุด
    const recent = myRecords.slice(0, 10)
    document.getElementById('myBorrowingBody').innerHTML = recent.length === 0
      ? '<tr><td colspan="5" class="text-center text-muted py-3">ยังไม่มีรายการยืม</td></tr>'
      : recent.map(r => {
          const isOverdue = r.status === 'borrowed' && r.expected_return_date < today

          // badge แสดงสถานะ พร้อมแจ้งเตือนถ้าเกินกำหนด
          const badge = r.status === 'returned'
            ? `<span class="badge badge-normal">คืนแล้ว</span>`
            : `<span class="badge badge-borrowed">ยืม${isOverdue ? ' <span class="badge bg-danger ms-1">เกินกำหนด</span>' : ''}</span>`

          return `
            <tr class="${isOverdue ? 'table-warning' : ''}">
              <td><code>${r.asset_code}</code></td>
              <td>${r.asset_name}</td>
              <td>${formatDate(r.borrow_date)}</td>
              <td class="${isOverdue ? 'text-danger fw-medium' : ''}">${formatDate(r.expected_return_date)}</td>
              <td>${badge}</td>
            </tr>`
        }).join('')

  } catch (err) {
    handleApiError(err)
  }
}
