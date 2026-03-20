// signup.js — หน้าสมัครสมาชิก 
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
