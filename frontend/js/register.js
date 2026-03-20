// register.js — เพิ่มผู้ใช้ใหม่ (admin เท่านั้น) 
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
