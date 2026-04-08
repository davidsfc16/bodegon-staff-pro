const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();

exports.notifyShiftEndedPushBg = onDocumentUpdated(
  "employees/{employeeId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    const beforeSchedule = before.schedule || [];
    const afterSchedule = after.schedule || [];

    let endedShift = null;

    for (const newShift of afterSchedule) {
      const oldShift = beforeSchedule.find((s) => s.id === newShift.id);

      if (oldShift && !oldShift.end && newShift.end) {
        endedShift = newShift;
        break;
      }
    }

    if (!endedShift) return;

    const adminDeviceDoc = await admin
      .firestore()
      .doc("adminDevice/main")
      .get();

    const token = adminDeviceDoc.data()?.token;
    if (!token) return;

    const employeeName = after.name || "Empleado";

    await admin.messaging().send({
      token,
      notification: {
        title: "Turno terminado",
        body: `${employeeName} ha terminado su turno a las ${endedShift.end}`,
      },
      android: {
        priority: "high",
      },
    });
  }
);

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date) {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDate(a, b) {
  return normalizeDateOnly(a).getTime() === normalizeDateOnly(b).getTime();
}

function parseWeekKeyRange(weekKey) {
  if (!weekKey || typeof weekKey !== "string" || !weekKey.includes("_")) {
    return null;
  }

  const [startStr, endStr] = weekKey.split("_");
  if (!startStr || !endStr) return null;

  const start = new Date(`${startStr}T12:00:00`);
  const end = new Date(`${endStr}T12:00:00`);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  return {
    start: normalizeDateOnly(start),
    end: normalizeDateOnly(end),
  };
}

function calculateHours(shift) {
  if (!shift.start || !shift.end) return 0;

  const startDate = new Date(`2024-01-01T${shift.start}`);
  const endDate = new Date(`2024-01-01T${shift.end}`);

  if (endDate < startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return (endDate - startDate) / 1000 / 60 / 60;
}

function calculateWeeklyHours(schedule, startDate, endDate) {
  let normalHours = 0;
  let extraHours = 0;

  (schedule || []).forEach((shift) => {
    if (
      shift.day === undefined ||
      shift.month === undefined ||
      shift.year === undefined
    ) {
      return;
    }

    const shiftDate = new Date(shift.year, shift.month, shift.day);
    shiftDate.setHours(12, 0, 0, 0);

    if (shiftDate < startDate || shiftDate > endDate) return;

    const hours = calculateHours(shift);

    if (hours > 8) {
      normalHours += 8;
      extraHours += hours - 8;
    } else {
      normalHours += hours;
    }
  });

  return {
    normalHours,
    extraHours,
    totalHours: normalHours + extraHours,
  };
}

exports.notifyPendingPaymentsWednesday = onSchedule(
  {
    schedule: "30 13 * * 3",
    timeZone: "Europe/Madrid",
  },
  async () => {
    const today = new Date();

    const currentWeekStart = getStartOfWeek(today);
    const previousWeekBase = new Date(currentWeekStart);
    previousWeekBase.setDate(previousWeekBase.getDate() - 7);

    const previousWeekStart = getStartOfWeek(previousWeekBase);
    const previousWeekEnd = getEndOfWeek(previousWeekBase);

    const employeesSnap = await admin.firestore().collection("employees").get();
    const employees = employeesSnap.docs.map((doc) => doc.data());

    const pendingEmployees = employees.filter((emp) => {
  const stats = calculateWeeklyHours(
    emp.schedule || [],
    previousWeekStart,
    previousWeekEnd
  );

  const hadHours = stats.normalHours > 0 || stats.extraHours > 0;
  if (!hadHours) return false;

  const mondayWeekKey = `${formatLocalDate(previousWeekStart)}_${formatLocalDate(previousWeekEnd)}`;

  const sundayBase = new Date(previousWeekStart);
  sundayBase.setDate(sundayBase.getDate() - 1);

  const sundayWeekKey = `${formatLocalDate(sundayBase)}_${formatLocalDate(previousWeekEnd)}`;

  const isPaid =
    emp.payments?.[mondayWeekKey]?.paid === true ||
    emp.payments?.[sundayWeekKey]?.paid === true;

  return !isPaid;
});

    if (pendingEmployees.length === 0) return;

    const adminDeviceDoc = await admin
      .firestore()
      .doc("adminDevice/main")
      .get();

    const token = adminDeviceDoc.data()?.token;
    if (!token) return;

    const names = pendingEmployees.map((e) => e.name).join(", ");

    await admin.messaging().send({
      token,
      notification: {
        title: "Pagos pendientes",
        body: `Quedan pendientes de pago de la semana pasada: ${names}`,
      },
      android: {
        priority: "high",
      },
    });
  }
);