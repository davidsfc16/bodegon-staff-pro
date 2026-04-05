import { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { Preferences } from "@capacitor/preferences";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
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
  getEndOfWeek,
  getStartOfWeek,
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

  const formatHours = (hoursDecimal) => {
    const totalMinutes = Math.round(hoursDecimal * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

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

  const vibrate = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const getAvailableColor = () => {
    const usedColors = employees.map((e) => e.color);
    const available = COLOR_PALETTE.filter((c) => !usedColors.includes(c));

    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }

    return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
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

  const loginAdminWithBiometric = async () => {
    try {
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
    } catch (error) {
      alert("No se pudo verificar la huella");
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "employees"));
        const data = querySnapshot.docs.map((d) => ({
          id: Number(d.id),
          ...d.data(),
          schedule: d.data().schedule || [],
          payments: d.data().payments || {},
        }));

        setEmployees(data);

        const savedEmployeeSession = await Preferences.get({
          key: "employeeSession",
        });

        const savedAdminSession = await Preferences.get({
          key: "adminSession",
        });

        if (savedAdminSession.value) {
          setIsAdmin(true);
          setUser(null);
          setActiveTab("calendar");
          return;
        }

        if (savedEmployeeSession.value) {
          const parsed = JSON.parse(savedEmployeeSession.value);
          const found = data.find((emp) => emp.id === parsed.employeeId);

          if (found) {
            setUser(found);
            setIsAdmin(false);
            setActiveTab("calendar");
          }
        }
      } catch (error) {
        console.error("Error cargando empleados:", error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
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

      await Preferences.remove({ key: "employeeSession" });
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

  const isTodayShift = (shift) => {
    const now = new Date();
    return (
      shift.day === now.getDate() &&
      shift.month === now.getMonth() &&
      shift.year === now.getFullYear()
    );
  };

  const hasShiftStarted = (shift) => {
    if (!shift.start) return false;

    const now = new Date();
    const [h, m] = shift.start.split(":").map(Number);
    const shiftMinutes = h * 60 + m;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return nowMinutes >= shiftMinutes;
  };

  const hasOpenShift =
    !isAdmin &&
    user &&
    (user.schedule || []).some(
      (shift) => isTodayShift(shift) && hasShiftStarted(shift) && !shift.end
    );

  const addShift = async () => {
    if (!calendarEmployeeId || !calendarStart || calendarFormDay === null) {
      return;
    }

    const updated = employees.map((emp) => {
      if (emp.id !== Number(calendarEmployeeId)) return emp;

      const shiftData = {
        day: Number(calendarFormDay),
        month: calendarFormMonth,
        year: calendarFormYear,
        start: calendarStart,
        end: calendarEnd || null,
      };

      const newSchedule = [...(emp.schedule || [])];

      if (
        editingFromCalendar &&
        editingFromCalendar.employeeId === emp.id &&
        editingFromCalendar.index !== null
      ) {
        newSchedule[editingFromCalendar.index] = shiftData;
      } else {
        newSchedule.push(shiftData);
      }

      return {
        ...emp,
        schedule: newSchedule,
      };
    });

    await saveEmployees(updated);
    closeModal();
  };

  const deleteShiftFromModal = async () => {
    if (!editingFromCalendar) return;

    const updated = employees.map((emp) => {
      if (emp.id !== editingFromCalendar.employeeId) return emp;

      return {
        ...emp,
        schedule: (emp.schedule || []).filter(
          (_, index) => index !== editingFromCalendar.index
        ),
      };
    });

    await saveEmployees(updated);
    closeModal();
  };

  const finishShift = async () => {
    if (!user) return;

    const updated = employees.map((emp) => {
      if (emp.id !== user.id) return emp;

      const newSchedule = [...(emp.schedule || [])];
      const openShiftIndex = newSchedule.findIndex(
        (shift) => isTodayShift(shift) && hasShiftStarted(shift) && !shift.end
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
    const updated = employees.map((emp) => {
      if (emp.id !== employeeId) return emp;

      const stats = calculateWeeklyHours(emp.schedule || [], weekStart, weekEnd);

      return {
        ...emp,
        payments: {
          ...(emp.payments || {}),
          [weekKey]: {
            paid: true,
            amount: stats.totalPay,
            paidAt: new Date().toISOString(),
          },
        },
      };
    });

    await saveEmployees(updated);
  };

  const unmarkWeekAsPaid = async (employeeId) => {
    const updated = employees.map((emp) => {
      if (emp.id !== employeeId) return emp;

      const newPayments = { ...(emp.payments || {}) };
      delete newPayments[weekKey];

      return {
        ...emp,
        payments: newPayments,
      };
    });

    await saveEmployees(updated);
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

    const updated = employees.map((emp) =>
      emp.id === Number(selectedSettingsEmployeeId)
        ? { ...emp, pin: newPinValue.trim() }
        : emp
    );

    await saveEmployees(updated);
    setNewPinValue("");
  };

  const deleteEmployee = async (employeeId) => {
    if (!window.confirm("¿Seguro que quieres borrar este empleado?")) return;

    const updated = employees.filter((emp) => emp.id !== employeeId);
    await saveEmployees(updated);
    await deleteDoc(doc(db, "employees", String(employeeId)));

    if (selectedSettingsEmployeeId === String(employeeId)) {
      setSelectedSettingsEmployeeId("");
      setNewPinValue("");
    }

    if (selectedTeamEmployeeId === employeeId) {
      setSelectedTeamEmployeeId(null);
    }
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
              <div>
                <h2 className="section-title">Calendario del equipo</h2>
                <span className="calendar-note">Vista general del bar</span>
              </div>
            </div>

            <CalendarMonth
              employees={employees}
              user={user}
              onSelectEmployee={(e, shift, index) => {
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
                    index,
                  });
                }
              }}
            />
          </section>

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
                disabled={!!editingFromCalendar}
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
                <button className="primary-btn" onClick={addShift}>
                  Guardar turno
                </button>

                <button className="secondary-btn" onClick={closeModal}>
                  Cancelar
                </button>
              </div>

              {editingFromCalendar && (
                <button
                  className="danger-btn"
                  style={{ marginTop: "12px", width: "100%" }}
                  onClick={deleteShiftFromModal}
                >
                  Borrar turno
                </button>
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
                    className="shift-item"
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
                    <div className="shift-item-name">
                      <span
                        className="employee-dot"
                        style={{ backgroundColor: emp.color }}
                      />
                      <strong>{emp.name}</strong>
                    </div>

                    <div>
                      {formatHours(stats.normalHours)} |{" "}
                      {formatHours(stats.extraHours)}
                    </div>

                    <div className="shift-item-pay">
                      {stats.totalPay.toFixed(2)} €
                    </div>

                    <div
                      className="status-pill"
                      style={{
                        color: isPaid ? "#16a34a" : "#f59e0b",
                        background: isPaid ? "#dcfce7" : "#fef3c7",
                      }}
                    >
                      {isPaid ? "Pagado" : "Pendiente"}
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
            const weeks = Object.keys(payments).sort().reverse();

            if (weeks.length === 0) return null;

            return (
              <div key={emp.id} style={{ marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "8px" }}>{emp.name}</h3>

                <div className="shift-list">
                  {weeks.map((savedWeekKey) => {
                    const data = payments[savedWeekKey];

                    return (
                      <div key={savedWeekKey} className="shift-item">
                        <div>
                          <strong>{savedWeekKey.replace("_", " → ")}</strong>
                          <div className="shift-time">
                            Pagado el:{" "}
                            {data?.paidAt
                              ? new Date(data.paidAt).toLocaleDateString()
                              : "-"}
                          </div>
                        </div>

                        <div className="shift-item-pay">
                          {Number(data.amount || 0).toFixed(2)} €
                        </div>

                        <div
                          className="status-pill"
                          style={{
                            color: "#16a34a",
                            background: "#dcfce7",
                          }}
                        >
                          ✔ Pagado
                        </div>
                      </div>
                    );
                  })}
                </div>
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

                  <h3 className="subsection-title" style={{ marginTop: "24px" }}>
                    Borrar empleado
                  </h3>

                  <div className="shift-list">
                    {employees.map((emp) => (
                      <div key={emp.id} className="shift-item">
                        <div className="shift-item-name">
                          <span
                            className="employee-dot"
                            style={{ backgroundColor: emp.color }}
                          />
                          <strong>{emp.name}</strong>
                        </div>

                        <button
                          className="danger-btn"
                          onClick={() => deleteEmployee(emp.id)}
                        >
                          Borrar
                        </button>
                      </div>
                    ))}
                  </div>
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
                <button onClick={finishShift} className="primary-btn">
                  Terminar turno
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
          <h1 className="brand-title">Kiosco Bodegón</h1>
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
    </div>
  );
}

export default App;