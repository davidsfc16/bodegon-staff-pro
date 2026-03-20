
const isWorkingNow = (shift) => {
  if (!shift.end) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const [startH, startM] = shift.start.split(":").map(Number);
  const [endH, endM] = shift.end.split(":").map(Number);

  const current = currentHour + currentMin / 60;
  const start = startH + startM / 60;
  const end = endH + endM / 60;

  return current >= start && current <= end;
};
import React, { useState } from "react";

function CalendarMonth({ employees }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const monthName = today.toLocaleString("es-ES", { month: "long" });

const daysInMonth = new Date(year, month + 1, 0).getDate();
const firstDay = new Date(year, month, 1).getDay(); // 0 = domingo

const calendarDays = [];

// Espacios vacíos antes del día 1
for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
  calendarDays.push(null);
}

// Días reales
for (let i = 1; i <= daysInMonth; i++) {
  calendarDays.push(i);
}

  return (
    <div>
      <h2 className="title">{monthName.toLocaleUpperCase()}</h2>

      <div className="calendar-month">
        {calendarDays.map((day, index) => (
          <div
          key={index}
          className={`calendar-day ${selectedDay === day ? "active-day" : ""}`}
  onClick={() => day && setSelectedDay(day)}
>
  {day && <span className="day-number">{day}</span>}

  {day &&
    employees.map((e) => {
      const shift = e.schedule.find((s) => s.day === day);
      return shift ? (
        <div
          key={e.id}
          className={`mini-shift ${isWorkingNow(shift) ? "working" : ""}`}
          style={{ background: e.color }}
        >
          {e.name} - {shift.start}
        </div>
      ) : null;
    })}
</div>
        ))}
      </div>

      {selectedDay && (
        <div className="day-details">
          <h3>Día {selectedDay}</h3>
          {employees.map((e) => {
            const shift = e.schedule.find((s) => s.day === selectedDay);
            return shift ? (
              <div key={e.id} className="detail-card">
                <span>{e.name}</span>
                <span>{shift.start} - {shift.end || "Libre salida"}</span>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export default CalendarMonth;