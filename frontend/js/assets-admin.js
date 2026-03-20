// ไฟล์นี้โหลดเฉพาะ admin — จัดการ เพิ่ม/แก้ไข/ลบ ครุภัณฑ์ + upload รูปภาพ

const assetModal  = new bootstrap.Modal(document.getElementById('assetModal'))
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'))

function resetImagePicker() {
  document.getElementById('assetImageFile').value = ''
  document.getElementById('assetImage').value = ''
  document.getElementById('imagePreview').src = ''
  document.getElementById('imagePreviewWrapper').classList.add('d-none')
}

function showImagePreview(url) {
  document.getElementById('imagePreview').src = url
  document.getElementById('imagePreviewWrapper').classList.remove('d-none')
}

function openAddModal() {
  document.getElementById('modalTitle').innerHTML   = '<i class="bi bi-plus-circle me-2"></i>เพิ่มครุภัณฑ์'
  document.getElementById('assetId').value          = ''
  document.getElementById('assetForm').reset()
  resetImagePicker()
  document.getElementById('modalMessage').innerHTML = ''
  assetModal.show()
}

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

function openDeleteModal(id, name) {
  currentDeleteId = id
  document.getElementById('deleteAssetName').textContent = name
  deleteModal.show()
}

document.getElementById('saveAssetBtn').addEventListener('click', async () => {
  const name     = document.getElementById('assetName').value.trim()
  const category = document.getElementById('assetCategory').value.trim()

  if (!name || !category) {
    showMessage('modalMessage', !name ? 'กรุณากรอกชื่อครุภัณฑ์' : 'กรุณากรอกหมวดหมู่')
    return
  }

  const id   = document.getElementById('assetId').value
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
    const fileInput = document.getElementById('assetImageFile')
    if (fileInput.files[0]) {
      const formData = new FormData()
      formData.append('image', fileInput.files[0])
      const { data: uploaded } = await axios.post(`${BASE_URL}/upload`, formData)
      data.image_url = uploaded.url
    }

    id
      ? await axios.put(`${BASE_URL}/assets/${id}`, data)
      : await axios.post(`${BASE_URL}/assets`, data)

    assetModal.hide()
    showMessage('message', id ? 'แก้ไขครุภัณฑ์สำเร็จ' : 'เพิ่มครุภัณฑ์สำเร็จ', 'success')
    loadCategories()
    loadAssets()
  } catch (err) {
    handleApiError(err, 'modalMessage')
  }
})

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

document.getElementById('addAssetBtn')?.addEventListener('click', openAddModal)

document.getElementById('assetImageFile').addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => showImagePreview(ev.target.result)
  reader.readAsDataURL(file)
})

document.getElementById('removeImageBtn').addEventListener('click', () => {
  resetImagePicker()
})
