
export function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfWeek(date = new Date()) {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function isShiftInWeek(shift, startDate, endDate) {
  if (
    shift.day === undefined ||
    shift.month === undefined ||
    shift.year === undefined
  ) {
    return false;
  }

  const shiftDate = new Date(shift.year, shift.month, shift.day);
  shiftDate.setHours(12, 0, 0, 0);

  return shiftDate >= startDate && shiftDate <= endDate;
}

export function calculateWeeklyHours(schedule, startDate, endDate) {
  let normalMinutes = 0;
  let extraMinutes = 0;

  (schedule || []).forEach((shift) => {
    if (!shift.start || !shift.end) return;
    if (!isShiftInWeek(shift, startDate, endDate)) return;

    const [sh, sm] = shift.start.split(":").map(Number);
    const [eh, em] = shift.end.split(":").map(Number);

    let start = sh * 60 + sm;
    let end = eh * 60 + em;

    // Si termina pasada la medianoche, sigue contando para el día en que empezó
    if (end < start) {
      end += 24 * 60;
    }

    const workedMinutes = end - start;
    const normalForThisShift = Math.min(workedMinutes, 8 * 60);
    const extraForThisShift = Math.max(workedMinutes - 8 * 60, 0);

    normalMinutes += normalForThisShift;
    extraMinutes += extraForThisShift;
  });

  const normalHours = normalMinutes / 60;
  const extraHours = extraMinutes / 60;
  const totalPay = normalHours * 8 + extraHours * 12;

  return {
    normalHours: Number(normalHours.toFixed(2)),
    extraHours: Number(extraHours.toFixed(2)),
    totalPay: Number(totalPay.toFixed(2)),
  };
}