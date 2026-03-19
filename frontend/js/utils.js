// utils.js — ฟังก์ชันกลางที่ใช้ร่วมกันทุกหน้า
// ต้อง include ไฟล์นี้ก่อน script อื่นในทุกหน้า HTML

// URL ฐานของ API (ต้องตรงกับ PORT ใน .env)
const BASE_URL = 'http://localhost:3001/api'

// ==============================
// initPage — ตรวจสอบ login และเตรียมหน้า
// ==============================
// เรียกในทุกหน้าที่ต้อง login
// adminOnly: true → redirect ถ้าไม่ใช่ admin
// คืน object user หรือ null ถ้าไม่ผ่าน

function initPage({ adminOnly = false } = {}) {
  const token = localStorage.getItem('token')
  const user  = JSON.parse(localStorage.getItem('user') || '{}')

  // ถ้าไม่มี token หรือต้องเป็น admin แต่ไม่ใช่ → ไปหน้า login
  if (!token || (adminOnly && user.role !== 'admin')) {
    window.location.href = 'login.html'
    return null
  }

  // แนบ token ให้ axios ทุก request อัตโนมัติ
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + token

  // แสดงชื่อผู้ใช้บน navbar
  const navUsername = document.getElementById('navUsername')
  if (navUsername) navUsername.textContent = `${user.firstname} ${user.lastname} (${user.role})`

  // แสดง element ที่ซ่อนไว้สำหรับ admin (class="admin-only")
  if (user.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'))
  }

  // ผูกปุ่ม logout
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault()
    localStorage.clear()              // ลบ token และข้อมูล user
    window.location.href = 'login.html'
  })

  return user
}

// ==============================
// showMessage — แสดง alert
// ==============================
// id: element id ที่จะแสดง alert
// type: 'danger' (error) | 'success' | 'warning' | 'info'

function showMessage(id, msg, type = 'danger') {
  const el = document.getElementById(id)
  if (el) el.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show">
      ${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`
}

// ==============================
// formatDate — แปลงวันที่เป็น format ไทย
// ==============================
// คืน เช่น "15 ม.ค. 2567"

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year:  'numeric',
    month: 'short',
    day:   'numeric'
  })
}

// ==============================
// statusBadge — สร้าง badge สีตามสถานะ
// ==============================
// คืน HTML string เช่น <span class="badge badge-normal">ปกติ</span>

function statusBadge(status) {
  const map = {
    'ปกติ':   'badge-normal',
    'ยืม':    'badge-borrowed',
    'ชำรุด':  'badge-damaged',
    'สูญหาย': 'badge-lost',
    'จำหน่าย': 'badge-disposed',
  }
  return `<span class="badge ${map[status] || 'bg-secondary'}">${status}</span>`
}

// ==============================
// todayISO — วันที่วันนี้ในรูปแบบ YYYY-MM-DD
// ==============================
// ใช้กับ input[type=date] และเปรียบเทียบวันที่

function todayISO() {
  return new Date().toISOString().substring(0, 10)
}

// ==============================
// filterMyRecords — กรองรายการของตัวเอง
// ==============================
// ใช้เทียบ user_id (Number) ป้องกัน "1" !== 1

function filterMyRecords(records, userId) {
  return records.filter(r => Number(r.user_id) === Number(userId))
}

// ==============================
// getAvailableAssets — กรองครุภัณฑ์ที่พร้อมให้ยืม
// ==============================
// เงื่อนไข: มีจำนวนเหลือ และสถานะไม่ใช่ชำรุด/สูญหาย/จำหน่าย

function getAvailableAssets(assets) {
  return assets.filter(a =>
    a.active_borrows < (a.quantity || 1) &&
    a.status !== 'ชำรุด' && a.status !== 'สูญหาย' && a.status !== 'จำหน่าย'
  )
}

// ==============================
// handleApiError — จัดการ error จาก API
// ==============================
// ถ้า 401 → logout อัตโนมัติ
// ถ้า error อื่น → แสดงข้อความใน element ที่ระบุ

function handleApiError(err, msgId = 'message') {
  if (err.response?.status === 401) {
    localStorage.clear()
    window.location.href = 'login.html'
    return
  }
  const msg    = err.response?.data?.message || 'เกิดข้อผิดพลาด'
  const errors = err.response?.data?.errors  || []
  // แสดง error list ถ้ามี เช่น "• กรุณากรอกชื่อ"
  const detail = errors.length > 0
    ? '<br>' + errors.map(e => `• ${e}`).join('<br>')
    : ''
  showMessage(msgId, msg + detail)
}
