// auth.js — จัดการการ login, สมัครสมาชิก, เพิ่มผู้ใช้ (admin)
// ไฟล์นี้ใช้ร่วมกัน 3 หน้า: login.html, signup.html, register.html
// ตรวจว่าอยู่หน้าไหนโดยดูว่ามี form ไหนอยู่ใน DOM

const isLoginPage    = document.getElementById('loginForm')    !== null
const isRegisterPage = document.getElementById('registerForm') !== null
const isSignupPage   = document.getElementById('signupForm')   !== null

// ==============================
// หน้าเข้าสู่ระบบ (login.html)
// ==============================
if (isLoginPage) {
  // ถ้า login อยู่แล้ว → ไปหน้า dashboard ทันที
  if (localStorage.getItem('token')) window.location.href = 'dashboard.html'

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()  // ป้องกัน form reload หน้า

    const username = document.getElementById('username').value.trim()
    const password = document.getElementById('password').value

    // ตรวจขั้นต้น
    if (!username || !password) {
      showMessage('message', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน')
      return
    }

    // แสดง loading บนปุ่ม
    const btn = document.getElementById('submitBtn')
    btn.disabled  = true
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังเข้าสู่ระบบ...'

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/login`, { username, password })

      // บันทึก token และข้อมูล user ใน localStorage
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      window.location.href = 'dashboard.html'
    } catch (err) {
      showMessage('message', err.response?.data?.message || 'เกิดข้อผิดพลาด')
      // คืนสถานะปุ่ม
      btn.disabled  = false
      btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>เข้าสู่ระบบ'
    }
  })
}

// ==============================
// หน้าสมัครสมาชิก (signup.html) — เปิดสาธารณะ
// ==============================
if (isSignupPage) {
  // ถ้า login อยู่แล้ว → ไปหน้า dashboard ทันที
  if (localStorage.getItem('token')) window.location.href = 'dashboard.html'

  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    const username        = document.getElementById('username').value.trim()
    const firstname       = document.getElementById('firstname').value.trim()
    const lastname        = document.getElementById('lastname').value.trim()
    const password        = document.getElementById('password').value
    const confirmPassword = document.getElementById('confirmPassword').value

    // ตรวจว่ารหัสผ่านตรงกัน
    if (password !== confirmPassword) {
      showMessage('message', 'รหัสผ่านไม่ตรงกัน')
      return
    }

    const btn = document.getElementById('submitBtn')
    btn.disabled  = true
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังสมัคร...'

    try {
      // สมัครเป็น user เสมอ (ไม่ให้เลือก role เอง)
      await axios.post(`${BASE_URL}/auth/signup`, { username, password, firstname, lastname, role: 'user' })
      showMessage('message', 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ', 'success')

      // รอ 1.5 วินาที แล้ว redirect ไปหน้า login
      setTimeout(() => window.location.href = 'login.html', 1500)
    } catch (err) {
      showMessage('message', err.response?.data?.message || 'เกิดข้อผิดพลาด')
      btn.disabled  = false
      btn.innerHTML = '<i class="bi bi-person-check me-2"></i>สมัครสมาชิก'
    }
  })
}

// ==============================
// หน้าเพิ่มผู้ใช้ (register.html) — เฉพาะ admin
// ==============================
if (isRegisterPage) {
  const token = localStorage.getItem('token')
  const user  = JSON.parse(localStorage.getItem('user') || '{}')

  // ตรวจสิทธิ์ — ต้อง login และต้องเป็น admin
  if (!token || user.role !== 'admin') { window.location.href = 'login.html' }

  // เตรียม axios และ navbar
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
  document.getElementById('navUsername').textContent = `${user.firstname} ${user.lastname} (${user.role})`
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault()
    localStorage.clear()
    window.location.href = 'login.html'
  })

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    const username        = document.getElementById('username').value.trim()
    const firstname       = document.getElementById('firstname').value.trim()
    const lastname        = document.getElementById('lastname').value.trim()
    const role            = document.getElementById('role').value
    const password        = document.getElementById('password').value
    const confirmPassword = document.getElementById('confirmPassword').value

    // Validate ฝั่ง frontend ก่อนส่ง
    const errors = []
    if (!username)                         errors.push('กรุณากรอกชื่อผู้ใช้')
    if (!firstname)                        errors.push('กรุณากรอกชื่อ')
    if (!lastname)                         errors.push('กรุณากรอกนามสกุล')
    if (!password || password.length < 6) errors.push('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    if (password !== confirmPassword)      errors.push('รหัสผ่านไม่ตรงกัน')
    if (errors.length > 0) {
      showMessage('message', errors.map(e => `• ${e}`).join('<br>'))
      return
    }

    try {
      await axios.post(`${BASE_URL}/auth/register`, { username, password, firstname, lastname, role })
      showMessage('message', `เพิ่มผู้ใช้ "${username}" สำเร็จ`, 'success')
      document.getElementById('registerForm').reset()  // ล้าง form
    } catch (err) {
      showMessage('message', err.response?.data?.message || 'เกิดข้อผิดพลาด')
    }
  })
}
