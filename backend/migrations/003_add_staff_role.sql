ALTER TABLE signup
  ADD COLUMN role ENUM('student', 'staff') NOT NULL DEFAULT 'student' AFTER password;
