-- ================================================
-- ระบบจัดการครุภัณฑ์ — สร้างตารางฐานข้อมูล
-- ใช้ IF NOT EXISTS เพื่อไม่ให้ error ถ้าตารางมีอยู่แล้ว
-- ================================================

-- ตารางผู้ใช้งานระบบ
CREATE TABLE IF NOT EXISTS users (
  id        INT AUTO_INCREMENT PRIMARY KEY,       -- รหัสผู้ใช้ เพิ่มอัตโนมัติ
  username  VARCHAR(50)  NOT NULL UNIQUE,         -- ชื่อผู้ใช้ ห้ามซ้ำ
  password  VARCHAR(255) NOT NULL,               -- รหัสผ่าน (bcrypt hash)
  firstname VARCHAR(100) NOT NULL,               -- ชื่อ
  lastname  VARCHAR(100) NOT NULL,               -- นามสกุล
  role      ENUM('admin', 'user') NOT NULL DEFAULT 'user', -- บทบาท (default: user)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,          -- วันที่สร้างบัญชี
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- วันที่แก้ไขล่าสุด
);

-- ตารางครุภัณฑ์
CREATE TABLE IF NOT EXISTS assets (
  id                 INT AUTO_INCREMENT PRIMARY KEY,       -- รหัสครุภัณฑ์
  asset_code         VARCHAR(20)  NOT NULL UNIQUE,         -- รหัสครุภัณฑ์ เช่น KPD-2026-001
  asset_name         VARCHAR(255) NOT NULL,               -- ชื่อครุภัณฑ์
  category           VARCHAR(100),                        -- หมวดหมู่ เช่น คอมพิวเตอร์
  price              DECIMAL(10,2),                       -- ราคาต่อหน่วย (ทศนิยม 2 ตำแหน่ง)
  quantity           INT NOT NULL DEFAULT 1,              -- จำนวนชิ้น (default: 1)
  purchase_date      DATE,                                -- วันที่จัดซื้อ
  location           VARCHAR(255),                        -- สถานที่เก็บ
  responsible_person VARCHAR(255),                        -- ผู้รับผิดชอบ
  status             VARCHAR(20) NOT NULL DEFAULT 'ปกติ', -- สถานะ (ปกติ/ยืม/ชำรุด/สูญหาย/จำหน่าย)
  notes              TEXT,                                -- หมายเหตุ
  image_url          VARCHAR(500),                        -- URL รูปภาพ
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ตารางรายการยืม-คืน
CREATE TABLE IF NOT EXISTS borrowing (
  id                   INT AUTO_INCREMENT PRIMARY KEY,       -- รหัสรายการยืม
  asset_id             INT NOT NULL,                        -- FK → assets.id
  user_id              INT,                                 -- FK → users.id (NULL ได้ กรณีลบ user)
  borrower_name        VARCHAR(255) NOT NULL,               -- ชื่อผู้ยืม (เก็บสำรองไว้แม้ user ถูกลบ)
  borrow_date          DATE NOT NULL,                       -- วันที่ยืม
  expected_return_date DATE NOT NULL,                       -- กำหนดวันคืน
  actual_return_date   DATE,                               -- วันที่คืนจริง (NULL = ยังไม่คืน)
  notes                TEXT,                               -- หมายเหตุ เช่น สภาพที่คืน
  status               ENUM('borrowed', 'returned') NOT NULL DEFAULT 'borrowed', -- สถานะรายการ
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id),                        -- ลบ asset ไม่ได้ถ้ายังมี borrow อยู่
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE SET NULL        -- ลบ user → user_id กลายเป็น NULL
);
