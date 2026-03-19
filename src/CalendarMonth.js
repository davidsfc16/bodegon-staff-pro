import React from "react";
import EmployeeCard from "./EmployeeCard";

function CalendarMonth({ employees }) {
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="calendar-month">
      {daysInMonth.map((day) => (
        <div key={day} className="calendar-day">
          <span className="day-number">{day}</span>
          {employees.map((e) => {
            const shift = e.schedule.find((s) => s.day === day);
            return shift ? (
              <EmployeeCard key={e.id} employee={e} shift={shift} />
            ) : null;
          })}
        </div>
      ))}
    </div>
  );
}

export default CalendarMonth;