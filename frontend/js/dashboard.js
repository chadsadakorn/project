const user = initPage()

window.onload = async () => {
  if (user.role === 'admin') {
    document.getElementById('adminDashboard').classList.remove('d-none')
    loadAdminDashboard()
  } else {
    document.getElementById('userDashboard').classList.remove('d-none')
    loadUserDashboard()
  }
}

async function loadAdminDashboard() {
  try {
    // ดึงสรุปสถิติและรายการยืมพร้อมกัน
    const [{ data }, { data: pendingList }] = await Promise.all([
      axios.get(`${BASE_URL}/assets/stats/summary`),
      axios.get(`${BASE_URL}/borrowing/pending`),
    ])
    const { total, normalCount, pendingBorrowCount, overdueCount, byCategory, byStatus, recentAssets } = data

    document.getElementById('totalAssets').textContent   = total
    document.getElementById('normalCount').textContent   = normalCount
    document.getElementById('borrowedCount').textContent = pendingBorrowCount
    document.getElementById('pendingCount').textContent  = overdueCount

    document.getElementById('categoryList').innerHTML = byCategory.length === 0
      ? '<p class="text-muted text-center">ยังไม่มีข้อมูล</p>'
      : byCategory.map(c => `
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span><i class="bi bi-tag me-2 text-muted"></i>${c.category}</span>
            <span class="badge bg-primary rounded-pill">${c.count}</span>
          </div>
          <div class="progress mb-3" style="height:6px">
            <div class="progress-bar" style="width:${Math.round((c.count / total) * 100)}%"></div>
          </div>`).join('')

    document.getElementById('statusList').innerHTML = byStatus.length === 0
      ? '<p class="text-muted text-center">ยังไม่มีข้อมูล</p>'
      : byStatus.map(s => `
          <div class="d-flex justify-content-between align-items-center mb-2">
            ${statusBadge(s.status)}
            <span class="fw-medium">${s.count} รายการ</span>
          </div>`).join('')

    const today = todayISO()
    document.getElementById('currentBorrowingBody').innerHTML = pendingList.length === 0
      ? `<tr><td colspan="6" class="text-center text-muted py-3">ไม่มีรายการยืมขณะนี้</td></tr>`
      : pendingList.map(r => {
          const overdue = r.expected_return_date < today
          return `
            <tr class="${overdue ? 'table-warning' : ''}">
              <td><code class="text-primary">${r.asset_code}</code></td>
              <td>${r.asset_name}</td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="avatar-circle bg-primary-soft text-primary" style="width:28px;height:28px;font-size:11px;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                    ${r.firstname ? r.firstname[0] + (r.lastname ? r.lastname[0] : '') : '?'}
                  </div>
                  <span>${r.borrower_name}</span>
                </div>
              </td>
              <td>${formatDate(r.borrow_date)}</td>
              <td class="${overdue ? 'text-danger fw-medium' : ''}">${formatDate(r.expected_return_date)}${overdue ? ' <span class="badge bg-danger ms-1">เกินกำหนด</span>' : ''}</td>
              <td><span class="badge badge-borrowed">ยืม</span></td>
            </tr>`
        }).join('')

    document.getElementById('recentAssetsBody').innerHTML = recentAssets.length === 0
      ? '<tr><td colspan="5" class="text-center text-muted py-3">ยังไม่มีข้อมูล</td></tr>'
      : recentAssets.map(a => `
          <tr>
            <td><code>${a.asset_code}</code></td>
            <td>${a.asset_name}</td>
            <td>${a.category}</td>
            <td>${statusBadge(a.status)}</td>
            <td>${formatDate(a.created_at)}</td>
          </tr>`).join('')

  } catch (err) {
    handleApiError(err)
  }
}

async function loadUserDashboard() {
  try {
    const { data }    = await axios.get(`${BASE_URL}/borrowing`)
    const myRecords   = filterMyRecords(data, user.id)
    const today       = todayISO()
    const borrowing   = myRecords.filter(r => r.status === 'borrowed')
    const overdue     = borrowing.filter(r => r.expected_return_date < today)
    const returned    = myRecords.filter(r => r.status === 'returned')

    document.getElementById('myBorrowing').textContent = borrowing.length
    document.getElementById('myOverdue').textContent   = overdue.length
    document.getElementById('myReturned').textContent  = returned.length

    document.getElementById('myBorrowingBody').innerHTML = myRecords.slice(0, 10).length === 0
      ? '<tr><td colspan="5" class="text-center text-muted py-3">ยังไม่มีรายการยืม</td></tr>'
      : myRecords.slice(0, 10).map(r => {
          const isOverdue = r.status === 'borrowed' && r.expected_return_date < today
          const badge = r.status === 'returned'
            ? `<span class="badge badge-normal">คืนแล้ว</span>`
            : `<span class="badge badge-borrowed">ยืม${isOverdue ? ' <span class="badge bg-danger ms-1">เกินกำหนด</span>' : ''}</span>`
          return `
            <tr class="${isOverdue ? 'table-warning' : ''}">
              <td><code>${r.asset_code}</code></td>
              <td>${r.asset_name}</td>
              <td>${formatDate(r.borrow_date)}</td>
              <td class="${isOverdue ? 'text-danger fw-medium' : ''}">${formatDate(r.expected_return_date)}</td>
              <td>${badge}</td>
            </tr>`
        }).join('')

  } catch (err) {
    handleApiError(err)
  }
}
