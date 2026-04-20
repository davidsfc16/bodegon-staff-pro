import { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { PushNotifications } from "@capacitor/push-notifications";
import { Preferences } from "@capacitor/preferences";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  UserRound,
  LogOut,
  Shield,
  Fingerprint,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { db } from "./firebase";
import CalendarMonth from "./CalendarMonth";
import {
  calculateWeeklyHours,
} from "./Schedule";
import logo from "./assets/logo.png";
import "./App.css";

function App() {
  const ADMIN_PIN = "1616";

  const COLOR_PALETTE = [
    "#ef4444",
    "#22c55e",
    "#eab308",
    "#f97316",
    "#3b82f6",
    "#a855f7",
    "#ec4899",
    "#14b8a6",
    "#f43f5e",
    "#84cc16",
    "#6366f1",
  ];

  

  const createShiftId = () => {
  return `shift_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};
const [finishingShift, setFinishingShift] = useState(false);
const [showWeekActionModal, setShowWeekActionModal] = useState(false);
const [selectedWeekActionStart, setSelectedWeekActionStart] = useState(null);
const [selectedHistoryEmployeeId, setSelectedHistoryEmployeeId] = useState(null);
const [showSwapModal, setShowSwapModal] = useState(false);
const [swapCandidates, setSwapCandidates] = useState([]);
const [baseSwapShift, setBaseSwapShift] = useState(null);

  const formatHours = (hoursDecimal) => {
    const totalMinutes = Math.round(hoursDecimal * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };
  const [showDeleteWeekModal, setShowDeleteWeekModal] = useState(false);
const [selectedWeekToDelete, setSelectedWeekToDelete] = useState("");

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");
  const [settingsTab, setSettingsTab] = useState("employees");

  const [adminPin, setAdminPin] = useState("");
  const [selectedLoginEmployee, setSelectedLoginEmployee] = useState(null);
  const [employeePin, setEmployeePin] = useState("");

  const [calendarFormDay, setCalendarFormDay] = useState(null);
  const [calendarFormMonth, setCalendarFormMonth] = useState(null);
  const [calendarFormYear, setCalendarFormYear] = useState(null);
  const [calendarEmployeeId, setCalendarEmployeeId] = useState("");
  const [calendarStart, setCalendarStart] = useState("");
  const [calendarEnd, setCalendarEnd] = useState("");
  const [editingFromCalendar, setEditingFromCalendar] = useState(null);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedTeamEmployeeId, setSelectedTeamEmployeeId] = useState(null);
  const [employeeWeekOffset, setEmployeeWeekOffset] = useState(0);

  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeePin, setNewEmployeePin] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSettingsEmployeeId, setSelectedSettingsEmployeeId] =
    useState("");
  const [newPinValue, setNewPinValue] = useState("");
  const [updateAvailable, setUpdateAvailable] = useState(false);
const [currentVersion, setCurrentVersion] = useState(null);
const [showDeleteEmployees, setShowDeleteEmployees] = useState(false);
const [savingShift, setSavingShift] = useState(false);
const [restoringBackup, setRestoringBackup] = useState(false);
const [toast, setToast] = useState("");
const shouldBackup = () => {
  const last = localStorage.getItem("lastBackup");

  if (!last) return true;

  const diff = Date.now() - Number(last);
  return diff > 6 * 60 * 60 * 1000; // 6 horas
};

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();

  const diff = day === 0 ? -6 : 1 - day; // lunes
  d.setDate(d.getDate() + diff);

  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfWeek = (date) => {
  const start = getStartOfWeek(date);
  const end = new Date(start);

  end.setDate(start.getDate() + 6); // domingo
  end.setHours(23, 59, 59, 999);

  return end;
};
const getWeeksWithShifts = useCallback(() => {
  const weekMap = new Map();

  const toLocalDateKey = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  employees.forEach((emp) => {
    (emp.schedule || []).forEach((shift) => {
      if (
        shift.day === undefined ||
        shift.month === undefined ||
        shift.year === undefined
      ) {
        return;
      }

      const shiftDate = new Date(
        Number(shift.year),
        Number(shift.month),
        Number(shift.day)
      );

      const weekStart = getStartOfWeek(shiftDate);
      const weekEnd = getEndOfWeek(shiftDate);

      const key = `${toLocalDateKey(weekStart)}_${toLocalDateKey(weekEnd)}`;

      if (!weekMap.has(key)) {
        weekMap.set(key, {
          key,
          weekStart,
          weekEnd,
        });
      }
    });
  });

  return Array.from(weekMap.values()).sort((a, b) => b.weekStart - a.weekStart);
}, [employees]);

const hacerBackup = async (employees) => {
  try {
    await addDoc(collection(db, "backups"), {
      employees,
      createdAt: new Date().toISOString(),
    });

    console.log("Backup guardado ✔");
  } catch (err) {
    console.error("Error backup", err);
  }
};
const showToast = (msg) => {
  setToast(msg);
  setTimeout(() => setToast(""), 2000);
};

const checkForUpdates = useCallback(async () => {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (!currentVersion) {
      setCurrentVersion(data.version);
      return;
    }

    if (data.version !== currentVersion) {
      setUpdateAvailable(true);
    }
  } catch (error) {
    console.error("No se pudo comprobar actualización:", error);
  }
}, [currentVersion]);

  const vibrate = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const reloadApp = () => {
  window.location.reload();
};

  const getAvailableColor = () => {
    const usedColors = employees.map((e) => e.color);
    const available = COLOR_PALETTE.filter((c) => !usedColors.includes(c));

    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }

    return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
  };

  const saveSingleEmployee = async (updatedEmployee) => {
  await setDoc(doc(db, "employees", String(updatedEmployee.id)), updatedEmployee);

  setEmployees((prev) =>
    prev.map((emp) => (emp.id === updatedEmployee.id ? updatedEmployee : emp))
  );

  if (user?.id === updatedEmployee.id) {
    setUser(updatedEmployee);
  }
};

  const saveEmployees = async (updatedEmployees) => {
    setEmployees(updatedEmployees);

    for (const emp of updatedEmployees) {
      await setDoc(doc(db, "employees", String(emp.id)), emp);
    }

    if (user) {
      const refreshedUser = updatedEmployees.find((emp) => emp.id === user.id);
      setUser(refreshedUser || null);
    }
  };
  const handleSwapFromList = async (targetShift) => {
  if (!baseSwapShift || !targetShift) return;

  const ok = window.confirm("¿Intercambiar estos turnos?");
  if (!ok) return;

  let shiftA = baseSwapShift;
  let shiftB = targetShift;

  const updated = employees.map((emp) => {
    const newSchedule = (emp.schedule || []).map((shift) => {
      if (emp.id === shiftA.employeeId && shift.id === shiftA.id) {
        return {
          ...shift,
          day: shiftB.day,
          month: shiftB.month,
          year: shiftB.year,
          start: shiftB.start,
          end: shiftB.end,
        };
      }

      if (emp.id === shiftB.employeeId && shift.id === shiftB.id) {
        return {
          ...shift,
          day: shiftA.day,
          month: shiftA.month,
          year: shiftA.year,
          start: shiftA.start,
          end: shiftA.end,
        };
      }

      return shift;
    });

    return { ...emp, schedule: newSchedule };
  });

  setShowSwapModal(false);
  setSwapCandidates([]);
  setBaseSwapShift(null);

  await saveEmployees(updated);

  if (shouldBackup()) {
    await hacerBackup(updated);
    localStorage.setItem("lastBackup", Date.now());
  }

  showToast("Turnos intercambiados 🔄");
};

  const registerAdminPush = async () => {
  try {

    const permStatus = await PushNotifications.checkPermissions();

    let finalStatus = permStatus.receive;

    if (finalStatus !== "granted") {
      const req = await PushNotifications.requestPermissions();
      finalStatus = req.receive;
      alert("PERMISO DESPUÉS DE PEDIR: " + finalStatus);
    }

    if (finalStatus !== "granted") {
      alert("PERMISO DENEGADO");
      return;
    }

    await PushNotifications.register();
  } catch (error) {
    console.error("Error registrando push:", error);
  }
};
const setupAdminPushListeners = () => {
  PushNotifications.removeAllListeners();

  PushNotifications.addListener("registration", async (token) => {
    console.log("TOKEN:", token.value);

    try {
      await setDoc(doc(db, "adminDevice", "main"), {
        token: token.value,
        updatedAt: new Date().toISOString(),
        platform: "android",
      });
    } catch (error) {
      console.error("Error guardando token push:", error);
      alert("ERROR GUARDANDO TOKEN");
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("Error registro push:", err);
    alert("ERROR REGISTRO PUSH");
  });

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("Push recibida:", notification);
  });
};


  const loginAdminWithBiometric = async () => {
  try {
    const biometricEnabled = await Preferences.get({
      key: "adminBiometricEnabled",
    });

    if (biometricEnabled.value !== "true") {
      alert("Primero debes entrar con PIN en este móvil.");
      return;
    }

    const result = await BiometricAuth.checkBiometry();

    if (!result.isAvailable && !result.deviceIsSecure) {
      alert("Este móvil no tiene huella o bloqueo seguro configurado");
      return;
    }

    await BiometricAuth.authenticate({
      reason: "Acceder al modo jefe",
      cancelTitle: "Cancelar",
      allowDeviceCredentials: true,
    });

    setIsAdmin(true);
    setUser(null);
    setActiveTab("calendar");
    setAdminPin("");

    await Preferences.set({
      key: "adminSession",
      value: JSON.stringify({
        sessionType: "admin",
      }),
    });

    await Preferences.remove({ key: "employeeSession" });
    await registerAdminPush();
  } catch (error) {
    alert("No se pudo verificar la huella");
  }
};
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  if (showDeleteWeekModal) {
    const weeks = getWeeksWithShifts();
    if (weeks.length > 0) {
      setSelectedWeekToDelete(weeks[0].key);
    }
  }
}, [showDeleteWeekModal, getWeeksWithShifts]);
useEffect(() => {
  setupAdminPushListeners();
}, []);

useEffect(() => {
  if (!isAdmin) return;

  const today = new Date();
  const isWednesday = today.getDay() === 3; // miércoles

  if (!isWednesday) return;

  const hasPending = employees.some((emp) => {
    const payments = emp.payments || {};
    return Object.values(payments).some((p) => !p?.paid);
  });

  if (hasPending) {
    alert("⚠️ Hay empleados con semanas pendientes de pago");
  }
}, [employees, isAdmin]);

useEffect(() => {
  checkForUpdates();

  const interval = setInterval(() => {
    checkForUpdates();
  }, 60000); // cada 60 segundos

  return () => clearInterval(interval);
}, [checkForUpdates]);

  useEffect(() => {
  let unsubscribeEmployees = null;

  const initApp = async () => {
    try {
      const savedEmployeeSession = await Preferences.get({
        key: "employeeSession",
      });

      const savedAdminSession = await Preferences.get({
        key: "adminSession",
      });

      unsubscribeEmployees = onSnapshot(
        collection(db, "employees"),
        (querySnapshot) => {
          const data = querySnapshot.docs.map((d) => {
            const raw = d.data();
            const normalizedSchedule = (raw.schedule || []).map((shift) => ({
              ...shift,
              id: shift.id || createShiftId(),
            }));

            return {
              id: Number(d.id),
              ...raw,
              schedule: normalizedSchedule,
              payments: raw.payments || {},
            };
          });

          setEmployees(data);

          if (savedAdminSession.value) {
            setIsAdmin(true);
            setUser(null);
          } else if (savedEmployeeSession.value) {
            const parsed = JSON.parse(savedEmployeeSession.value);
            const found = data.find((emp) => emp.id === parsed.employeeId);

            if (found) {
              setUser(found);
              setIsAdmin(false);
            } else {
              setUser(null);
            }
          }

          setLoading(false);
        },
        (error) => {
          console.error("Error escuchando empleados:", error);
          setLoading(false);
        }
      );
    } catch (error) {
      console.error("Error iniciando app:", error);
      setLoading(false);
    }
  };

  initApp();

  return () => {
    if (unsubscribeEmployees) unsubscribeEmployees();
  };
}, []);

  const Modal = ({ children }) =>
    ReactDOM.createPortal(
      <div className="calendar-modal-backdrop">
        <div className="calendar-modal">{children}</div>
      </div>,
      document.body
    );

  const closeModal = () => {
    setCalendarFormDay(null);
    setCalendarFormMonth(null);
    setCalendarFormYear(null);
    setCalendarEmployeeId("");
    setCalendarStart("");
    setCalendarEnd("");
    setEditingFromCalendar(null);
  };

  const loginEmployee = async () => {
    if (!selectedLoginEmployee) return;

    if (employeePin === (selectedLoginEmployee.pin || "1234")) {
      setUser(selectedLoginEmployee);
      setIsAdmin(false);
      setActiveTab("calendar");

      await Preferences.set({
        key: "employeeSession",
        value: JSON.stringify({
          employeeId: selectedLoginEmployee.id,
          sessionType: "employee",
        }),
      });

      await Preferences.remove({ key: "adminSession" });

      setSelectedLoginEmployee(null);
      setEmployeePin("");
    } else {
      alert("PIN incorrecto");
    }
  };

  const loginAdmin = async () => {
  if (adminPin === ADMIN_PIN) {

    setIsAdmin(true);
    setUser(null);
    setActiveTab("calendar");
    setAdminPin("");

    await Preferences.set({
      key: "adminSession",
      value: JSON.stringify({
        sessionType: "admin",
      }),
    });

    await Preferences.set({
      key: "adminBiometricEnabled",
      value: "true",
    });

    await Preferences.remove({ key: "employeeSession" });

    await registerAdminPush();
  } else {
    alert("PIN del jefe incorrecto");
  }
};
  const logout = async () => {
    setUser(null);
    setIsAdmin(false);
    setActiveTab("calendar");
    setAdminPin("");
    setEmployeePin("");
    setSelectedLoginEmployee(null);
    setSettingsTab("employees");
    closeModal();

    await Preferences.remove({ key: "employeeSession" });
    await Preferences.remove({ key: "adminSession" });
  };

  const updateEmployeeColor = async (color) => {
  if (!selectedSettingsEmployeeId) return;

  const employee = employees.find(
    (emp) => emp.id === Number(selectedSettingsEmployeeId)
  );
  if (!employee) return;

  const updatedEmployee = {
    ...employee,
    color,
  };

  await saveSingleEmployee(updatedEmployee);
};

const isOpenShiftNow = (shift) => {
  if (!shift || !shift.start || shift.end) return false;

  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const shiftDate = new Date(
    Number(shift.year),
    Number(shift.month),
    Number(shift.day)
  );

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const toMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const nowMinutes = now.getHours() * 60 + now.getMinutes();
const startMinutes = toMinutes(shift.start);

// 👉 si es hoy, solo vale si ya ha empezado
if (sameDay(shiftDate, today) && nowMinutes >= startMinutes) {
  return true;
}

// 👉 si es de ayer, sigue abierto
if (sameDay(shiftDate, yesterday)) {
  return true;
}

return false;
};
  const hasOpenShift =
  !isAdmin &&
  user &&
  (user.schedule || []).some((shift) => isOpenShiftNow(shift));

  const addShift = async () => {
  if (savingShift) return;
  if (!calendarEmployeeId || !calendarStart || calendarFormDay === null) {
    return;
  }

  setSavingShift(true);

  try {
    const updated = employees.map((emp) => {
      if (emp.id !== Number(calendarEmployeeId)) return emp;

      const shiftData = {
        id: editingFromCalendar?.shiftId || createShiftId(),
        day: Number(calendarFormDay),
        month: calendarFormMonth,
        year: calendarFormYear,
        start: calendarStart,
        end: calendarEnd || null,
      };

      const newSchedule = [...(emp.schedule || [])];

      if (editingFromCalendar?.shiftId) {
        const i = newSchedule.findIndex(
          (s) => s.id === editingFromCalendar.shiftId
        );
        if (i !== -1) newSchedule[i] = shiftData;
        else newSchedule.push(shiftData);
      } else {
        newSchedule.push(shiftData);
      }

      return { ...emp, schedule: newSchedule };
    });

    await saveEmployees(updated);
    if (shouldBackup()) {
  await hacerBackup(updated);
  localStorage.setItem("lastBackup", Date.now());
}
    closeModal();
    showToast("Turno guardado ✔");
  } finally {
    setSavingShift(false);
  }
};

  const deleteShiftFromModal = async () => {
  if (savingShift) return;
  if (!editingFromCalendar?.shiftId) return;

  setSavingShift(true);

  try {
    const updated = employees.map((emp) => {
      if (emp.id !== editingFromCalendar.employeeId) return emp;

      return {
        ...emp,
        schedule: (emp.schedule || []).filter(
          (s) => s.id !== editingFromCalendar.shiftId
        ),
      };
    });

    await saveEmployees(updated);
    if (shouldBackup()) {
  await hacerBackup(updated);
  localStorage.setItem("lastBackup", Date.now());
}
    closeModal();
    showToast("Turno borrado 🗑️");
  } finally {
    setSavingShift(false);
  }
};



const deleteSelectedWeek = async () => {
  if (!isAdmin) return;
  if (!selectedWeekToDelete) {
    showToast("Selecciona una semana");
    return;
  }

  const [startStr, endStr] = selectedWeekToDelete.split("_");

const [startYear, startMonth, startDay] = startStr.split("-").map(Number);
const [endYear, endMonth, endDay] = endStr.split("-").map(Number);

const weekStart = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
const weekEnd = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

  const formatDate = (d) =>
    d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const ok = window.confirm(
    `¿Seguro que quieres borrar la semana ${formatDate(
      weekStart
    )} - ${formatDate(weekEnd)}?`
  );

  if (!ok) return;

  const updated = employees.map((emp) => {
    const filteredSchedule = (emp.schedule || []).filter((shift) => {
      const shiftDate = new Date(
        Number(shift.year),
        Number(shift.month),
        Number(shift.day)
      );

      return shiftDate < weekStart || shiftDate > weekEnd;
    });

    return {
      ...emp,
      schedule: filteredSchedule,
    };
  });

  setShowDeleteWeekModal(false);
setSelectedWeekToDelete("");

await saveEmployees(updated);

if (shouldBackup()) {
  await hacerBackup(updated);
  localStorage.setItem("lastBackup", Date.now());
}

showToast("Semana borrada 🗑️");
};



const getWeekRangeFromStart = (weekStart) => {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const copySpecificWeekToNext = async () => {
  if (!isAdmin || !selectedWeekActionStart) return;

  const { start: sourceWeekStart, end: sourceWeekEnd } =
    getWeekRangeFromStart(selectedWeekActionStart);

  const targetWeekStart = new Date(sourceWeekStart);
  targetWeekStart.setDate(targetWeekStart.getDate() + 7);

  const targetWeekEnd = new Date(sourceWeekEnd);
  targetWeekEnd.setDate(targetWeekEnd.getDate() + 7);

  const targetHasShifts = employees.some((emp) =>
    (emp.schedule || []).some((shift) => {
      const shiftDate = new Date(shift.year, shift.month, shift.day);
      return shiftDate >= targetWeekStart && shiftDate <= targetWeekEnd;
    })
  );

  if (targetHasShifts) {
    showToast("La semana siguiente ya tiene turnos");
    return;
  }

  const updated = employees.map((emp) => {
    const newSchedule = [...(emp.schedule || [])];

    const sourceShifts = (emp.schedule || []).filter((shift) => {
      const shiftDate = new Date(shift.year, shift.month, shift.day);
      return shiftDate >= sourceWeekStart && shiftDate <= sourceWeekEnd;
    });

    sourceShifts.forEach((shift) => {
      const originalDate = new Date(shift.year, shift.month, shift.day);
      const copiedDate = new Date(originalDate);
      copiedDate.setDate(copiedDate.getDate() + 7);

      newSchedule.push({
        ...shift,
        id: createShiftId(),
        day: copiedDate.getDate(),
        month: copiedDate.getMonth(),
        year: copiedDate.getFullYear(),
      });
    });

    return {
      ...emp,
      schedule: newSchedule,
    };
  });

  setShowWeekActionModal(false);
  setSelectedWeekActionStart(null);

  await saveEmployees(updated);

  if (shouldBackup()) {
    await hacerBackup(updated);
    localStorage.setItem("lastBackup", Date.now());
  }

  showToast("Semana copiada ✔");
};

const deleteWeekFromMonday = async () => {
  if (!isAdmin || !selectedWeekActionStart) return;

  const { start: weekStart, end: weekEnd } =
    getWeekRangeFromStart(selectedWeekActionStart);

  const formatDate = (d) =>
    d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const ok = window.confirm(
    `¿Seguro que quieres borrar la semana ${formatDate(
      weekStart
    )} - ${formatDate(weekEnd)}?`
  );

  if (!ok) return;

  const updated = employees.map((emp) => {
    const filteredSchedule = (emp.schedule || []).filter((shift) => {
      const shiftDate = new Date(
        Number(shift.year),
        Number(shift.month),
        Number(shift.day)
      );

      return shiftDate < weekStart || shiftDate > weekEnd;
    });

    return {
      ...emp,
      schedule: filteredSchedule,
    };
  });

  setShowWeekActionModal(false);
  setSelectedWeekActionStart(null);

  await saveEmployees(updated);

  if (shouldBackup()) {
    await hacerBackup(updated);
    localStorage.setItem("lastBackup", Date.now());
  }

  showToast("Semana borrada 🗑️");
};



  const finishShift = async () => {
  if (!user || finishingShift) return;

  setFinishingShift(true);

  try {
    const updated = employees.map((emp) => {
      if (emp.id !== user.id) return emp;

      const newSchedule = [...(emp.schedule || [])];
      const openShiftIndex = newSchedule.findIndex((shift) =>
        isOpenShiftNow(shift)
      );

      if (openShiftIndex !== -1) {
        newSchedule[openShiftIndex] = {
          ...newSchedule[openShiftIndex],
          end: new Date().toTimeString().slice(0, 5),
        };
      }

      return { ...emp, schedule: newSchedule };
    });

    await saveEmployees(updated);

    if (shouldBackup()) {
      await hacerBackup(updated);
      localStorage.setItem("lastBackup", Date.now());
    }

    showToast("Turno terminado ✔");
  } finally {
    setFinishingShift(false);
  }
};
  function getWeekKey(startDate, endDate) {
    const start = startDate.toISOString().slice(0, 10);
    const end = endDate.toISOString().slice(0, 10);
    return `${start}_${end}`;
  }

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekStart = getStartOfWeek(baseDate);
  const weekEnd = getEndOfWeek(baseDate);
  const weekKey = getWeekKey(weekStart, weekEnd);

  const baseDateEmployee = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + employeeWeekOffset * 7);
    return d;
  }, [employeeWeekOffset]);

  const employeeWeekStart = getStartOfWeek(baseDateEmployee);
  const employeeWeekEnd = getEndOfWeek(baseDateEmployee);

  const teamTotals = useMemo(() => {
    return employees.reduce(
      (acc, emp) => {
        const stats = calculateWeeklyHours(
          emp.schedule || [],
          weekStart,
          weekEnd
        );
        acc.hours += stats.normalHours + stats.extraHours;
        acc.pay += stats.totalPay;
        if (stats.normalHours > 0 || stats.extraHours > 0) acc.active += 1;
        return acc;
      },
      { hours: 0, pay: 0, active: 0 }
    );
  }, [employees, weekStart, weekEnd]);

  const markWeekAsPaid = async (employeeId) => {
  const employee = employees.find((emp) => emp.id === employeeId);
  if (!employee) return;

  const stats = calculateWeeklyHours(employee.schedule || [], weekStart, weekEnd);

  const updatedEmployee = {
    ...employee,
    payments: {
      ...(employee.payments || {}),
      [weekKey]: {
        paid: true,
        amount: stats.totalPay,
        paidAt: new Date().toISOString(),
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
      },
    },
  };

  await saveSingleEmployee(updatedEmployee);
};

  const unmarkWeekAsPaid = async (employeeId) => {
  const employee = employees.find((emp) => emp.id === employeeId);
  if (!employee) return;

  const newPayments = { ...(employee.payments || {}) };
  delete newPayments[weekKey];

  const updatedEmployee = {
    ...employee,
    payments: newPayments,
  };

  await saveSingleEmployee(updatedEmployee);
};

  const addEmployee = async () => {
    if (!newEmployeeName.trim()) return;

    const finalColor = selectedColor || getAvailableColor();

    const newEmp = {
      id: Date.now(),
      name: newEmployeeName.trim().toUpperCase(),
      pin: newEmployeePin.trim() || "1234",
      color: finalColor,
      schedule: [],
      payments: {},
    };

    await saveEmployees([...employees, newEmp]);

    setNewEmployeeName("");
    setNewEmployeePin("");
    setSelectedColor("");
  };

  const changeEmployeePin = async () => {
  if (!selectedSettingsEmployeeId || !newPinValue.trim()) return;

  const employee = employees.find(
    (emp) => emp.id === Number(selectedSettingsEmployeeId)
  );
  if (!employee) return;

  const updatedEmployee = {
    ...employee,
    pin: newPinValue.trim(),
  };

  await saveSingleEmployee(updatedEmployee);
  setNewPinValue("");
};

const restoreLatestBackup = async () => {
  if (restoringBackup) return;

  const ok = window.confirm(
    "¿Seguro que quieres restaurar la última copia de seguridad? Esto sobrescribirá los empleados actuales."
  );
  if (!ok) return;

  setRestoringBackup(true);

  try {
    const backupQuery = query(
      collection(db, "backups"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const backupSnap = await getDocs(backupQuery);

    if (backupSnap.empty) {
      showToast("No hay copias de seguridad");
      return;
    }

    const latestBackup = backupSnap.docs[0].data();
    const backupEmployees = latestBackup.employees || [];

    const currentEmployeesSnap = await getDocs(collection(db, "employees"));
    const batch = writeBatch(db);

    currentEmployeesSnap.forEach((empDoc) => {
      batch.delete(doc(db, "employees", empDoc.id));
    });

    backupEmployees.forEach((emp) => {
      const empId = String(emp.id);
      batch.set(doc(db, "employees", empId), emp);
    });

    await batch.commit();

    showToast("Copia restaurada correctamente ✔");
  } catch (error) {
    console.error("Error restaurando backup:", error);
    showToast("Error al restaurar copia");
  } finally {
    setRestoringBackup(false);
  }
};

  const deleteEmployee = async (employeeId) => {
  if (!window.confirm("¿Seguro que quieres borrar este empleado?")) return;

  const updated = employees.filter((emp) => emp.id !== employeeId);
  await saveEmployees(updated);
  if (shouldBackup()) {
  await hacerBackup(updated);
  localStorage.setItem("lastBackup", Date.now());
}
  await deleteDoc(doc(db, "employees", String(employeeId)));



    if (selectedSettingsEmployeeId === String(employeeId)) {
      setSelectedSettingsEmployeeId("");
      setNewPinValue("");
    }

    if (selectedTeamEmployeeId === employeeId) {
      setSelectedTeamEmployeeId(null);
    }
    showToast("Empleado borrado 🗑️");
  };

  const navItems = isAdmin
    ? [
        { key: "calendar", label: "Calendario", icon: CalendarDays },
        { key: "team", label: "Equipo", icon: Users },
        { key: "history", label: "Historial", icon: BarChart3 },
        { key: "settings", label: "Ajustes", icon: Settings },
      ]
    : [
        { key: "calendar", label: "Calendario", icon: CalendarDays },
        { key: "settings", label: "Mi cuenta", icon: UserRound },
      ];

  const renderCurrentTab = () => {
    if (activeTab === "calendar") {
      return (
        <>
        
          <section className="card calendar-panel">
            <div className="calendar-header">
              {isAdmin && (
  <div className="row" style={{ marginBottom: "8px" }}>
  
</div>
              )}

  <div>
  
  </div>
</div>

            <CalendarMonth
  employees={employees}
  user={user}
  isAdmin={isAdmin}
  onWeekLongPress={(weekStart) => {
    setSelectedWeekActionStart(weekStart);
    setShowWeekActionModal(true);
  }}
  onSelectEmployee={(e, shift) => {
  if (!isAdmin) return;

  if (shift?.day && !e) {
    setCalendarFormDay(shift.day);
    setCalendarFormMonth(shift.month);
    setCalendarFormYear(shift.year);
    setCalendarEmployeeId("");
    setCalendarStart("");
    setCalendarEnd("");
    setEditingFromCalendar(null);
    return;
  }

  if (e && shift) {
    setCalendarFormDay(shift.day);
    setCalendarFormMonth(shift.month);
    setCalendarFormYear(shift.year);
    setCalendarEmployeeId(String(e.id));
    setCalendarStart(shift.start || "");
    setCalendarEnd(shift.end || "");
    setEditingFromCalendar({
      employeeId: e.id,
      shiftId: shift.id,
    });
  }
}}
/>
          </section>

          {isAdmin && showDeleteWeekModal && (
  <Modal>
    <h3 className="calendar-modal-title">Borrar semana</h3>

    <select
      className="input"
      value={selectedWeekToDelete}
      onChange={(e) => setSelectedWeekToDelete(e.target.value)}
    >
      <option value="">Selecciona una semana</option>
      {getWeeksWithShifts().map((week) => (
        <option key={week.key} value={week.key}>
          {week.weekStart.toLocaleDateString("es-ES")} -{" "}
          {week.weekEnd.toLocaleDateString("es-ES")}
        </option>
      ))}
    </select>

    <div className="row">
      <button className="danger-btn" onClick={deleteSelectedWeek}>
        Borrar
      </button>

      <button
        className="secondary-btn"
        onClick={() => {
          setShowDeleteWeekModal(false);
          setSelectedWeekToDelete("");
        }}
      >
        Cancelar
      </button>
    </div>
  </Modal>
)}

{showSwapModal && (
  <Modal>
    <h3 className="calendar-modal-title">
      ¿Con qué turno quieres intercambiar?
    </h3>

    <div style={{ marginTop: "10px" }}>
      {swapCandidates.length === 0 && (
        <div>No hay otros turnos ese día</div>
      )}

      {swapCandidates.map((s) => (
        <button
          key={s.id}
          className="secondary-btn"
          style={{ width: "100%", marginBottom: "8px" }}
          onClick={() => handleSwapFromList(s)}
        >
          {s.employeeName} · {s.start}
          {s.end ? ` - ${s.end}` : ""}
        </button>
      ))}
    </div>

    <button
      className="secondary-btn"
      style={{ marginTop: "10px", width: "100%" }}
      onClick={() => {
        setShowSwapModal(false);
        setSwapCandidates([]);
        setBaseSwapShift(null);
      }}
    >
      Cancelar
    </button>
  </Modal>
)}
{isAdmin && showWeekActionModal && (
  <Modal>
    <h3 className="calendar-modal-title">Acciones de semana</h3>

    <div className="row">
      <button className="secondary-btn" onClick={copySpecificWeekToNext}>
        Copiar semana
      </button>

      <button className="danger-btn" onClick={deleteWeekFromMonday}>
        Borrar semana
      </button>
    </div>

    <div className="row" style={{ marginTop: "10px" }}>
      <button
        className="secondary-btn"
        onClick={() => {
          setShowWeekActionModal(false);
          setSelectedWeekActionStart(null);
        }}
      >
        Cancelar
      </button>
    </div>
  </Modal>
)}

          {isAdmin && calendarFormDay !== null && (
            <Modal>
              <h3 className="calendar-modal-title">
                {editingFromCalendar ? "Editar turno" : "Nuevo turno"} · día{" "}
                {calendarFormDay}
              </h3>

              <select
                className="input"
                value={calendarEmployeeId}
                onChange={(e) => setCalendarEmployeeId(e.target.value)}
              >
                <option value="">Selecciona empleado</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>

              <div className="row">
                <input
                  type="time"
                  className="input"
                  value={calendarStart}
                  onChange={(e) => setCalendarStart(e.target.value)}
                />

                <input
                  type="time"
                  className="input"
                  value={calendarEnd}
                  onChange={(e) => setCalendarEnd(e.target.value)}
                />
              </div>

              <div className="row">
                <button
  className="primary-btn"
  onClick={addShift}
  disabled={savingShift}
>
  {savingShift ? "Guardando..." : "Guardar turno"}
</button>

                <button className="secondary-btn" onClick={closeModal}>
                  Cancelar
                </button>
                {editingFromCalendar && (
  <button
    className="danger-btn"
    style={{ marginTop: "12px", width: "100%" }}
    onClick={deleteShiftFromModal}
    disabled={savingShift}
  >
    {savingShift ? "Borrando..." : "Borrar turno"}
  </button>
)}
              </div>

              {editingFromCalendar && (
                <>

                <button
  className="secondary-btn"
  style={{ marginTop: "12px", width: "100%" }}
  onClick={() => {
    const { employeeId, shiftId } = editingFromCalendar;

    let selectedShift = null;

    employees.forEach((emp) => {
      (emp.schedule || []).forEach((shift) => {
        if (emp.id === employeeId && shift.id === shiftId) {
          selectedShift = { ...shift, employeeId };
        }
      });
    });

    if (!selectedShift) return;

    const candidates = [];

    employees.forEach((emp) => {
      (emp.schedule || []).forEach((shift) => {
        const sameDay =
          shift.day === selectedShift.day &&
          shift.month === selectedShift.month &&
          shift.year === selectedShift.year;

        const notSame =
          !(emp.id === employeeId && shift.id === shiftId);

        if (sameDay && notSame) {
          candidates.push({
            ...shift,
            employeeId: emp.id,
            employeeName: emp.name,
          });
        }
      });
    });

    setBaseSwapShift(selectedShift);
    setSwapCandidates(candidates);
    setShowSwapModal(true);

    closeModal();
  }}
>
  Intercambiar turno
</button>
</>

              )}
            </Modal>
          )}
        </>
      );
    }

    if (activeTab === "team" && isAdmin) {
      return (
        <section className="card">
          <h2 className="section-title">
            Equipo · {weekStart.toLocaleDateString()} -{" "}
            {weekEnd.toLocaleDateString()}
          </h2>

          <div className="row week-nav">
            <button
              className="secondary-btn nav-week-btn"
              onClick={() => setWeekOffset((w) => w - 1)}
            >
              <ChevronLeft size={18} />
              <span>Semana anterior</span>
            </button>

            <button
              className="secondary-btn nav-week-btn"
              disabled={weekOffset === 0}
              onClick={() => setWeekOffset((w) => Math.min(w + 1, 0))}
            >
              <span>Semana actual</span>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="shift-list">
            {employees.map((emp) => {
              const stats = calculateWeeklyHours(
                emp.schedule || [],
                weekStart,
                weekEnd
              );
              const isPaid = emp.payments?.[weekKey]?.paid || false;
              const isSelected = selectedTeamEmployeeId === emp.id;

              return (
                <div key={emp.id}>
                  <div
  className="shift-item team-item-compact"
  onClick={() =>
    setSelectedTeamEmployeeId((prev) =>
      prev === emp.id ? null : emp.id
    )
  }
  style={{
    cursor: "pointer",
    border: isSelected
      ? `2px solid ${emp.color}`
      : "1px solid #e5e7eb",
    background: isSelected ? "#fff7ed" : "#f9fafb",
    boxShadow: isSelected
      ? "0 0 0 3px rgba(245, 158, 11, 0.12)"
      : "none",
  }}
>
  <div className="team-item-status-wrap">
    <div
      className="status-pill team-item-status"
      style={{
        color: isPaid ? "#16a34a" : "#f59e0b",
        background: isPaid ? "#dcfce7" : "#fef3c7",
      }}
    >
      {isPaid ? "Pagado" : "Pendiente"}
    </div>
  </div>

  <div className="shift-item-name">
    <span
      className="employee-dot"
      style={{ backgroundColor: emp.color }}
    />
    <strong>{emp.name}</strong>
  </div>

  <div>
    {formatHours(stats.normalHours)} | {formatHours(stats.extraHours)}
  </div>

  <div className="shift-item-pay">
    {stats.totalPay.toFixed(2)} €
  </div>
</div>

                  {isSelected && (
                    <div className="card inner-card" style={{ marginTop: "10px" }}>
                      <h3 className="subsection-title">Resumen de {emp.name}</h3>

                      <div className="stats-grid">
                        <div className="stat-box">
                          <span className="stat-label">Normales</span>
                          <strong className="stat-value">
                            {formatHours(stats.normalHours)}
                          </strong>
                        </div>

                        <div className="stat-box">
                          <span className="stat-label">Extras</span>
                          <strong className="stat-value">
                            {formatHours(stats.extraHours)}
                          </strong>
                        </div>

                        <div className="stat-box highlighted">
                          <span className="stat-label">Total</span>
                          <strong className="stat-value">
                            {stats.totalPay.toFixed(2)} €
                          </strong>
                        </div>
                      </div>

                      <div style={{ marginTop: "16px" }}>
                        {isPaid ? (
                          <>
                            <div
                              style={{
                                marginBottom: "10px",
                                color: "#16a34a",
                                fontWeight: 700,
                              }}
                            >
                              ✔ Semana pagada
                            </div>

                            <button
                              className="secondary-btn"
                              onClick={() => unmarkWeekAsPaid(emp.id)}
                            >
                              Quitar pago
                            </button>
                          </>
                        ) : (
                          <button
                            className="primary-btn"
                            onClick={() => markWeekAsPaid(emp.id)}
                          >
                            Marcar como pagado
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="stats-grid" style={{ marginTop: "16px" }}>
            <div className="stat-box">
              <span className="stat-label">Horas del bar</span>
              <strong className="stat-value">
                {teamTotals.hours.toFixed(2)} h
              </strong>
            </div>

            <div className="stat-box">
              <span className="stat-label">Empleados con horas</span>
              <strong className="stat-value">{teamTotals.active}</strong>
            </div>

            <div className="stat-box highlighted">
              <span className="stat-label">Total semanal del bar</span>
              <strong className="stat-value">
                {teamTotals.pay.toFixed(2)} €
              </strong>
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === "history" && isAdmin) {
      return (
        <section className="card">
          <h2 className="section-title">Histórico de pagos</h2>

          {employees.map((emp) => {
  const payments = emp.payments || {};
  const weeks = Object.keys(payments);

  const hasPending = weeks.some((w) => !payments[w]?.paid);
  const isSelected = selectedHistoryEmployeeId === emp.id;

  return (
    <div key={emp.id}>
      <div
        className="shift-item"
        onClick={() =>
          setSelectedHistoryEmployeeId((prev) =>
            prev === emp.id ? null : emp.id
          )
        }
        style={{
          cursor: "pointer",
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
        }}
      >
        <strong>{emp.name}</strong>

        <div
          className="status-pill"
          style={{
            color: hasPending ? "#f59e0b" : "#16a34a",
            background: hasPending ? "#fef3c7" : "#dcfce7",
          }}
        >
          {hasPending ? "Pendiente" : "Pagado"}
        </div>
      </div>

      {isSelected && (
        <div className="card inner-card">
          {weeks
            .sort()
            .reverse()
            .map((weekKey) => {
              const data = payments[weekKey];

              return (
                <div key={weekKey} className="shift-item">
                  <strong>{weekKey.replace("_", " → ")}</strong>

                  <div>{Number(data.amount || 0).toFixed(2)} €</div>

                  <div className="status-pill">
                    {data?.paid ? "✔ Pagado" : "Pendiente"}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
})}
        </section>
      );
    }

    if (activeTab === "settings") {
      return (
        <section className="card">
          <h2 className="section-title">{isAdmin ? "Ajustes" : "Mi cuenta"}</h2>

          {isAdmin ? (
            <>
              <div className="settings-tabs">
                <button
                  className={`secondary-btn ${
                    settingsTab === "employees" ? "active" : ""
                  }`}
                  onClick={() => setSettingsTab("employees")}
                >
                  Empleados
                </button>

                <button
                  className={`secondary-btn ${
                    settingsTab === "pins" ? "active" : ""
                  }`}
                  onClick={() => setSettingsTab("pins")}
                >
                  PINs
                </button>
              </div>

              {settingsTab === "employees" && (
                <>
                  <h3 className="subsection-title">Añadir empleado</h3>

                  <input
                    className="input"
                    placeholder="Nombre del empleado"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                  />

                  <input
                    className="input"
                    placeholder="PIN inicial"
                    value={newEmployeePin}
                    onChange={(e) => setNewEmployeePin(e.target.value)}
                  />

                  <div style={{ marginBottom: "10px" }}>
                    <p style={{ fontWeight: 700, marginBottom: "6px" }}>
                      Color del empleado
                    </p>

                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                    >
                      {COLOR_PALETTE.map((color) => (
                        <div
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor: color,
                            cursor: "pointer",
                            border:
                              selectedColor === color
                                ? "3px solid #111827"
                                : "2px solid #e5e7eb",
                            transform:
                              selectedColor === color
                                ? "scale(1.1)"
                                : "scale(1)",
                            transition: "0.2s",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <button className="primary-btn" onClick={addEmployee}>
                    Crear empleado
                  </button>

                  <h3 className="subsection-title">Cambiar color</h3>

<select
  className="input"
  value={selectedSettingsEmployeeId}
  onChange={(e) => setSelectedSettingsEmployeeId(e.target.value)}
>
  <option value="">Selecciona empleado</option>
  {employees.map((emp) => (
    <option key={emp.id} value={emp.id}>
      {emp.name}
    </option>
  ))}
</select>

<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
  {COLOR_PALETTE.map((color) => (
    <div
      key={color}
      onClick={() => updateEmployeeColor(color)}
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        backgroundColor: color,
        cursor: "pointer",
      }}
    />
  ))}
</div>

                  <h3 className="subsection-title">Borrar empleado</h3>

<button
  className="secondary-btn"
  onClick={() => setShowDeleteEmployees((prev) => !prev)}
>
  {showDeleteEmployees ? "Ocultar" : "Ver empleados"}
</button>

{showDeleteEmployees && (
  <div className="shift-list">
    {employees.map((emp) => (
      <div key={emp.id} className="shift-item">
        <strong>{emp.name}</strong>

        <button
          className="danger-btn"
          onClick={() => deleteEmployee(emp.id)}
        >
          Borrar
        </button>
      </div>
    ))}
  </div>
)}
<h3 className="subsection-title" style={{ marginTop: "20px" }}>
  Copia de seguridad
</h3>

<button
  className="secondary-btn"
  onClick={restoreLatestBackup}
  disabled={restoringBackup}
>
  {restoringBackup ? "Restaurando..." : "Restaurar última copia"}
</button>
  </>
)}

              {settingsTab === "pins" && (
                <>
                  <h3 className="subsection-title">Cambiar PIN</h3>

                  <select
                    className="input"
                    value={selectedSettingsEmployeeId}
                    onChange={(e) => {
                      setSelectedSettingsEmployeeId(e.target.value);
                      const emp = employees.find(
                        (x) => x.id === Number(e.target.value)
                      );
                      setNewPinValue(emp?.pin || "");
                    }}
                  >
                    <option value="">Selecciona empleado</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>

                  <input
                    className="input"
                    placeholder="Nuevo PIN"
                    value={newPinValue}
                    onChange={(e) => setNewPinValue(e.target.value)}
                  />

                  <button className="secondary-btn" onClick={changeEmployeePin}>
                    Guardar PIN
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {hasOpenShift ? (
                <button
  onClick={finishShift}
  className="primary-btn"
  disabled={finishingShift}
>
  {finishingShift ? "Terminando turno..." : "Terminar turno"}
</button>
              ) : (
                <div className="empty-box">
                  No tienes ningún turno activo ahora mismo.
                </div>
              )}

              {user && (
                <div className="card inner-card">
                  <div
                    className="row"
                    style={{ marginBottom: "10px", alignItems: "center" }}
                  >
                    <button
                      className="secondary-btn"
                      onClick={() => setEmployeeWeekOffset((w) => w - 1)}
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <span style={{ fontWeight: 700 }}>
                      {employeeWeekStart.toLocaleDateString()} -{" "}
                      {employeeWeekEnd.toLocaleDateString()}
                    </span>

                    <button
                      className="secondary-btn"
                      disabled={employeeWeekOffset === 0}
                      onClick={() =>
                        setEmployeeWeekOffset((w) => Math.min(w + 1, 0))
                      }
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <h3 className="subsection-title">Mi resumen semanal</h3>

                  {(() => {
                    const stats = calculateWeeklyHours(
                      user.schedule || [],
                      employeeWeekStart,
                      employeeWeekEnd
                    );

                    return (
                      <div className="stats-grid">
                        <div className="stat-box">
                          <span className="stat-label">Normales</span>
                          <strong className="stat-value">
                            {formatHours(stats.normalHours)}
                          </strong>
                        </div>

                        <div className="stat-box">
                          <span className="stat-label">Extras</span>
                          <strong className="stat-value">
                            {formatHours(stats.extraHours)}
                          </strong>
                        </div>

                        <div className="stat-box highlighted">
                          <span className="stat-label">Total</span>
                          <strong className="stat-value">
                            {stats.totalPay.toFixed(2)} €
                          </strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </section>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="login-screen">
        <div className="brand-card">
          <img src={logo} alt="Kiosco Bodegón" className="brand-logo" />
          <h1 className="brand-title">Kiosco Bodegón TEST</h1>
          <p className="brand-subtitle">Cargando datos…</p>
        </div>
      </div>
    );
  }

  if (!user && !isAdmin) {
    return (
      <div className="login-screen">
        <div className="brand-card">
          <img src={logo} alt="Kiosco Bodegón" className="brand-logo" />
          <h1 className="brand-title">Kiosco Bodegón</h1>
          <p className="brand-subtitle">Acceso del equipo</p>
        </div>

        <div className="card">
          <h2 className="section-title">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Shield size={18} />
              Entrada jefe
            </span>
          </h2>

          <input
            className="input"
            type="password"
            placeholder="PIN del jefe"
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
          />

          <button className="primary-btn" onClick={loginAdmin}>
            Entrar como jefe
          </button>

          <button
            className="secondary-btn"
            style={{ marginTop: "10px", width: "100%" }}
            onClick={loginAdminWithBiometric}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <Fingerprint size={18} />
              Entrar con huella
            </span>
          </button>
        </div>

        <div className="card">
          <h2 className="section-title">Entrar</h2>

          <div className="login-grid">
            {employees.map((e) => {
              const isSelected = selectedLoginEmployee?.id === e.id;

              return (
                <div key={e.id}>
                  <button
                    className="employee-login-btn"
                    onClick={() => {
                      setSelectedLoginEmployee((prev) =>
                        prev?.id === e.id ? null : e
                      );
                      setEmployeePin("");
                    }}
                  >
                    <span
                      className="employee-dot"
                      style={{ backgroundColor: e.color }}
                    />
                    {e.name}
                  </button>

                  {isSelected && (
                    <div className="card inner-card" style={{ marginTop: "10px" }}>
                      <h3 className="subsection-title">PIN de {e.name}</h3>

                      <input
                        type="password"
                        className="input"
                        placeholder="Introduce tu PIN"
                        value={employeePin}
                        onChange={(ev) => setEmployeePin(ev.target.value)}
                      />

                      <div className="row">
                        <button className="primary-btn" onClick={loginEmployee}>
                          Entrar
                        </button>

                        <button
                          className="secondary-btn"
                          onClick={() => {
                            setSelectedLoginEmployee(null);
                            setEmployeePin("");
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
  <div className="app-screen">
    <div className="topbar">
      <div className="topbar-left">
        <img src={logo} className="topbar-logo" alt="logo" />
        <div>
          <h2 className="topbar-title">Kiosco Bodegón</h2>
          <p className="topbar-user">{isAdmin ? "Modo jefe" : user?.name}</p>
        </div>
      </div>

      {updateAvailable && (
        <div className="update-banner">
          <span>Hay una nueva versión disponible.</span>
          <button className="update-btn" onClick={reloadApp}>
            Actualizar
          </button>
        </div>
      )}

      <button
        className="secondary-btn"
        onClick={logout}
        aria-label="Cerrar sesión"
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <LogOut size={18} />
          <span className="hide-mobile-label">Salir</span>
        </span>
      </button>
    </div>

    <AnimatePresence mode="wait">
      <motion.div
        key={`${activeTab}-${settingsTab}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.22 }}
        className="content"
      >
        {renderCurrentTab()}
      </motion.div>
    </AnimatePresence>

    <div className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.key;

        return (
          <button
            key={item.key}
            className={`bottom-nav-btn ${isActive ? "active" : ""}`}
            onClick={() => {
              vibrate();
              setActiveTab(item.key);
            }}
          >
            <Icon size={20} className="bottom-nav-icon" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>

    {toast && (
      <div className="toast">
        {toast}
      </div>
    )}
  </div>
);
}


export default App;