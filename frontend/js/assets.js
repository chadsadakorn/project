// assets.js — หน้าครุภัณฑ์ (ทุก role) | ดู/ยืม/คืน | admin เพิ่ม/แก้ไข/ลบผ่าน assets-admin.js
const user = initPage()

const borrowModal = new bootstrap.Modal(document.getElementById('borrowModal'))
const returnModal = new bootstrap.Modal(document.getElementById('returnModal'))

let currentDeleteId = null
let allAssets       = []

// ตรวจว่ายืมได้ไหม — มีของเหลือ และสถานะไม่ใช่ชำรุด/สูญหาย/จำหน่าย
function canBorrow(a) {
  const unavailable = ['ชำรุด', 'สูญหาย', 'จำหน่าย']
  return parseInt(a.active_borrows) < (a.quantity || 1) && !unavailable.includes(a.status)
}

// ตรวจว่าคืนได้ไหม — admin คืนได้ทุกรายการ / user คืนได้เฉพาะของตัวเอง
function canReturn(a) {
  if (parseInt(a.active_borrows) === 0) return false
  if (user.role === 'admin') return true
  return (a.borrow_user_ids || '').split(',').includes(String(user.id))
}

// โหลดและแสดงการ์ดครุภัณฑ์ทั้งหมด พร้อม filter
async function loadAssets() {
  const params = {
    search:   document.getElementById('searchInput').value.trim() || undefined,
    category: document.getElementById('categoryFilter').value || undefined,
    status:   document.getElementById('statusFilter').value   || undefined,
  }
  try {
    const { data } = await axios.get(`${BASE_URL}/assets`, { params })
    allAssets = data

    document.getElementById('assetsBody').innerHTML = data.length === 0
      ? `<div class="col-12 text-center text-muted py-5"><i class="bi bi-inbox fs-1 d-block mb-2"></i>ไม่พบรายการ</div>`
      : data.map(a => {
          const img = a.image_url
            ? `<div class="asset-img-wrapper"><img src="${a.image_url}" class="card-img-top" style="height:180px;object-fit:cover;"
                onerror="this.parentElement.innerHTML='<div class=\\'asset-placeholder\\'><i class=\\'bi bi-archive fs-1 text-muted\\'></i></div>'"></div>`
            : `<div class="asset-placeholder"><i class="bi bi-archive fs-1 text-muted"></i></div>`

          return `
            <div class="col-6 col-md-4 col-lg-3">
              <div class="card h-100 shadow-sm border-0">
                ${img}
                <div class="card-body pb-2">
                  <h6 class="card-title fw-bold mb-1">${a.asset_name}</h6>
                  <p class="text-muted small mb-1"><code>${a.asset_code}</code> · ${a.category}</p>
                  <p class="text-muted small mb-2">${a.location || ''}</p>
                  <div class="mb-2">${statusBadge(a.status)}</div>
                </div>
                <div class="card-footer bg-transparent border-0 pt-0 d-flex gap-1 flex-wrap">
                  <button class="btn btn-xs btn-outline-primary flex-fill" onclick="openDetailModal(${a.id})">
                    <i class="bi bi-eye"></i>
                  </button>
                  ${canBorrow(a) ? `<button class="btn btn-xs btn-primary flex-fill" onclick="openBorrowModal(${a.id})"><i class="bi bi-arrow-right-circle me-1"></i>ยืม</button>` : ''}
                  ${canReturn(a) ? `<button class="btn btn-xs btn-success flex-fill" onclick="openReturnByAsset(${a.id})"><i class="bi bi-arrow-left-circle me-1"></i>คืน</button>` : ''}
                  ${user.role === 'admin' ? `
                    <button class="btn btn-xs btn-outline-secondary" onclick="openEditModal(${a.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-xs btn-outline-danger" onclick="openDeleteModal(${a.id}, '${a.asset_name.replace(/'/g, "\\'")}')"><i class="bi bi-trash"></i></button>
                  ` : ''}
                </div>
              </div>
            </div>`
        }).join('')
  } catch (err) {
    handleApiError(err)
  }
}

// เปิด popup รายละเอียดครุภัณฑ์
function openDetailModal(id) {
  const a = allAssets.find(a => a.id === id)
  if (!a) return

  document.getElementById('detailImage').innerHTML = a.image_url
    ? `<img src="${a.image_url}" class="img-fluid rounded mb-3" style="max-height:220px;object-fit:cover;width:100%;">`
    : `<div class="asset-placeholder mb-3" style="height:140px;"><i class="bi bi-archive fs-1 text-muted"></i></div>`

  document.getElementById('detailAssetCode').textContent    = a.asset_code
  document.getElementById('detailAssetName').textContent    = a.asset_name
  document.getElementById('detailCategory').textContent     = a.category
  document.getElementById('detailStatus').innerHTML         = statusBadge(a.status)
  document.getElementById('detailPrice').textContent        = a.price ? Number(a.price).toLocaleString('th-TH') + ' บาท' : '-'
  document.getElementById('detailQuantity').textContent     = a.quantity || 1
  document.getElementById('detailPurchaseDate').textContent = formatDate(a.purchase_date)
  document.getElementById('detailLocation').textContent     = a.location || '-'
  document.getElementById('detailResponsible').textContent  = a.responsible_person || '-'
  document.getElementById('detailNotes').textContent        = a.notes || '-'
  document.getElementById('detailCreatedAt').textContent    = formatDate(a.created_at)

  new bootstrap.Modal(document.getElementById('detailModal')).show()
}

// หา record ที่ยืมอยู่ของครุภัณฑ์นี้ → เปิด popup คืน
async function openReturnByAsset(assetId) {
  try {
    const { data } = await axios.get(`${BASE_URL}/borrowing`)
    const record = data.find(r =>
      r.asset_id === assetId &&
      r.status   === 'borrowed' &&
      (user.role === 'admin' || r.user_id === user.id)
    )

    if (!record) {
      showMessage('message', 'ไม่พบรายการยืมที่คุณสามารถคืนได้')
      return
    }

    document.getElementById('returnBorrowId').value         = record.id
    document.getElementById('actualReturnDate').value       = todayISO()
    document.getElementById('returnNotes').value            = ''
    document.getElementById('returnModalMessage').innerHTML = ''
    returnModal.show()
  } catch (err) {
    handleApiError(err)
  }
}

// เปิด popup ยืม พร้อมโหลดรายการครุภัณฑ์ที่ยืมได้
async function openBorrowModal(assetId = null) {
  document.getElementById('borrowDate').value             = todayISO()
  document.getElementById('borrowerName').value           = ''
  document.getElementById('expectedReturnDate').value     = ''
  document.getElementById('borrowNotes').value            = ''
  document.getElementById('borrowModalMessage').innerHTML = ''

  const available = getAvailableAssets(allAssets)
  document.getElementById('borrowAssetId').innerHTML =
    '<option value="">-- เลือกครุภัณฑ์ --</option>'
    + available.map(a => {
        const remaining = (a.quantity || 1) - (a.active_borrows || 0)
        return `<option value="${a.id}" ${a.id === assetId ? 'selected' : ''}>${a.asset_code} — ${a.asset_name} (เหลือ ${remaining}/${a.quantity || 1})</option>`
      }).join('')

  borrowModal.show()
}

// บันทึกการยืม → POST /api/borrowing
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
    loadAssets()
  } catch (err) {
    handleApiError(err, 'borrowModalMessage')
  }
})

// บันทึกการคืน → PUT /api/borrowing/:id/return
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
    loadAssets()
  } catch (err) {
    handleApiError(err, 'returnModalMessage')
  }
})

document.getElementById('categoryFilter').addEventListener('change', loadAssets)
document.getElementById('statusFilter').addEventListener('change', loadAssets)
document.getElementById('clearFilterBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value    = ''
  document.getElementById('categoryFilter').value = ''
  document.getElementById('statusFilter').value   = ''
  loadAssets()
})

// ค้นหาแบบ delay 400ms เพื่อไม่ให้ยิง API ทุกการกดคีย์
let searchTimer
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadAssets, 400)
})

// โหลดหมวดหมู่ใส่ dropdown filter
async function loadCategories() {
  const { data } = await axios.get(`${BASE_URL}/assets/categories`)
  document.getElementById('categoryList').innerHTML = data.map(c => `<option value="${c}">`).join('')
  document.getElementById('categoryFilter').innerHTML =
    '<option value="">-- ทุกหมวดหมู่ --</option>'
    + data.map(c => `<option value="${c}">${c}</option>`).join('')
}

loadCategories()
loadAssets()
