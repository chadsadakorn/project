// users.js — หน้าจัดการผู้ใช้งาน (เฉพาะ admin)

// initPage({ adminOnly: true }) → ถ้าไม่ใช่ admin จะ redirect ไปหน้า login ทันที
const user = initPage({ adminOnly: true })

// สร้าง Bootstrap modal instance สำหรับยืนยันการลบ
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'))

// เก็บ id ที่กำลังจะลบ (ใช้ตอนกดยืนยัน)
let currentDeleteId = null

// ==============================
// โหลดรายชื่อผู้ใช้ทั้งหมด
// ==============================
async function loadUsers() {
  try {
    const { data } = await axios.get(`${BASE_URL}/auth/users`)
    const tbody    = document.getElementById('usersBody')

    tbody.innerHTML = data.length === 0
      ? `<tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>ไม่พบผู้ใช้</td></tr>`
      : data.map((u, i) => {
          // ตรวจว่าเป็น user ที่ login อยู่ไหม (ถ้าใช่ → ปุ่มลบ disabled)
          const isSelf = u.id === user.id

          return `
            <tr>
              <td>${i + 1}</td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <!-- แสดงอักษรย่อชื่อ-นามสกุล -->
                  <div class="avatar-circle bg-primary-soft text-primary">${u.firstname[0]}${u.lastname[0]}</div>
                  <code>${u.username}</code>
                  <!-- badge "คุณ" สำหรับ user ที่กำลัง login อยู่ -->
                  ${isSelf ? '<span class="badge bg-info ms-1">คุณ</span>' : ''}
                </div>
              </td>
              <td>${u.firstname} ${u.lastname}</td>
              <!-- badge สีแดง = admin, สีเทา = user -->
              <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-secondary'}">${u.role}</span></td>
              <td>${formatDate(u.created_at)}</td>
              <td>
                <!-- ปุ่มลบ: disabled ถ้าเป็นตัวเอง (ป้องกันลบตัวเอง) -->
                <button class="btn btn-sm btn-outline-danger"
                  ${isSelf ? 'disabled' : `onclick="openDeleteModal(${u.id}, '${u.username}')"`}>
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>`
        }).join('')
  } catch (err) {
    handleApiError(err)
  }
}

// ==============================
// เปิด Modal ยืนยันการลบ
// ==============================
function openDeleteModal(id, username) {
  currentDeleteId = id
  document.getElementById('deleteUsername').textContent = username
  deleteModal.show()
}

// ==============================
// ยืนยันการลบผู้ใช้
// ==============================
document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  try {
    await axios.delete(`${BASE_URL}/auth/users/${currentDeleteId}`)
    deleteModal.hide()
    showMessage('message', 'ลบผู้ใช้สำเร็จ', 'success')
    loadUsers()  // โหลดรายการใหม่
  } catch (err) {
    deleteModal.hide()
    handleApiError(err)
  }
})

// โหลดรายชื่อเมื่อเปิดหน้า
loadUsers()
