import React, { useState } from "react";

function CalendarMonth({ employees }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div>
      <h2 className="title">Calendario</h2>

      <div className="calendar-month">
        {daysInMonth.map((day) => (
          <div
            key={day}
            className={`calendar-day ${selectedDay === day ? "active-day" : ""}`}
            onClick={() => setSelectedDay(day)}
          >
            <span className="day-number">{day}</span>

            {employees.map((e) => {
              const shift = e.schedule.find((s) => s.day === day);
              return shift ? (
                <div key={e.id} className="mini-shift">
                  {shift.start}
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