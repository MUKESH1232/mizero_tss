ALTER TABLE student_attendance
  MODIFY COLUMN status ENUM('unmarked', 'present', 'absent', 'late')
  NOT NULL DEFAULT 'unmarked';
