-- Usuń stary constraint który pozwalał tylko na jedną zmianę dziennie per pracownik
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_schedule_id_employee_id_date_key;

-- Dodaj nowy constraint który pozwala na wiele zmian dziennie (różne godziny)
ALTER TABLE shifts ADD CONSTRAINT shifts_schedule_id_employee_id_date_times_key 
  UNIQUE(schedule_id, employee_id, date, start_time, end_time);
