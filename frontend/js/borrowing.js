const user = initPage()

const borrowModal = new bootstrap.Modal(document.getElementById('borrowModal'))
const returnModal = new bootstrap.Modal(document.getElementById('returnModal'))
let currentTab = 'all'

async function loadBorrowing() {
  const search = document.getElementById('searchInput').value.trim()
  try {
    const url = currentTab === 'pending'
      ? `${BASE_URL}/borrowing/pending`
      : `${BASE_URL}/borrowing`

    const { data } = await axios.get(url, { params: search ? { search } : {} })
    const records  = user.role === 'admin' ? data : filterMyRecords(data, user.id)
    renderTable(records)

    // badge — ใช้ข้อมูลที่ดึงมาแล้ว ไม่ต้อง API call ซ้ำ
    const pendingData = currentTab === 'pending' ? data : data.filter(r => r.status === 'borrowed')
    const myPending   = user.role === 'admin' ? pendingData : filterMyRecords(pendingData, user.id)
    const badge = document.getElementById('pendingBadge')
    badge.textContent = myPending.length
    badge.style.display = myPending.length > 0 ? 'inline' : 'none'

  } catch (err) {
    handleApiError(err)
  }
}

function renderTable(records) {
  const tbody = document.getElementById('borrowingBody')
  tbody.innerHTML = records.length === 0
    ? `<tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>ไม่พบรายการ</td></tr>`
    : records.map(r => {
        const overdue   = r.status === 'borrowed' && new Date(r.expected_return_date) < new Date()
        const badge     = r.status === 'borrowed'
          ? `<span class="badge badge-borrowed">ยืม${overdue ? ' (เกินกำหนด)' : ''}</span>`
          : `<span class="badge badge-normal">คืนแล้ว</span>`
        // admin หรือเจ้าของเท่านั้นที่คืนได้
        const canReturn = r.status === 'borrowed' &&
          (user.role === 'admin' || Number(r.user_id) === Number(user.id))

        return `
          <tr class="${overdue ? 'table-warning' : ''}">
            <td><code>${r.asset_code}</code></td>
            <td>${r.asset_name}</td>
            <td>${r.borrower_name}</td>
            <td>${formatDate(r.borrow_date)}</td>
            <td class="${overdue ? 'text-danger fw-medium' : ''}">${formatDate(r.expected_return_date)}</td>
            <td>${formatDate(r.actual_return_date)}</td>
            <td>${badge}</td>
            <td>
              ${canReturn
                ? `<button class="btn btn-sm btn-outline-success" onclick="openReturnModal(${r.id})">
                    <i class="bi bi-arrow-left-circle me-1"></i>คืน
                   </button>`
                : '<span class="text-muted small">-</span>'}
            </td>
          </tr>`
      }).join('')
}

async function openBorrowModal() {
  document.getElementById('borrowDate').value             = todayISO()
  document.getElementById('borrowerName').value           = ''
  document.getElementById('expectedReturnDate').value     = ''
  document.getElementById('borrowNotes').value            = ''
  document.getElementById('borrowModalMessage').innerHTML = ''

  const { data } = await axios.get(`${BASE_URL}/assets`)
  const available = getAvailableAssets(data)

  document.getElementById('borrowAssetId').innerHTML =
    '<option value="">-- เลือกครุภัณฑ์ --</option>'
    + available.map(a => {
        const remaining = (a.quantity || 1) - (a.active_borrows || 0)
        return `<option value="${a.id}">${a.asset_code} — ${a.asset_name} (เหลือ ${remaining}/${a.quantity || 1})</option>`
      }).join('')

  borrowModal.show()
}

function openReturnModal(id) {
  document.getElementById('returnBorrowId').value         = id
  document.getElementById('actualReturnDate').value       = todayISO()
  document.getElementById('returnNotes').value            = ''
  document.getElementById('returnModalMessage').innerHTML = ''
  returnModal.show()
}

document.getElementById('saveBorrowBtn').addEventListener('click', async () => {
  const asset_id             = document.getElementById('borrowAssetId').value
  const borrower_name        = document.getElementById('borrowerName').value.trim()
  const borrow_date          = document.getElementById('borrowDate').value
  const expected_return_date = document.getElementById('expectedReturnDate').value

  if (!asset_id || !borrower_name || !borrow_date || !expected_return_date) {
    showMessage('borrowModalMessage', 'กรุณากรอกข้อมูลให้ครบถ้วน')
    return
  }

  try {
    await axios.post(`${BASE_URL}/borrowing`, {
      asset_id, borrower_name, borrow_date, expected_return_date,
      notes: document.getElementById('borrowNotes').value.trim()
    })
    borrowModal.hide()
    showMessage('message', 'บันทึกการยืมสำเร็จ', 'success')
    loadBorrowing()
  } catch (err) {
    handleApiError(err, 'borrowModalMessage')
  }
})

document.getElementById('saveReturnBtn').addEventListener('click', async () => {
  const id               = document.getElementById('returnBorrowId').value
  const actual_return_date = document.getElementById('actualReturnDate').value

  if (!actual_return_date) {
    showMessage('returnModalMessage', 'กรุณาระบุวันที่คืน')
    return
  }

  try {
    await axios.put(`${BASE_URL}/borrowing/${id}/return`, {
      actual_return_date,
      notes: document.getElementById('returnNotes').value.trim()
    })
    returnModal.hide()
    showMessage('message', 'บันทึกการคืนสำเร็จ', 'success')
    loadBorrowing()
  } catch (err) {
    handleApiError(err, 'returnModalMessage')
  }
})

document.getElementById('tabAll').addEventListener('click', () => {
  currentTab = 'all'
  document.getElementById('tabAll').classList.add('active')
  document.getElementById('tabPending').classList.remove('active')
  loadBorrowing()
})

document.getElementById('tabPending').addEventListener('click', () => {
  currentTab = 'pending'
  document.getElementById('tabPending').classList.add('active')
  document.getElementById('tabAll').classList.remove('active')
  loadBorrowing()
})

document.getElementById('addBorrowBtn')?.addEventListener('click', openBorrowModal)

let searchTimer
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadBorrowing, 400)
})

loadBorrowing()
