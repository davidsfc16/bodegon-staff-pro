import { useEffect, useRef, useState } from "react";

function CalendarMonth({
  employees = [],
  user = null,
  onSelectEmployee,
  isAdmin = false,
  onWeekLongPress,
}) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date());

  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const todayRef = useRef(null);
  const longPressTimerRef = useRef(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

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
    return employees
      .flatMap((emp) =>
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
      )
      .sort((a, b) => {
        const toMinutes = (time) => {
          if (!time) return 9999;
          const [h, m] = String(time).split(":").map(Number);
          return h * 60 + m;
        };

        return toMinutes(a.shift?.start) - toMinutes(b.shift?.start);
      });
  };

  const syncHeaderScroll = () => {
    if (!headerScrollRef.current || !bodyScrollRef.current) return;
    headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
  };

  const getStartOfWeekFromDayObj = (dayObj) => {
    const date = new Date(dayObj.year, dayObj.month, dayObj.day);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);

    return date;
  };

  const clearWeekLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleWeekLongPressStart = (dayObj) => {
    if (!isAdmin) return;

    clearWeekLongPress();

    longPressTimerRef.current = setTimeout(() => {
      clearWeekLongPress();
      const weekStart = getStartOfWeekFromDayObj(dayObj);
      onWeekLongPress?.(weekStart);
    }, 600);
  };

  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    return () => clearWeekLongPress();
  }, []);

  return (
    <div className="calendar-wrapper">
      <div className="calendar-fixed-header">
        <div className="month-nav">
          <button
            type="button"
            className="month-btn"
            onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
          >
            ‹
          </button>

          <div className="month-label">
            {currentDate.toLocaleString("es-ES", {
              month: "long",
              year: "numeric",
            })}
          </div>

          <button
            type="button"
            className="month-btn"
            onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
          >
            ›
          </button>
        </div>

        <div className="calendar-header-scroll" ref={headerScrollRef}>
          <div className="calendar-weekdays">
            {weekDays.map((d) => (
              <div key={d} className="calendar-weekday">
                {d}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="calendar-body-scroll"
        ref={bodyScrollRef}
        onScroll={syncHeaderScroll}
      >
        <div className="calendar-grid">
          {calendarDays.map((dayObj, index) => {
            const shifts = getShiftsForDay(dayObj);
            const isMonday = index % 7 === 0;

            const isToday =
              dayObj.day === today.getDate() &&
              dayObj.month === today.getMonth() &&
              dayObj.year === today.getFullYear();

            return (
              <div
                key={`${dayObj.year}-${dayObj.month}-${dayObj.day}-${index}`}
                ref={isToday ? todayRef : null}
                className={`calendar-cell ${
                  !dayObj.isCurrentMonth ? "calendar-other-month" : ""
                } ${isToday ? "calendar-today" : ""} ${
                  isMonday && isAdmin ? "calendar-week-copy-zone" : ""
                }`}
                onClick={() => onSelectEmployee?.(null, dayObj)}
                onMouseDown={() => isMonday && handleWeekLongPressStart(dayObj)}
                onMouseUp={clearWeekLongPress}
                onMouseLeave={clearWeekLongPress}
                onTouchStart={() => isMonday && handleWeekLongPressStart(dayObj)}
                onTouchEnd={clearWeekLongPress}
                onTouchCancel={clearWeekLongPress}
              >
                <div className="calendar-day-number">{dayObj.day}</div>

                <div className="calendar-shifts">
                  {shifts.map(({ employee, shift }, i) => (
                    <div
                      key={`${employee.id || employee.name}-${shift.id || i}`}
                      className="calendar-shift"
                      style={{
                        backgroundColor: employee.color || "#2563eb",
                      }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onSelectEmployee?.(employee, shift, i);
                      }}
                      onMouseDown={(ev) => ev.stopPropagation()}
                      onTouchStart={(ev) => ev.stopPropagation()}
                    >
                      <div className="calendar-shift-name">{employee.name}</div>
                      <div className="calendar-shift-time">
                        {shift.start}
                        {shift.end ? ` - ${shift.end}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CalendarMonth;