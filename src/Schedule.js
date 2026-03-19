// Schedule.js
export function calculateWeeklyHours(schedule) {
  let normalHours = 0;
  let extraHours = 0;

  schedule.forEach((shift) => {
    const [startH, startM] = shift.start.split(":").map(Number);
    const [endH, endM] = shift.end ? shift.end.split(":").map(Number) : [0,0];
    let hours = endH - startH + (endM - startM)/60;

    if(hours > 8){
      normalHours += 8;
      extraHours += hours - 8;
    } else {
      normalHours += hours;
    }
  });

  return { normalHours, extraHours, totalPay: normalHours*8 + extraHours*12 };
}