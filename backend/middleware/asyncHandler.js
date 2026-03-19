// asyncHandler — ครอบ async controller เพื่อจัดการ error อัตโนมัติ
// แทนที่จะต้องเขียน try/catch ในทุกฟังก์ชัน
//
// การใช้งาน:
//   const myController = asyncHandler(async (req, res) => { ... })
//
// ถ้าเกิด error ใดๆ ใน fn → asyncHandler จะจับแล้วส่ง JSON error กลับ
//   { message, errors } พร้อม statusCode ที่กำหนด (default 500)

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
