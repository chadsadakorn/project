// assets.js — หน้าจัดการครุภัณฑ์

const user = initPage()  // ตรวจสอบ login

// Bootstrap Modal instances
const assetModal  = new bootstrap.Modal(document.getElementById('assetModal'))
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'))
const borrowModal = new bootstrap.Modal(document.getElementById('borrowModal'))
const returnModal = new bootstrap.Modal(document.getElementById('returnModal'))

let currentDeleteId = null  // เก็บ id ที่กำลังจะลบ
let allAssets       = []    // เก็บรายการครุภัณฑ์ทั้งหมด (ใช้ข้ามฟังก์ชัน)

// ==============================
// ตรวจสอบสิทธิ์การยืม-คืน
// ==============================

// ยืมได้ถ้า: ยังมีจำนวนเหลือ และสถานะไม่ใช่ชำรุด/สูญหาย/จำหน่าย
function canBorrow(a) {
  const unavailable = ['ชำรุด', 'สูญหาย', 'จำหน่าย']
  return parseInt(a.active_borrows) < (a.quantity || 1) && !unavailable.includes(a.status)
}

// คืนได้ถ้า: มีของถูกยืมอยู่ และเป็น admin หรือเป็นของตัวเอง
function canReturn(a) {
  if (parseInt(a.active_borrows) === 0) return false  // ไม่มีใครยืม → คืนไม่ได้
  if (user.role === 'admin') return true               // admin คืนได้ทุกรายการ
  // ตรวจว่า user_id ของเราอยู่ใน borrow_user_ids ไหม ("1,3,5".split(','))
  return (a.borrow_user_ids || '').split(',').includes(String(user.id))
}

// ==============================
// โหลดรายการครุภัณฑ์
// ==============================
async function loadAssets() {
  // ดึงค่าจาก filter
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
          // ถ้ามีรูปภาพ → แสดงรูป พร้อม fallback ถ้ารูปโหลดไม่ได้
          // onerror จะแทนที่เฉพาะ wrapper div ไม่ใช่ card ทั้งหมด
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
                  <!-- ปุ่มดูรายละเอียด (ทุกคน) -->
                  <button class="btn btn-xs btn-outline-primary flex-fill" onclick="openDetailModal(${a.id})">
                    <i class="bi bi-eye"></i>
                  </button>
                  <!-- ปุ่มยืม (แสดงเฉพาะถ้ายืมได้) -->
                  ${canBorrow(a) ? `<button class="btn btn-xs btn-primary flex-fill" onclick="openBorrowModal(${a.id})"><i class="bi bi-arrow-right-circle me-1"></i>ยืม</button>` : ''}
                  <!-- ปุ่มคืน (แสดงเฉพาะถ้าคืนได้) -->
                  ${canReturn(a) ? `<button class="btn btn-xs btn-success flex-fill" onclick="openReturnByAsset(${a.id})"><i class="bi bi-arrow-left-circle me-1"></i>คืน</button>` : ''}
                  <!-- ปุ่มแก้ไข/ลบ (เฉพาะ admin) -->
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

// ==============================
// จัดการรูปภาพ
// ==============================

// ล้าง image picker ทั้งหมด
function resetImagePicker() {
  document.getElementById('assetImageFile').value = ''
  document.getElementById('assetImage').value = ''
  document.getElementById('imagePreview').src = ''
  document.getElementById('imagePreviewWrapper').classList.add('d-none')
}

// แสดงตัวอย่างรูป
function showImagePreview(url) {
  document.getElementById('imagePreview').src = url
  document.getElementById('imagePreviewWrapper').classList.remove('d-none')
}

// ==============================
// Modal เพิ่ม/แก้ไขครุภัณฑ์
// ==============================

// เปิด modal เพิ่มครุภัณฑ์ใหม่
function openAddModal() {
  document.getElementById('modalTitle').innerHTML = '<i class="bi bi-plus-circle me-2"></i>เพิ่มครุภัณฑ์'
  document.getElementById('assetId').value        = ''  // ไม่มี id = mode เพิ่ม
  document.getElementById('assetForm').reset()
  resetImagePicker()
  document.getElementById('modalMessage').innerHTML = ''
  assetModal.show()
}

// เปิด modal แก้ไขครุภัณฑ์ — โหลดข้อมูลจาก allAssets (ไม่ต้อง API call เพิ่ม)
function openEditModal(id) {
  const a = allAssets.find(a => a.id === id)
  if (!a) return

  document.getElementById('modalTitle').innerHTML      = '<i class="bi bi-pencil me-2"></i>แก้ไขครุภัณฑ์'
  document.getElementById('assetId').value             = a.id
  document.getElementById('assetName').value           = a.asset_name
  document.getElementById('assetCategory').value       = a.category
  document.getElementById('assetPrice').value          = a.price || ''
  document.getElementById('assetQuantity').value       = a.quantity || 1
  document.getElementById('assetPurchaseDate').value   = a.purchase_date?.substring(0, 10) || ''
  document.getElementById('assetLocation').value       = a.location || ''
  document.getElementById('assetResponsible').value    = a.responsible_person || ''
  document.getElementById('assetStatus').value         = a.status
  document.getElementById('assetNotes').value          = a.notes || ''

  resetImagePicker()
  if (a.image_url) {
    document.getElementById('assetImage').value = a.image_url
    showImagePreview(a.image_url)
  }

  document.getElementById('modalMessage').innerHTML = ''
  assetModal.show()
}

// เปิด modal ดูรายละเอียดครุภัณฑ์
function openDetailModal(id) {
  const a = allAssets.find(a => a.id === id)
  if (!a) return

  // แสดงรูปภาพหรือ placeholder
  document.getElementById('detailImage').innerHTML = a.image_url
    ? `<img src="${a.image_url}" class="img-fluid rounded mb-3" style="max-height:220px;object-fit:cover;width:100%;">`
    : `<div class="asset-placeholder mb-3" style="height:140px;"><i class="bi bi-archive fs-1 text-muted"></i></div>`

  // ใส่ข้อมูลทุก field
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

// เปิด modal ยืนยันการลบ
function openDeleteModal(id, name) {
  currentDeleteId = id
  document.getElementById('deleteAssetName').textContent = name
  deleteModal.show()
}

// ==============================
// บันทึกครุภัณฑ์ (เพิ่ม/แก้ไข)
// ==============================
document.getElementById('saveAssetBtn').addEventListener('click', async () => {
  const name     = document.getElementById('assetName').value.trim()
  const category = document.getElementById('assetCategory').value.trim()

  // Validate ขั้นต้น
  if (!name || !category) {
    showMessage('modalMessage', !name ? 'กรุณากรอกชื่อครุภัณฑ์' : 'กรุณากรอกหมวดหมู่')
    return
  }

  const id   = document.getElementById('assetId').value  // ถ้ามี id = แก้ไข, ไม่มี = เพิ่ม
  const data = {
    asset_name:         name,
    category,
    price:              document.getElementById('assetPrice').value || 0,
    quantity:           parseInt(document.getElementById('assetQuantity').value) || 1,
    purchase_date:      document.getElementById('assetPurchaseDate').value || null,
    location:           document.getElementById('assetLocation').value.trim(),
    responsible_person: document.getElementById('assetResponsible').value.trim(),
    status:             document.getElementById('assetStatus').value,
    notes:              document.getElementById('assetNotes').value.trim(),
    image_url:          document.getElementById('assetImage').value.trim() || null,
  }

  try {
    // ถ้ามีไฟล์ใหม่ → upload ก่อนแล้วค่อยบันทึก
    const fileInput = document.getElementById('assetImageFile')
    if (fileInput.files[0]) {
      const formData = new FormData()
      formData.append('image', fileInput.files[0])
      const { data: uploaded } = await axios.post(`${BASE_URL}/upload`, formData)
      data.image_url = uploaded.url  // ใช้ URL ที่ได้จาก server
    }

    // PUT = แก้ไข, POST = เพิ่มใหม่
    id
      ? await axios.put(`${BASE_URL}/assets/${id}`, data)
      : await axios.post(`${BASE_URL}/assets`, data)

    assetModal.hide()
    showMessage('message', id ? 'แก้ไขครุภัณฑ์สำเร็จ' : 'เพิ่มครุภัณฑ์สำเร็จ', 'success')
    loadCategories()  // อัปเดต dropdown หมวดหมู่
    loadAssets()       // โหลดรายการใหม่
  } catch (err) {
    console.error('saveAsset error:', err)
    handleApiError(err, 'modalMessage')
  }
})

// ==============================
// ยืนยันการลบครุภัณฑ์
// ==============================
document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  try {
    await axios.delete(`${BASE_URL}/assets/${currentDeleteId}`)
    deleteModal.hide()
    showMessage('message', 'ลบครุภัณฑ์สำเร็จ', 'success')
    loadAssets()
  } catch (err) {
    deleteModal.hide()
    handleApiError(err)
  }
})

// ==============================
// Event Listeners — filter และ search
// ==============================
document.getElementById('addAssetBtn')?.addEventListener('click', openAddModal)
document.getElementById('categoryFilter').addEventListener('change', loadAssets)
document.getElementById('statusFilter').addEventListener('change', loadAssets)
document.getElementById('clearFilterBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value    = ''
  document.getElementById('categoryFilter').value = ''
  document.getElementById('statusFilter').value   = ''
  loadAssets()
})

// Debounce การค้นหา — รอ 400ms หลังพิมพ์หยุดแล้วค่อย query
let searchTimer
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadAssets, 400)
})

// ==============================
// โหลดหมวดหมู่ (สำหรับ dropdown และ datalist)
// ==============================
async function loadCategories() {
  const { data } = await axios.get(`${BASE_URL}/assets/categories`)
  // datalist สำหรับ input หมวดหมู่ใน form
  document.getElementById('categoryList').innerHTML = data.map(c => `<option value="${c}">`).join('')
  // select filter
  document.getElementById('categoryFilter').innerHTML =
    '<option value="">-- ทุกหมวดหมู่ --</option>'
    + data.map(c => `<option value="${c}">${c}</option>`).join('')
}

// ==============================
// คืนครุภัณฑ์โดยระบุจาก asset id
// ==============================
async function openReturnByAsset(assetId) {
  try {
    const { data } = await axios.get(`${BASE_URL}/borrowing`)

    // หารายการยืมที่ตรงกับ asset นี้และผู้ใช้มีสิทธิ์คืน
    // admin คืนได้ทุกรายการ | user คืนได้เฉพาะของตัวเอง
    const record = data.find(r =>
      r.asset_id === assetId &&
      r.status   === 'borrowed' &&
      (user.role === 'admin' || r.user_id === user.id)
    )

    if (!record) {
      showMessage('message', 'ไม่พบรายการยืมที่คุณสามารถคืนได้')
      return
    }

    // เตรียม form คืน
    document.getElementById('returnBorrowId').value      = record.id
    document.getElementById('actualReturnDate').value    = todayISO()
    document.getElementById('returnNotes').value         = ''
    document.getElementById('returnModalMessage').innerHTML = ''
    returnModal.show()
  } catch (err) {
    handleApiError(err)
  }
}

// ==============================
// บันทึกการคืน
// ==============================
document.getElementById('saveReturnBtn').addEventListener('click', async () => {
  const id                = document.getElementById('returnBorrowId').value
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

// ==============================
// เปิด modal ยืมครุภัณฑ์
// ==============================
async function openBorrowModal(assetId = null) {
  // ตั้งค่า default ของ form
  document.getElementById('borrowDate').value          = todayISO()
  document.getElementById('borrowerName').value        = ''
  document.getElementById('expectedReturnDate').value  = ''
  document.getElementById('borrowNotes').value         = ''
  document.getElementById('borrowModalMessage').innerHTML = ''

  // กรองเฉพาะครุภัณฑ์ที่ยังมีจำนวนเหลือให้ยืม
  const available = getAvailableAssets(allAssets)

  // แสดงจำนวนเหลือในแต่ละ option
  document.getElementById('borrowAssetId').innerHTML =
    '<option value="">-- เลือกครุภัณฑ์ --</option>'
    + available.map(a => {
        const remaining = (a.quantity || 1) - (a.active_borrows || 0)
        return `<option value="${a.id}" ${a.id === assetId ? 'selected' : ''}>${a.asset_code} — ${a.asset_name} (เหลือ ${remaining}/${a.quantity || 1})</option>`
      }).join('')

  borrowModal.show()
}

// ==============================
// บันทึกการยืม
// ==============================
document.getElementById('saveBorrowBtn').addEventListener('click', async () => {
  const asset_id            = document.getElementById('borrowAssetId').value
  const borrower_name       = document.getElementById('borrowerName').value.trim()
  const borrow_date         = document.getElementById('borrowDate').value
  const expected_return_date = document.getElementById('expectedReturnDate').value

  // ตรวจข้อมูลครบถ้วน
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

// ==============================
// Preview รูปภาพก่อน upload
// ==============================
document.getElementById('assetImageFile').addEventListener('change', async (e) => {
  const file = e.target.files[0]
  if (!file) return
  // ใช้ FileReader อ่านไฟล์เป็น base64 URL แล้วแสดง preview
  const reader = new FileReader()
  reader.onload = (ev) => showImagePreview(ev.target.result)
  reader.readAsDataURL(file)
})

// ลบรูปภาพที่เลือก
document.getElementById('removeImageBtn').addEventListener('click', () => {
  resetImagePicker()
})

// ==============================
// เริ่มต้น — โหลดข้อมูล
// ==============================
loadCategories()
loadAssets()
