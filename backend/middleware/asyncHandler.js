// ครอบ async controller ให้จัดการ error อัตโนมัติ ไม่ต้องเขียน try/catch ทุกฟังก์ชัน
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error(error)
    res.status(error.statusCode || 500).json({
      message: error.message || 'เกิดข้อผิดพลาด',
      errors:  error.errors  || [],
    })
  })
}

module.exports = asyncHandler
