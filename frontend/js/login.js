// login.js — หน้าเข้าสู่ระบบ 
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
