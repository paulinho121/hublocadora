SELECT 
  d.id, 
  d.status, 
  d.subrental_status, 
  c.name AS fulfilling_company, 
  b.name AS origin_branch,
  bk.status AS booking_status
FROM deliveries d
LEFT JOIN companies c ON d.fulfilling_company_id = c.id
LEFT JOIN branches b ON d.origin_branch_id = b.id
LEFT JOIN bookings bk ON d.booking_id = bk.id;
