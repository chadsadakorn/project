// report.js — หน้ารายงานประจำปีงบประมาณ

const user = initPage()  // ตรวจสอบ login

let allAssets = []  // เก็บรายการครุภัณฑ์ที่กรองแล้ว (ใช้ข้ามฟังก์ชัน)

// ==============================
// สร้าง dropdown ปีงบประมาณ
// ==============================
function initYearSelect() {
  const sel      = document.getElementById('yearSelect')
  const thisYear = new Date().getFullYear()

  // แสดงตั้งแต่ปีนี้ย้อนหลังไปถึงปี 2015
  for (let y = thisYear; y >= 2015; y--) {
    const opt      = document.createElement('option')
    opt.value      = y
    opt.textContent = `พ.ศ. ${y + 543}`  // แปลงเป็น พ.ศ. (บวก 543)
    sel.appendChild(opt)
  }
}

// ==============================
// โหลดหมวดหมู่สำหรับ filter
// ==============================
async function loadCategories() {
  try {
    const { data } = await axios.get(`${BASE_URL}/assets/categories`)
    const sel = document.getElementById('categoryFilter')
    data.forEach(c => {
      const opt      = document.createElement('option')
      opt.value      = c
      opt.textContent = c
      sel.appendChild(opt)
    })
  } catch (err) { /* ไม่แสดง error ถ้าโหลดหมวดหมู่ไม่ได้ */ }
}

// ==============================
// โหลดและแสดงรายงาน
// ==============================
async function loadReport() {
  const year     = document.getElementById('yearSelect').value
  const category = document.getElementById('categoryFilter').value
  const status   = document.getElementById('statusFilter').value

  // อัปเดตหัวรายงานสำหรับพิมพ์
  const yearBE = parseInt(year) + 543
  document.getElementById('printTitle').textContent    = `รายงานประจำปีงบประมาณ พ.ศ. ${yearBE}`
  document.getElementById('printSubtitle').textContent = category ? `หมวดหมู่: ${category}` : ''
  document.getElementById('printDate').textContent     = `วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`
  document.getElementById('printUser').textContent     = `${user.firstname} ${user.lastname}`

  try {
    // ดึงข้อมูลครุภัณฑ์ พร้อมกรองหมวดหมู่และสถานะ
    const params = {}
    if (category) params.category = category
    if (status)   params.status   = status

    const { data } = await axios.get(`${BASE_URL}/assets`, { params })

    // กรองตามปีที่จัดซื้อ (ถ้าไม่มี purchase_date → ไม่แสดงในปีนั้น)
    allAssets = data.filter(a =>
      !year || (a.purchase_date && new Date(a.purchase_date).getFullYear() === parseInt(year))
    )

    // ==============================
    // คำนวณสถิติ (นับตาม quantity ไม่ใช่จำนวน record)
    // ==============================
    const sumQty = (arr) => arr.reduce((s, a) => s + (a.quantity || 1), 0)

    document.getElementById('statTotal').textContent   = sumQty(allAssets)
    document.getElementById('statNormal').textContent  = sumQty(allAssets.filter(a => a.status === 'ปกติ'))
    document.getElementById('statDamaged').textContent = sumQty(allAssets.filter(a => a.status === 'ชำรุด'))
    document.getElementById('statLost').textContent    = sumQty(allAssets.filter(a => a.status === 'สูญหาย' || a.status === 'จำหน่าย'))
    document.getElementById('recordCount').textContent = `${allAssets.length} รายการ`

    // คำนวณมูลค่ารวมทั้งหมด = Σ (ราคา × จำนวน)
    const totalPrice = allAssets.reduce((sum, a) => sum + ((parseFloat(a.price) || 0) * (a.quantity || 1)), 0)
    const totalPriceStr = totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })
    document.getElementById('statTotalPrice').textContent  = totalPriceStr
    document.getElementById('printTotalPrice').textContent = totalPriceStr

    // ==============================
    // แสดงตาราง
    // ==============================
    document.getElementById('reportBody').innerHTML = allAssets.length === 0
      ? `<tr><td colspan="11" class="text-center text-muted py-4"><i class="bi bi-inbox fs-3 d-block mb-2"></i>ไม่พบรายการ</td></tr>`
      : allAssets.map((a, i) => `
          <tr>
            <td class="text-center text-muted">${i + 1}</td>
            <td><code>${a.asset_code}</code></td>
            <td class="fw-medium">${a.asset_name}</td>
            <td>${a.category || '-'}</td>
            <td class="text-center">${a.quantity || 1}</td>
            <!-- ราคาต่อหน่วย -->
            <td class="text-center">${a.price ? Number(a.price).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}</td>
            <!-- ราคารวม = ราคา × จำนวน -->
            <td class="text-center">${a.price ? (Number(a.price) * (a.quantity || 1)).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}</td>
            <td>${formatDate(a.purchase_date)}</td>
            <td>${a.location || '-'}</td>
            <td>${a.responsible_person || '-'}</td>
            <td class="text-center">${statusBadge(a.status)}</td>
          </tr>`).join('')

  } catch (err) {
    handleApiError(err)
  }
}

// ล้าง filter แล้วโหลดใหม่
function clearFilter() {
  document.getElementById('categoryFilter').value = ''
  document.getElementById('statusFilter').value   = ''
  loadReport()
}

// ==============================
// เริ่มต้น — โหลดข้อมูล
// ==============================
initYearSelect()
loadCategories()
loadReport()
