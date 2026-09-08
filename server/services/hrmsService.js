import { getDb } from '../database/db.js';
import { hashPassword } from './authService.js';

// 1. Employee Directory & Onboarding
export function getNextEmployeeCode() {
  const db = getDb();
  const lastEmp = db.prepare(`SELECT id, employee_code FROM employees ORDER BY id DESC LIMIT 1`).get();
  const nextNum = (lastEmp ? lastEmp.id : 0) + 1;
  return `EMP-${1000 + nextNum}`;
}

export function getEmployees(shopId) {
  const db = getDb();
  let query = `
    SELECT e.*, s.name as shop_name,
           u.id as user_id, u.username as login_username, u.role_id as login_role_id,
           u.is_active as login_is_active, u.custom_permissions_json as login_custom_permissions,
           u.last_login_at,
           r.name as login_role_name, r.role_key as login_role_key, r.permissions_json as role_permissions_json,
           (SELECT COUNT(*) FROM employee_documents ed WHERE ed.employee_id = e.id) as documents_count
    FROM employees e
    JOIN shops s ON e.shop_id = s.id
    LEFT JOIN users u ON u.employee_id = e.id
    LEFT JOIN roles r ON u.role_id = r.id
  `;
  const params = [];

  if (shopId) {
    query += ` WHERE e.shop_id = ?`;
    params.push(shopId);
  }

  query += ` ORDER BY e.id ASC`;
  const rows = db.prepare(query).all(...params);

  return rows.map(emp => {
    let customPerms = null;
    try {
      if (emp.login_custom_permissions && emp.login_custom_permissions.trim()) {
        customPerms = JSON.parse(emp.login_custom_permissions);
      }
    } catch(e) {
      customPerms = null;
    }

    let rolePerms = [];
    try {
      if (emp.role_permissions_json && emp.role_permissions_json.trim()) {
        rolePerms = JSON.parse(emp.role_permissions_json);
      }
    } catch(e) {
      rolePerms = [];
    }

    const effectivePerms = customPerms && customPerms.length > 0 ? customPerms : rolePerms;

    return {
      ...emp,
      username: emp.login_username || null,
      role_id: emp.login_role_id || null,
      role_name: emp.login_role_name || null,
      has_login: Boolean(emp.login_username),
      login_is_active: emp.login_is_active !== null && emp.login_is_active !== undefined ? emp.login_is_active : null,
      custom_permissions: customPerms,
      effective_permissions: effectivePerms
    };
  });
}

export function getEmployeeDocuments(employeeId) {
  const db = getDb();
  return db.prepare(`
    SELECT id, employee_id, doc_type, doc_name, file_name, file_type, file_size, file_data, uploaded_at
    FROM employee_documents
    WHERE employee_id = ?
    ORDER BY id ASC
  `).all(employeeId);
}

export function saveEmployeeDocument(employeeId, doc) {
  const db = getDb();
  if (doc.file_size && doc.file_size > 524288) { // 512 KB
    throw new Error('File size exceeds 500 KB limit. Please choose a smaller file.');
  }

  const stmt = db.prepare(`
    INSERT INTO employee_documents (employee_id, doc_type, doc_name, file_name, file_type, file_size, file_data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(employee_id, doc_type) DO UPDATE SET
      doc_name = excluded.doc_name,
      file_name = excluded.file_name,
      file_type = excluded.file_type,
      file_size = excluded.file_size,
      file_data = excluded.file_data,
      uploaded_at = datetime('now', 'localtime')
  `);

  stmt.run(
    employeeId,
    doc.doc_type,
    doc.doc_name || doc.doc_type,
    doc.file_name || 'document.pdf',
    doc.file_type || 'application/pdf',
    doc.file_size || (doc.file_data ? doc.file_data.length : 0),
    doc.file_data
  );

  if (doc.doc_type === 'PASSPORT_PHOTO') {
    db.prepare(`UPDATE employees SET photo_url = ? WHERE id = ?`).run(doc.file_data, employeeId);
  }

  return { success: true, message: `${doc.doc_name || 'Document'} saved successfully.` };
}

export function deleteEmployeeDocument(docId) {
  const db = getDb();
  const doc = db.prepare(`SELECT employee_id, doc_type FROM employee_documents WHERE id = ?`).get(docId);
  if (doc && doc.doc_type === 'PASSPORT_PHOTO') {
    db.prepare(`UPDATE employees SET photo_url = NULL WHERE id = ?`).run(doc.employee_id);
  }
  db.prepare(`DELETE FROM employee_documents WHERE id = ?`).run(docId);
  return { success: true, message: 'Document deleted successfully.' };
}

export function createOrUpdateEmployee(empData) {
  const db = getDb();

  const joiningDate = empData.date_of_joining || new Date().toISOString().slice(0, 10);

  if (empData.id) {
    // Update
    const isPfEligible = empData.is_pf_eligible ? 1 : 0;
    const pfRate = Number(empData.pf_rate_percent || 12);
    const customPf = Number(empData.custom_pf_amount || 0);
    const photoUrl = empData.photo_url || null;
    const commissionPercent = Number(empData.sales_commission_percent || 0);
    const bloodGroup = empData.blood_group || null;
    const shiftType = empData.shift_type || 'GENERAL';

    const stmt = db.prepare(`
      UPDATE employees
      SET shop_id = ?, full_name = ?, phone = ?, email = ?, address = ?, designation = ?, department = ?,
          monthly_basic_salary = ?, daily_wage = ?, hra = ?, special_allowance = ?,
          overtime_rate_per_hour = ?, aadhaar_no = ?, pan_no = ?,
          bank_account = ?, bank_ifsc = ?, is_pf_eligible = ?, uan_no = ?, pf_rate_percent = ?, custom_pf_amount = ?,
          photo_url = ?, father_name = ?, emergency_phone = ?, status = ?,
          sales_commission_percent = ?, blood_group = ?, shift_type = ?
      WHERE id = ?
    `);

    stmt.run(
      empData.shop_id, empData.full_name, empData.phone, empData.email || null, empData.address || null,
      empData.designation, empData.department || 'Sales', empData.monthly_basic_salary || 0,
      empData.daily_wage || 0, empData.hra || 0, empData.special_allowance || 0,
      empData.overtime_rate_per_hour || 0, empData.aadhaar_no || null, empData.pan_no || null,
      empData.bank_account || null, empData.bank_ifsc || null,
      isPfEligible, empData.uan_no || null, pfRate, customPf, photoUrl,
      empData.father_name || null, empData.emergency_phone || null, empData.status || 'ACTIVE',
      commissionPercent, bloodGroup, shiftType,
      empData.id
    );

    // Save any documents provided in payload
    if (empData.documents && Array.isArray(empData.documents)) {
      for (const doc of empData.documents) {
        if (doc && doc.file_data) {
          saveEmployeeDocument(empData.id, doc);
        }
      }
    }

    // If portal login credentials are provided, create/update users table
    if (empData.username) {
      const cleanUsername = String(empData.username).trim().toLowerCase();
      const existingUser = db.prepare(`SELECT id FROM users WHERE employee_id = ?`).get(empData.id);
      const customPermsJson = empData.permissions && Array.isArray(empData.permissions) 
        ? JSON.stringify(empData.permissions) 
        : (empData.custom_permissions_json || null);

      if (existingUser) {
        if (empData.password && empData.password.trim()) {
          const hashedPass = hashPassword(empData.password);
          db.prepare(`
            UPDATE users SET username = ?, role_id = ?, shop_id = ?, display_name = ?,
                             password_hash = ?, custom_permissions_json = ?, is_active = COALESCE(?, is_active)
            WHERE id = ?
          `).run(cleanUsername, empData.role_id || 3, empData.shop_id, empData.full_name, hashedPass, customPermsJson, empData.login_is_active !== undefined ? empData.login_is_active : 1, existingUser.id);
        } else {
          db.prepare(`
            UPDATE users SET username = ?, role_id = ?, shop_id = ?, display_name = ?,
                             custom_permissions_json = ?, is_active = COALESCE(?, is_active)
            WHERE id = ?
          `).run(cleanUsername, empData.role_id || 3, empData.shop_id, empData.full_name, customPermsJson, empData.login_is_active !== undefined ? empData.login_is_active : 1, existingUser.id);
        }
      } else {
        const hashedPass = hashPassword(empData.password || '123456');
        db.prepare(`
          INSERT INTO users (shop_id, employee_id, username, password_hash, display_name, phone, role_id, is_active, custom_permissions_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(empData.shop_id, empData.id, cleanUsername, hashedPass, empData.full_name, empData.phone, empData.role_id || 3, empData.login_is_active !== undefined ? empData.login_is_active : 1, customPermsJson);
      }
    }

    const updatedEmp = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(empData.id);
    return { success: true, employee: updatedEmp, message: 'Employee profile updated successfully.' };
  } else {
    // Generate new employee code
    const empCode = empData.employee_code || getNextEmployeeCode();
    const isPfEligible = empData.is_pf_eligible ? 1 : 0;
    const pfRate = Number(empData.pf_rate_percent || 12);
    const customPf = Number(empData.custom_pf_amount || 0);
    const photoUrl = empData.photo_url || null;
    const commissionPercent = Number(empData.sales_commission_percent || 0);
    const bloodGroup = empData.blood_group || null;
    const shiftType = empData.shift_type || 'GENERAL';

    const stmt = db.prepare(`
      INSERT INTO employees (
        employee_code, shop_id, full_name, phone, email, address, designation, department,
        date_of_joining, monthly_basic_salary, daily_wage, hra, special_allowance, overtime_rate_per_hour,
        aadhaar_no, pan_no, bank_account, bank_ifsc, is_pf_eligible, uan_no, pf_rate_percent, custom_pf_amount,
        photo_url, father_name, emergency_phone, status, sales_commission_percent, blood_group, shift_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      empCode, empData.shop_id, empData.full_name, empData.phone, empData.email || null, empData.address || null,
      empData.designation, empData.department || 'Sales', joiningDate, empData.monthly_basic_salary || 0,
      empData.daily_wage || 0, empData.hra || 0, empData.special_allowance || 0,
      empData.overtime_rate_per_hour || 0, empData.aadhaar_no || null, empData.pan_no || null,
      empData.bank_account || null, empData.bank_ifsc || null,
      isPfEligible, empData.uan_no || null, pfRate, customPf,
      photoUrl, empData.father_name || null, empData.emergency_phone || null, 'ACTIVE',
      commissionPercent, bloodGroup, shiftType
    );

    const empId = info.lastInsertRowid;

    // Save any documents provided in payload
    if (empData.documents && Array.isArray(empData.documents)) {
      for (const doc of empData.documents) {
        if (doc && doc.file_data) {
          saveEmployeeDocument(empId, doc);
        }
      }
    }

    // Create user login if credentials supplied
    if (empData.username) {
      const cleanUsername = String(empData.username).trim().toLowerCase();
      const hashedPass = hashPassword(empData.password || '123456');
      const customPermsJson = empData.permissions && Array.isArray(empData.permissions) 
        ? JSON.stringify(empData.permissions) 
        : (empData.custom_permissions_json || null);

      db.prepare(`
        INSERT INTO users (shop_id, employee_id, username, password_hash, display_name, phone, role_id, is_active, custom_permissions_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(empData.shop_id, empId, cleanUsername, hashedPass, empData.full_name, empData.phone, empData.role_id || 3, customPermsJson);
    }

    const createdEmp = db.prepare(`
      SELECT e.*, s.name as shop_name, s.legal_name, s.phone as shop_phone, s.email as shop_email, s.address as shop_address, s.gstin as shop_gstin
      FROM employees e
      JOIN shops s ON e.shop_id = s.id
      WHERE e.id = ?
    `).get(empId);

    return { 
      success: true, 
      id: empId, 
      employee_code: empCode, 
      employee: createdEmp, 
      message: 'New employee onboarded successfully.' 
    };
  }
}

// 2. Attendance Management
export function getAttendanceRegister(shopId, date) {
  const db = getDb();
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const register = db.prepare(`
    SELECT e.id as employee_id, e.employee_code, e.full_name, e.designation, e.department,
           s.name as shop_name,
           a.id as attendance_id, a.check_in_time, a.check_out_time, a.status, a.work_hours, a.notes, a.date
    FROM employees e
    JOIN shops s ON e.shop_id = s.id
    LEFT JOIN attendance a ON a.employee_id = e.id AND a.date = ?
    WHERE e.status = 'ACTIVE' ${shopId ? 'AND e.shop_id = ?' : ''}
    ORDER BY e.full_name ASC
  `).all(...(shopId ? [targetDate, shopId] : [targetDate]));

  return register;
}

export function recordAttendance(data) {
  const db = getDb();
  const { employee_id, shop_id, date, check_in_time, check_out_time, status = 'PRESENT', work_hours = 8, notes } = data;
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const existing = db.prepare(`SELECT id FROM attendance WHERE employee_id = ? AND date = ?`).get(employee_id, targetDate);

  if (existing) {
    db.prepare(`
      UPDATE attendance
      SET check_in_time = COALESCE(?, check_in_time),
          check_out_time = COALESCE(?, check_out_time),
          status = ?, work_hours = ?, notes = ?
      WHERE id = ?
    `).run(check_in_time || null, check_out_time || null, status, work_hours, notes || null, existing.id);
  } else {
    db.prepare(`
      INSERT INTO attendance (employee_id, shop_id, date, check_in_time, check_out_time, status, work_hours, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(employee_id, shop_id, targetDate, check_in_time || null, check_out_time || null, status, work_hours, notes || null);
  }

  return { success: true, message: 'Attendance recorded successfully.' };
}

export function markBatchAttendance(data) {
  const db = getDb();
  const { shop_id, date, status = 'PRESENT', employee_ids } = data;
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const emps = employee_ids && employee_ids.length > 0
    ? employee_ids
    : db.prepare(`SELECT id FROM employees WHERE status = 'ACTIVE' ${shop_id ? 'AND shop_id = ?' : ''}`).all(...(shop_id ? [shop_id] : [])).map(e => e.id);

  const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  for (const empId of emps) {
    const existing = db.prepare(`SELECT id FROM attendance WHERE employee_id = ? AND date = ?`).get(empId, targetDate);
    if (existing) {
      db.prepare(`UPDATE attendance SET status = ?, check_in_time = COALESCE(check_in_time, ?) WHERE id = ?`)
        .run(status, nowTime, existing.id);
    } else {
      db.prepare(`INSERT INTO attendance (employee_id, shop_id, date, check_in_time, status, work_hours) VALUES (?, ?, ?, ?, ?, 8)`)
        .run(empId, shop_id || 1, targetDate, nowTime, status);
    }
  }

  return { success: true, count: emps.length, message: `Marked attendance as ${status} for ${emps.length} staff members.` };
}

export function getAttendanceAnalytics(shopId, params = {}) {
  const db = getDb();
  const viewType = params.viewType || 'month'; // 'week', 'month', 'year'
  const empIdFilter = params.employeeId && params.employeeId !== 'ALL' ? Number(params.employeeId) : null;
  const targetYear = Number(params.year || new Date().getFullYear());
  const targetMonth = Number(params.month || (new Date().getMonth() + 1)); // 1-12
  const targetWeekDate = params.weekDate || new Date().toISOString().slice(0, 10);

  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  let empQuery = `SELECT id, employee_code, full_name, designation, department, photo_url FROM employees WHERE status = 'ACTIVE'`;
  const empParams = [];
  if (shopId) {
    empQuery += ` AND shop_id = ?`;
    empParams.push(shopId);
  }
  if (empIdFilter) {
    empQuery += ` AND id = ?`;
    empParams.push(empIdFilter);
  }
  empQuery += ` ORDER BY full_name ASC`;
  const employees = db.prepare(empQuery).all(...empParams);

  if (viewType === 'week') {
    const cur = new Date(targetWeekDate + 'T00:00:00');
    const dayOfWeek = cur.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(cur);
    monday.setDate(cur.getDate() + diffToMon);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ymd = formatYMD(d);
      weekDays.push({
        date: ymd,
        dayName: dayNames[d.getDay()],
        dayShort: dayNames[d.getDay()].slice(0, 3),
        dayNumber: d.getDate(),
        isToday: ymd === formatYMD(new Date())
      });
    }

    const startDate = weekDays[0].date;
    const endDate = weekDays[6].date;

    let attQuery = `
      SELECT a.*, e.full_name, e.employee_code, e.designation
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date >= ? AND a.date <= ?
    `;
    const attParams = [startDate, endDate];
    if (shopId) {
      attQuery += ` AND a.shop_id = ?`;
      attParams.push(shopId);
    }
    if (empIdFilter) {
      attQuery += ` AND a.employee_id = ?`;
      attParams.push(empIdFilter);
    }

    const attRows = db.prepare(attQuery).all(...attParams);
    const attMap = {};
    for (const r of attRows) {
      attMap[`${r.employee_id}_${r.date}`] = r;
    }

    const employeesData = employees.map(emp => {
      let presentCount = 0;
      let halfDayCount = 0;
      let leaveCount = 0;
      let absentCount = 0;
      let totalHours = 0;

      const records = weekDays.map(wd => {
        const att = attMap[`${emp.id}_${wd.date}`];
        const status = att ? att.status : 'NOT_MARKED';
        const workHours = att ? Number(att.work_hours || 0) : 0;
        
        if (status === 'PRESENT') {
          presentCount++;
          totalHours += workHours || 8;
        } else if (status === 'HALF_DAY') {
          halfDayCount++;
          totalHours += workHours || 4;
        } else if (status === 'PAID_LEAVE' || status === 'LEAVE' || status === 'HOLIDAY') {
          leaveCount++;
        } else if (status === 'ABSENT') {
          absentCount++;
        }

        return {
          ...wd,
          attendance_id: att ? att.id : null,
          status,
          check_in_time: att ? att.check_in_time : null,
          check_out_time: att ? att.check_out_time : null,
          work_hours: workHours,
          notes: att ? att.notes : null
        };
      });

      const effectivePresent = presentCount + (halfDayCount * 0.5);
      const totalMarked = presentCount + halfDayCount + leaveCount + absentCount;
      const attendancePercent = totalMarked > 0 ? Math.round((effectivePresent / totalMarked) * 100) : 0;

      return {
        employee: emp,
        records,
        summary: {
          totalDays: 7,
          presentCount,
          halfDayCount,
          leaveCount,
          absentCount,
          totalHours,
          attendancePercent
        }
      };
    });

    return {
      viewType: 'week',
      startDate,
      endDate,
      weekDays,
      employees: employeesData,
      singleEmployee: empIdFilter ? employeesData[0] || null : null
    };
  }

  if (viewType === 'month') {
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const monthStr = String(targetMonth).padStart(2, '0');
    const startDate = `${targetYear}-${monthStr}-01`;
    const endDate = `${targetYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

    const monthDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(targetYear, targetMonth - 1, day);
      const ymd = formatYMD(d);
      monthDays.push({
        date: ymd,
        dayNumber: day,
        dayName: dayNames[d.getDay()],
        dayShort: dayNames[d.getDay()].slice(0, 3),
        dayOfWeek: d.getDay(),
        isWeekend: d.getDay() === 0,
        isToday: ymd === formatYMD(new Date())
      });
    }

    let attQuery = `
      SELECT a.*, e.full_name, e.employee_code, e.designation
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date >= ? AND a.date <= ?
    `;
    const attParams = [startDate, endDate];
    if (shopId) {
      attQuery += ` AND a.shop_id = ?`;
      attParams.push(shopId);
    }
    if (empIdFilter) {
      attQuery += ` AND a.employee_id = ?`;
      attParams.push(empIdFilter);
    }

    const attRows = db.prepare(attQuery).all(...attParams);
    const attMap = {};
    for (const r of attRows) {
      attMap[`${r.employee_id}_${r.date}`] = r;
    }

    const employeesData = employees.map(emp => {
      let presentCount = 0;
      let halfDayCount = 0;
      let leaveCount = 0;
      let absentCount = 0;
      let totalHours = 0;

      const records = monthDays.map(md => {
        const att = attMap[`${emp.id}_${md.date}`];
        const status = att ? att.status : (md.isWeekend ? 'WEEK_OFF' : 'NOT_MARKED');
        const workHours = att ? Number(att.work_hours || 0) : 0;

        if (status === 'PRESENT') {
          presentCount++;
          totalHours += workHours || 8;
        } else if (status === 'HALF_DAY') {
          halfDayCount++;
          totalHours += workHours || 4;
        } else if (status === 'PAID_LEAVE' || status === 'LEAVE' || status === 'HOLIDAY') {
          leaveCount++;
        } else if (status === 'ABSENT') {
          absentCount++;
        }

        return {
          ...md,
          attendance_id: att ? att.id : null,
          status,
          check_in_time: att ? att.check_in_time : null,
          check_out_time: att ? att.check_out_time : null,
          work_hours: workHours,
          notes: att ? att.notes : null
        };
      });

      const effectivePresent = presentCount + (halfDayCount * 0.5);
      const totalWorkDays = daysInMonth - monthDays.filter(d => d.isWeekend).length;
      const attendancePercent = totalWorkDays > 0 ? Math.min(100, Math.round((effectivePresent / totalWorkDays) * 100)) : 0;

      return {
        employee: emp,
        records,
        summary: {
          totalDays: daysInMonth,
          workingDays: totalWorkDays,
          presentCount,
          halfDayCount,
          leaveCount,
          absentCount,
          totalHours,
          attendancePercent
        }
      };
    });

    return {
      viewType: 'month',
      year: targetYear,
      month: targetMonth,
      monthName: monthNames[targetMonth - 1],
      startDate,
      endDate,
      monthDays,
      employees: employeesData,
      singleEmployee: empIdFilter ? employeesData[0] || null : null
    };
  }

  if (viewType === 'year') {
    const yearStr = String(targetYear);
    const startDate = `${yearStr}-01-01`;
    const endDate = `${yearStr}-12-31`;

    let attQuery = `
      SELECT a.*, e.full_name, e.employee_code
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date >= ? AND a.date <= ?
    `;
    const attParams = [startDate, endDate];
    if (shopId) {
      attQuery += ` AND a.shop_id = ?`;
      attParams.push(shopId);
    }
    if (empIdFilter) {
      attQuery += ` AND a.employee_id = ?`;
      attParams.push(empIdFilter);
    }

    const attRows = db.prepare(attQuery).all(...attParams);

    const empMonthMap = {};
    for (const r of attRows) {
      const monthNum = parseInt(r.date.slice(5, 7), 10);
      const key = `${r.employee_id}_${monthNum}`;
      if (!empMonthMap[key]) empMonthMap[key] = [];
      empMonthMap[key].push(r);
    }

    const employeesData = employees.map(emp => {
      let grandPresent = 0;
      let grandHalfDay = 0;
      let grandLeave = 0;
      let grandAbsent = 0;
      let grandHours = 0;

      const monthlyBreakdown = [];
      for (let m = 1; m <= 12; m++) {
        const rows = empMonthMap[`${emp.id}_${m}`] || [];
        const daysInM = new Date(targetYear, m, 0).getDate();
        
        let present = 0;
        let halfDay = 0;
        let leave = 0;
        let absent = 0;
        let hours = 0;

        for (const r of rows) {
          if (r.status === 'PRESENT') {
            present++;
            hours += Number(r.work_hours || 8);
          } else if (r.status === 'HALF_DAY') {
            halfDay++;
            hours += Number(r.work_hours || 4);
          } else if (r.status === 'PAID_LEAVE' || r.status === 'LEAVE' || r.status === 'HOLIDAY') {
            leave++;
          } else if (r.status === 'ABSENT') {
            absent++;
          }
        }

        grandPresent += present;
        grandHalfDay += halfDay;
        grandLeave += leave;
        grandAbsent += absent;
        grandHours += hours;

        const effectivePresent = present + (halfDay * 0.5);
        const approxWorkingDays = 26;
        const monthPercent = approxWorkingDays > 0 ? Math.min(100, Math.round((effectivePresent / approxWorkingDays) * 100)) : 0;

        monthlyBreakdown.push({
          month: m,
          monthName: monthNames[m - 1],
          monthShort: monthNames[m - 1].slice(0, 3),
          daysInMonth: daysInM,
          presentCount: present,
          halfDayCount: halfDay,
          leaveCount: leave,
          absentCount: absent,
          totalHours: hours,
          attendancePercent: monthPercent
        });
      }

      const yearlyEffectivePresent = grandPresent + (grandHalfDay * 0.5);
      const totalPossibleDays = 26 * 12;
      const grandPercent = totalPossibleDays > 0 ? Math.min(100, Math.round((yearlyEffectivePresent / totalPossibleDays) * 100)) : 0;

      return {
        employee: emp,
        monthlyBreakdown,
        summary: {
          year: targetYear,
          presentCount: grandPresent,
          halfDayCount: grandHalfDay,
          leaveCount: grandLeave,
          absentCount: grandAbsent,
          totalHours: grandHours,
          attendancePercent: grandPercent
        }
      };
    });

    return {
      viewType: 'year',
      year: targetYear,
      employees: employeesData,
      singleEmployee: empIdFilter ? employeesData[0] || null : null
    };
  }

  return { viewType, employees: [] };
}

// 3. Leave Management
export function getLeaves(shopId) {
  const db = getDb();
  let query = `
    SELECT l.*, e.full_name as employee_name, e.employee_code, e.designation, s.name as shop_name,
           u.display_name as approved_by_name
    FROM leaves l
    JOIN employees e ON l.employee_id = e.id
    JOIN shops s ON l.shop_id = s.id
    LEFT JOIN users u ON l.approved_by_user_id = u.id
  `;
  const params = [];

  if (shopId) {
    query += ` WHERE l.shop_id = ?`;
    params.push(shopId);
  }

  query += ` ORDER BY l.id DESC`;
  return db.prepare(query).all(...params);
}

export function applyLeave(data) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO leaves (employee_id, shop_id, leave_type, start_date, end_date, total_days, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `);
  const info = stmt.run(
    data.employee_id, data.shop_id, data.leave_type || 'CASUAL',
    data.start_date, data.end_date, data.total_days || 1, data.reason
  );
  return { success: true, id: info.lastInsertRowid, message: 'Leave application submitted.' };
}

export function updateLeaveStatus(leaveId, status, userId, actionNotes = '') {
  const db = getDb();
  db.prepare(`
    UPDATE leaves
    SET status = ?, approved_by_user_id = ?, action_notes = ?
    WHERE id = ?
  `).run(status, userId, actionNotes, leaveId);

  // If approved as PAID or UNPAID, sync with attendance table
  const leave = db.prepare(`SELECT * FROM leaves WHERE id = ?`).get(leaveId);
  if (leave && status === 'APPROVED') {
    const attStatus = (leave.leave_type === 'UNPAID') ? 'ABSENT' : 'PAID_LEAVE';
    db.prepare(`
      INSERT OR REPLACE INTO attendance (employee_id, shop_id, date, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(leave.employee_id, leave.shop_id, leave.start_date, attStatus, `Leave: ${leave.leave_type} (${leave.reason})`);
  }

  return { success: true, message: `Leave application ${status.toLowerCase()} successfully.` };
}

// 4. Staff Advances & Loans
export function getAdvances(shopId) {
  const db = getDb();
  let query = `
    SELECT a.*, e.full_name as employee_name, e.employee_code, s.name as shop_name
    FROM employee_advances a
    JOIN employees e ON a.employee_id = e.id
    JOIN shops s ON a.shop_id = s.id
  `;
  const params = [];
  if (shopId) {
    query += ` WHERE a.shop_id = ?`;
    params.push(shopId);
  }
  query += ` ORDER BY a.id DESC`;
  return db.prepare(query).all(...params);
}

export function issueAdvance(data) {
  const db = getDb();
  db.prepare(`
    INSERT INTO employee_advances (employee_id, shop_id, amount, date, reason, status)
    VALUES (?, ?, ?, ?, ?, 'PENDING')
  `).run(data.employee_id, data.shop_id, data.amount, data.date || new Date().toISOString().slice(0, 10), data.reason || 'Staff Salary Advance');
  return { success: true, message: 'Salary advance recorded.' };
}

// 5. Monthly Payroll Calculation & Salary Slips
export function calculatePayroll(shopId, monthYear) {
  const db = getDb();
  const targetMonth = monthYear || new Date().toISOString().slice(0, 7); // YYYY-MM
  const employees = db.prepare(`SELECT * FROM employees WHERE status = 'ACTIVE' ${shopId ? 'AND shop_id = ?' : ''}`).all(...(shopId ? [shopId] : []));

  const payrollSummaries = [];

  for (const emp of employees) {
    // Check if payroll has already been processed for this employee and month
    const existingRun = db.prepare(`
      SELECT pr.*, s.name as shop_name
      FROM payroll_runs pr
      JOIN shops s ON pr.shop_id = s.id
      WHERE pr.employee_id = ? AND pr.month_year = ?
    `).get(emp.id, targetMonth);

    // Total days in target month
    const [year, month] = targetMonth.split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    // Pending advances
    const advances = db.prepare(`
      SELECT SUM(amount) as total_adv
      FROM employee_advances
      WHERE employee_id = ? AND status = 'PENDING'
    `).get(emp.id);

    const pendingAdvance = Number(advances?.total_adv || 0);

    if (existingRun) {
      // Return processed payroll record with stored PF values
      payrollSummaries.push({
        id: existingRun.id,
        is_processed: true,
        payment_status: existingRun.payment_status || 'PAID',
        payment_date: existingRun.payment_date,
        payment_mode: existingRun.payment_mode || 'BANK_TRANSFER',
        payment_ref: existingRun.payment_ref || '',
        notes: existingRun.notes || '',
        employee_id: emp.id,
        employee_code: emp.employee_code,
        full_name: emp.full_name,
        designation: emp.designation,
        department: emp.department,
        shop_id: emp.shop_id,
        shop_name: existingRun.shop_name,
        month_year: targetMonth,
        total_days_in_month: existingRun.total_days_in_month || totalDaysInMonth,
        present_days: existingRun.present_days,
        paid_leaves: existingRun.paid_leaves,
        unpaid_leaves: existingRun.unpaid_leaves,
        overtime_hours: existingRun.overtime_hours || 0,
        monthly_basic: emp.monthly_basic_salary || 0,
        daily_wage: emp.daily_wage || (emp.monthly_basic_salary ? Math.round(emp.monthly_basic_salary / totalDaysInMonth) : 0),
        earned_basic: existingRun.basic_pay,
        basic_pay: existingRun.basic_pay,
        hra: existingRun.hra,
        allowances: existingRun.allowances,
        overtime_pay: existingRun.overtime_pay || 0,
        gross_salary: existingRun.gross_salary,
        advance_deduction: existingRun.advance_deduction,
        pf_deduction: existingRun.pf_deduction || 0,
        employer_pf: existingRun.employer_pf || 0,
        other_deductions: existingRun.other_deductions || 0,
        net_payable: existingRun.net_payable,
        pending_advance: pendingAdvance,
        is_pf_eligible: Boolean(emp.is_pf_eligible || (existingRun.pf_deduction > 0)),
        uan_no: emp.uan_no || '',
        pf_rate_percent: emp.pf_rate_percent || 12,
        custom_pf_amount: emp.custom_pf_amount || 0,
        bank_account: emp.bank_account,
        bank_ifsc: emp.bank_ifsc,
        pan_no: emp.pan_no,
        aadhaar_no: emp.aadhaar_no,
        phone: emp.phone,
        email: emp.email
      });
      continue;
    }

    // Otherwise calculate dynamically from attendance and settings
    const attRecords = db.prepare(`
      SELECT status, COUNT(*) as count, SUM(work_hours) as total_hours
      FROM attendance
      WHERE employee_id = ? AND date LIKE ?
      GROUP BY status
    `).all(emp.id, `${targetMonth}-%`);

    let presentDays = 0;
    let halfDays = 0;
    let paidLeaves = 0;
    let unpaidLeaves = 0;

    attRecords.forEach(r => {
      if (r.status === 'PRESENT') presentDays += r.count;
      else if (r.status === 'HALF_DAY') halfDays += r.count;
      else if (r.status === 'PAID_LEAVE') paidLeaves += r.count;
      else if (r.status === 'ABSENT') unpaidLeaves += r.count;
    });

    // Check approved leaves from leaves table for this month
    const approvedPaidLeaves = db.prepare(`
      SELECT SUM(total_days) as days
      FROM leaves
      WHERE employee_id = ? AND status = 'APPROVED' AND leave_type != 'UNPAID'
        AND (start_date LIKE ? OR end_date LIKE ?)
    `).get(emp.id, `${targetMonth}-%`, `${targetMonth}-%`);

    if (approvedPaidLeaves?.days && paidLeaves === 0) {
      paidLeaves = Number(approvedPaidLeaves.days);
    }

    // Default present days: if attendance was not recorded at all, default to full standard month
    const totalRecordedDays = presentDays + halfDays + paidLeaves + unpaidLeaves;
    let effectivePresent = presentDays + (halfDays * 0.5) + paidLeaves;
    if (totalRecordedDays === 0) {
      effectivePresent = totalDaysInMonth;
      presentDays = totalDaysInMonth;
    }

    // Salary rates
    const monthlyBasic = Number(emp.monthly_basic_salary || 0);
    const perDayRate = totalDaysInMonth > 0 ? (monthlyBasic / totalDaysInMonth) : 0;
    const earnedBasic = Math.round(perDayRate * effectivePresent);

    // Calculate sales commission for this employee in targetMonth
    let salesCommissionPay = 0;
    let totalEmployeeSales = 0;
    const commissionRate = Number(emp.sales_commission_percent || 0);
    if (commissionRate > 0) {
      const salesRow = db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as total_sales
        FROM invoices
        WHERE sales_employee_id = ? AND invoice_date LIKE ?
      `).get(emp.id, `${targetMonth}-%`);
      totalEmployeeSales = salesRow ? Number(salesRow.total_sales) : 0;
      salesCommissionPay = Math.round(totalEmployeeSales * (commissionRate / 100));
    }

    const hra = Number(emp.hra || 0);
    const allowances = Number(emp.special_allowance || 0);
    const grossSalary = earnedBasic + hra + allowances + salesCommissionPay;

    const advanceDeduction = Math.min(pendingAdvance, grossSalary);

    // Optional PF calculation
    const isPfEligible = Boolean(emp.is_pf_eligible);
    let pfDeduction = 0;
    if (isPfEligible) {
      if (Number(emp.custom_pf_amount) > 0) {
        pfDeduction = Number(emp.custom_pf_amount);
      } else {
        const pfRate = Number(emp.pf_rate_percent || 12);
        pfDeduction = Math.round(earnedBasic * (pfRate / 100));
      }
    }

    const netPayable = Math.max(0, grossSalary - advanceDeduction - pfDeduction);

    payrollSummaries.push({
      is_processed: false,
      payment_status: 'PENDING',
      payment_date: null,
      payment_mode: 'BANK_TRANSFER',
      payment_ref: '',
      notes: '',
      employee_id: emp.id,
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      designation: emp.designation,
      department: emp.department,
      shop_id: emp.shop_id,
      month_year: targetMonth,
      total_days_in_month: totalDaysInMonth,
      present_days: presentDays + (halfDays * 0.5),
      paid_leaves: paidLeaves,
      unpaid_leaves: unpaidLeaves,
      overtime_hours: 0,
      overtime_rate: emp.overtime_rate_per_hour || 0,
      overtime_pay: 0,
      monthly_basic: monthlyBasic,
      daily_wage: emp.daily_wage || Math.round(perDayRate),
      earned_basic: earnedBasic,
      basic_pay: earnedBasic,
      hra: hra,
      allowances: allowances,
      sales_commission_percent: commissionRate,
      total_sales_generated: totalEmployeeSales,
      sales_commission_pay: salesCommissionPay,
      bonus: 0,
      gross_salary: grossSalary,
      pending_advance: pendingAdvance,
      advance_deduction: advanceDeduction,
      is_pf_eligible: isPfEligible,
      uan_no: emp.uan_no || '',
      pf_rate_percent: emp.pf_rate_percent || 12,
      custom_pf_amount: emp.custom_pf_amount || 0,
      pf_deduction: pfDeduction,
      employer_pf: pfDeduction, // Optional matching contribution
      other_deductions: 0,
      net_payable: netPayable,
      bank_account: emp.bank_account,
      bank_ifsc: emp.bank_ifsc,
      pan_no: emp.pan_no,
      aadhaar_no: emp.aadhaar_no,
      phone: emp.phone,
      email: emp.email
    });
  }

  return payrollSummaries;
}

export function processPayrollRun(payrollData) {
  const db = getDb();
  
  const earnedBasic = Number(payrollData.earned_basic || payrollData.basic_pay || 0);
  const hra = Number(payrollData.hra || 0);
  const allowances = Number(payrollData.allowances || 0) + Number(payrollData.bonus || 0);
  const overtimePay = Number(payrollData.overtime_pay || 0);
  const salesCommissionPay = Number(payrollData.sales_commission_pay || 0);
  const grossSalary = Number(payrollData.gross_salary || (earnedBasic + hra + allowances + overtimePay + salesCommissionPay));
  const advanceDeduction = Number(payrollData.advance_deduction || 0);
  const pfDeduction = Number(payrollData.pf_deduction || 0);
  const employerPf = Number(payrollData.employer_pf || 0);
  const otherDeductions = Number(payrollData.other_deductions || 0);
  const netPayable = Number(payrollData.net_payable || (grossSalary - advanceDeduction - pfDeduction - otherDeductions));
  const paymentDate = payrollData.payment_date || new Date().toISOString().slice(0, 10);
  const paymentMode = payrollData.payment_mode || 'BANK_TRANSFER';
  const paymentRef = payrollData.payment_ref || null;
  const notes = payrollData.notes || null;

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO payroll_runs (
      shop_id, month_year, employee_id, total_days_in_month, present_days, paid_leaves,
      unpaid_leaves, overtime_hours, basic_pay, hra, allowances, overtime_pay, sales_commission_pay, gross_salary,
      advance_deduction, pf_deduction, employer_pf, other_deductions, net_payable, payment_status,
      payment_date, payment_mode, payment_ref, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?, ?)
  `);

  const info = stmt.run(
    payrollData.shop_id, payrollData.month_year, payrollData.employee_id,
    payrollData.total_days_in_month || 30, payrollData.present_days || 30,
    payrollData.paid_leaves || 0, payrollData.unpaid_leaves || 0,
    payrollData.overtime_hours || 0, earnedBasic, hra, allowances, overtimePay, salesCommissionPay,
    grossSalary, advanceDeduction, pfDeduction, employerPf, otherDeductions, netPayable,
    paymentDate, paymentMode, paymentRef, notes
  );

  // Mark advances as recovered up to the advance deduction amount
  if (advanceDeduction > 0) {
    db.prepare(`
      UPDATE employee_advances
      SET status = 'RECOVERED', recovered_in_payroll_id = ?
      WHERE employee_id = ? AND status = 'PENDING'
    `).run(info.lastInsertRowid, payrollData.employee_id);
  }

  // Fetch complete created payroll record with employee details
  const savedRecord = db.prepare(`
    SELECT pr.*, e.full_name, e.employee_code, e.designation, e.department, e.bank_account,
           e.bank_ifsc, e.pan_no, e.uan_no, e.phone, s.name as shop_name
    FROM payroll_runs pr
    JOIN employees e ON pr.employee_id = e.id
    JOIN shops s ON pr.shop_id = s.id
    WHERE pr.employee_id = ? AND pr.month_year = ?
  `).get(payrollData.employee_id, payrollData.month_year);

  return { 
    success: true, 
    payroll: savedRecord,
    message: `Payroll processed successfully for ${savedRecord?.full_name || 'employee'}! Salary slip is ready.` 
  };
}

export function deletePayrollRun(shopId, monthYear, employeeId) {
  const db = getDb();
  // Find existing run
  const run = db.prepare(`SELECT * FROM payroll_runs WHERE shop_id = ? AND month_year = ? AND employee_id = ?`).get(shopId, monthYear, employeeId);
  if (!run) {
    throw new Error('Payroll record not found.');
  }

  // Reset advances back to PENDING if they were marked recovered in this run
  db.prepare(`
    UPDATE employee_advances
    SET status = 'PENDING', recovered_in_payroll_id = NULL
    WHERE employee_id = ? AND recovered_in_payroll_id = ?
  `).run(employeeId, run.id);

  // Delete payroll run
  db.prepare(`DELETE FROM payroll_runs WHERE id = ?`).run(run.id);

  return { success: true, message: 'Payroll run deleted. You can now re-process salary for this employee.' };
}

export function toggleEmployeeStatus(employeeId) {
  const db = getDb();
  const emp = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(employeeId);
  if (!emp) throw new Error('Employee not found');

  const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  db.prepare(`UPDATE employees SET status = ? WHERE id = ?`).run(newStatus, employeeId);

  // Synchronize portal login account status
  const isUserActive = newStatus === 'ACTIVE' ? 1 : 0;
  db.prepare(`UPDATE users SET is_active = ? WHERE employee_id = ?`).run(isUserActive, employeeId);

  return { 
    success: true, 
    status: newStatus,
    message: `Employee "${emp.full_name}" status set to ${newStatus}.` 
  };
}

export function deleteEmployee(employeeId) {
  const db = getDb();
  // Check if employee is primary owner
  const empUser = db.prepare(`SELECT u.*, r.role_key FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.employee_id = ?`).get(employeeId);
  if (empUser && (empUser.role_id === 1 || empUser.role_key === 'SUPER_ADMIN' || empUser.role_key === 'owner')) {
    throw new Error('Action prohibited: The primary Shop Owner account cannot be deleted.');
  }

  // Delete associated user login if any
  db.prepare(`DELETE FROM users WHERE employee_id = ?`).run(employeeId);
  db.prepare(`DELETE FROM attendance WHERE employee_id = ?`).run(employeeId);
  db.prepare(`DELETE FROM leaves WHERE employee_id = ?`).run(employeeId);
  db.prepare(`DELETE FROM employee_advances WHERE employee_id = ?`).run(employeeId);
  db.prepare(`DELETE FROM payroll_runs WHERE employee_id = ?`).run(employeeId);
  db.prepare(`DELETE FROM employees WHERE id = ?`).run(employeeId);

  return { success: true, message: 'Employee profile and linked credentials removed successfully.' };
}
