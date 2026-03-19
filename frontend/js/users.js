const user = initPage({ adminOnly: true })

const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'))
let currentDeleteId = null

async function loadUsers() {
  try {
    const { data } = await axios.get(`${BASE_URL}/auth/users`)
    const tbody    = document.getElementById('usersBody')

    tbody.innerHTML = data.length === 0
      ? `<tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>ไม่พบผู้ใช้</td></tr>`
      : data.map((u, i) => {
          const isSelf = u.id === user.id
          return `
            <tr>
              <td>${i + 1}</td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="avatar-circle bg-primary-soft text-primary">${u.firstname[0]}${u.lastname[0]}</div>
                  <code>${u.username}</code>
                  ${isSelf ? '<span class="badge bg-info ms-1">คุณ</span>' : ''}
                </div>
              </td>
              <td>${u.firstname} ${u.lastname}</td>
              <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-secondary'}">${u.role}</span></td>
              <td>${formatDate(u.created_at)}</td>
              <td>
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

function openDeleteModal(id, username) {
  currentDeleteId = id
  document.getElementById('deleteUsername').textContent = username
  deleteModal.show()
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  try {
    await axios.delete(`${BASE_URL}/auth/users/${currentDeleteId}`)
    deleteModal.hide()
    showMessage('message', 'ลบผู้ใช้สำเร็จ', 'success')
    loadUsers()
  } catch (err) {
    deleteModal.hide()
    handleApiError(err)
  }
})

loadUsers()
