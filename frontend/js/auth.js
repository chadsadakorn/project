const isLoginPage    = document.getElementById('loginForm')    !== null
const isRegisterPage = document.getElementById('registerForm') !== null
const isSignupPage   = document.getElementById('signupForm')   !== null

// หน้า login
if (isLoginPage) {
  if (localStorage.getItem('token')) window.location.href = 'dashboard.html'

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const username = document.getElementById('username').value.trim()
    const password = document.getElementById('password').value

    if (!username || !password) {
      showMessage('message', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน')
      return
    }

    const btn = document.getElementById('submitBtn')
    btn.disabled  = true
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังเข้าสู่ระบบ...'

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/login`, { username, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      window.location.href = 'dashboard.html'
    } catch (err) {
      showMessage('message', err.response?.data?.message || 'เกิดข้อผิดพลาด')
      btn.disabled  = false
      btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>เข้าสู่ระบบ'
    }
  })
}

// หน้าสมัครสมาชิก (เปิดสาธารณะ)
if (isSignupPage) {
  if (localStorage.getItem('token')) window.location.href = 'dashboard.html'

  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const username        = document.getElementById('username').value.trim()
    const firstname       = document.getElementById('firstname').value.trim()
    const lastname        = document.getElementById('lastname').value.trim()
    const password        = document.getElementById('password').value
    const confirmPassword = document.getElementById('confirmPassword').value

    if (password !== confirmPassword) {
      showMessage('message', 'รหัสผ่านไม่ตรงกัน')
      return
    }

    const btn = document.getElementById('submitBtn')
    btn.disabled  = true
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังสมัคร...'

    try {
      await axios.post(`${BASE_URL}/auth/signup`, { username, password, firstname, lastname, role: 'user' })
      showMessage('message', 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ', 'success')
      setTimeout(() => window.location.href = 'login.html', 1500)
    } catch (err) {
      showMessage('message', err.response?.data?.message || 'เกิดข้อผิดพลาด')
      btn.disabled  = false
      btn.innerHTML = '<i class="bi bi-person-check me-2"></i>สมัครสมาชิก'
    }
  })
}

// หน้าเพิ่มผู้ใช้ (เฉพาะ admin)
if (isRegisterPage) {
  const token = localStorage.getItem('token')
  const user  = JSON.parse(localStorage.getItem('user') || '{}')

  if (!token || user.role !== 'admin') window.location.href = 'login.html'

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
      document.getElementById('registerForm').reset()
    } catch (err) {
      showMessage('message', err.response?.data?.message || 'เกิดข้อผิดพลาด')
    }
  })
}
