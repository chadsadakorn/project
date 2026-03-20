// โหลดสถิติและตารางรายการยืมของ user 
async function loadUserDashboard() {
  try {
    const { data }  = await axios.get(`${BASE_URL}/borrowing`)
    const myRecords = filterMyRecords(data, user.id)
    const today     = todayISO()
    const borrowing = myRecords.filter(r => r.status === 'borrowed')
    const overdue   = borrowing.filter(r => r.expected_return_date < today)
    const returned  = myRecords.filter(r => r.status === 'returned')

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
