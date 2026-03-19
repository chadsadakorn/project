const BASE_URL = 'http://localhost:3001/api'

function initPage({ adminOnly = false } = {}) {
  const token = localStorage.getItem('token')
  const user  = JSON.parse(localStorage.getItem('user') || '{}')

  if (!token || (adminOnly && user.role !== 'admin')) {
    window.location.href = 'login.html'
    return null
  }

  axios.defaults.headers.common['Authorization'] = 'Bearer ' + token

  const navUsername = document.getElementById('navUsername')
  if (navUsername) navUsername.textContent = `${user.firstname} ${user.lastname} (${user.role})`

  if (user.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'))
  }

  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault()
    localStorage.clear()
    window.location.href = 'login.html'
  })

  return user
}

function showMessage(id, msg, type = 'danger') {
  const el = document.getElementById(id)
  if (el) el.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show">
      ${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

function statusBadge(status) {
  const map = {
    'ปกติ':    'badge-normal',
    'ยืม':     'badge-borrowed',
    'ชำรุด':   'badge-damaged',
    'สูญหาย':  'badge-lost',
    'จำหน่าย': 'badge-disposed',
  }
  return `<span class="badge ${map[status] || 'bg-secondary'}">${status}</span>`
}

function handleApiError(err, msgId = 'message') {
  if (err.response?.status === 401) {
    localStorage.clear()
    window.location.href = 'login.html'
    return
  }
  const msg    = err.response?.data?.message || 'เกิดข้อผิดพลาด'
  const errors = err.response?.data?.errors  || []
  const detail = errors.length > 0 ? '<br>' + errors.map(e => `• ${e}`).join('<br>') : ''
  showMessage(msgId, msg + detail)
}

// วันที่วันนี้ในรูปแบบ YYYY-MM-DD (ใช้กับ input[type=date] และเปรียบเทียบวันที่)
function todayISO() {
  return new Date().toISOString().substring(0, 10)
}

// กรองรายการของตัวเอง (Number() ป้องกัน "1" !== 1)
function filterMyRecords(records, userId) {
  return records.filter(r => Number(r.user_id) === Number(userId))
}

// กรองครุภัณฑ์ที่พร้อมให้ยืม
function getAvailableAssets(assets) {
  return assets.filter(a =>
    a.active_borrows < (a.quantity || 1) &&
    a.status !== 'ชำรุด' && a.status !== 'สูญหาย' && a.status !== 'จำหน่าย'
  )
}
