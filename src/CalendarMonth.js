import { useMemo, useState } from "react";

function CalendarMonth({ employees = [], user = null, onSelectEmployee }) {
  const today = new Date();

  const [currentDate, setCurrentDate] = useState(new Date());

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthLabel = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).toLocaleString("es-ES", {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth, currentYear]);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const calendarDays = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      month: prevMonth,
      year: prevMonthYear,
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true,
    });
  }

  const totalCells = Math.ceil(calendarDays.length / 7) * 7;
  const extraCells = totalCells - calendarDays.length;

  for (let day = 1; day <= extraCells; day++) {
    calendarDays.push({
      day,
      month: nextMonth,
      year: nextMonthYear,
      isCurrentMonth: false,
    });
  }

  const getShiftsForDay = (dayObj) => {
    return employees.flatMap((emp) =>
      (emp.schedule || [])
        .filter(
          (shift) =>
            Number(shift.day) === Number(dayObj.day) &&
            Number(shift.month) === Number(dayObj.month) &&
            Number(shift.year) === Number(dayObj.year)
        )
        .map((shift, index) => ({
          employee: emp,
          shift,
          index,
        }))
    );
  };

  return (
    <div className="calendar-wrapper">
      <div className="month-nav">
  <button
    className="month-btn"
    onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
  >
    ←
  </button>

  <div className="month-label">{monthLabel}</div>

  <button
    className="month-btn"
    onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
  >
    →
  </button>
</div>

      <div className="calendar-scroll">
        <div className="calendar-weekdays">
          {weekDays.map((d) => (
            <div key={d} className="calendar-weekday">
              {d}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((dayObj, index) => {
            const shifts = getShiftsForDay(dayObj);

            const isToday =
              dayObj.day === today.getDate() &&
              dayObj.month === today.getMonth() &&
              dayObj.year === today.getFullYear();

            return (
              <div
                key={index}
                className={`calendar-cell ${
                  !dayObj.isCurrentMonth ? "calendar-other-month" : ""
                }`}
                style={
                  isToday
                    ? {
                        border: "2px solid #f59e0b",
                        boxShadow: "0 0 0 3px rgba(245, 158, 11, 0.12)",
                      }
                    : undefined
                }
                onClick={() => {
                  onSelectEmployee?.(null, {
                    day: dayObj.day,
                    month: dayObj.month,
                    year: dayObj.year,
                  });
                }}
              >
                <div className="calendar-day-number">{dayObj.day}</div>

                {shifts.length > 0 && (
                  <div className="calendar-shifts">
                    {shifts.map(({ employee, shift, index: shiftIndex }) => {
                      const isMine = user && user.id === employee.id;

                      return (
                        <div
                          key={`${employee.id}-${shiftIndex}`}
                          className="calendar-shift"
                          style={{
                            backgroundColor: employee.color,
                            outline: isMine ? "2px solid #111827" : "none",
                          }}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onSelectEmployee?.(employee, shift, shiftIndex);
                          }}
                        >
                          <span className="calendar-shift-name">
                            {employee.name}
                          </span>
                          <span className="calendar-shift-time">
                            {shift.start}
                            {shift.end ? ` - ${shift.end}` : ""}
                          </span>
                        </div>
                      );
                    })}
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

export default CalendarMonth;