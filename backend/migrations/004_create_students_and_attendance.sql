CREATE TABLE IF NOT EXISTS students (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admission_number VARCHAR(40) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  trade ENUM('BDC', 'CSA', 'FBO', 'FD', 'Software') NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_admission_number (admission_number),
  KEY idx_students_name (full_name),
  CONSTRAINT fk_students_created_by
    FOREIGN KEY (created_by) REFERENCES signup (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_attendance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('present', 'absent', 'late') NOT NULL,
  recorded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_attendance_date (student_id, attendance_date),
  KEY idx_student_attendance_date_status (attendance_date, status),
  CONSTRAINT fk_student_attendance_student
    FOREIGN KEY (student_id) REFERENCES students (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_student_attendance_recorder
    FOREIGN KEY (recorded_by) REFERENCES signup (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
