import React from "react";
import { calculateWeeklyHours } from "./Schedule";

function WeeklySummary({ employees }) {
  return (
    <div className="weekly-summary">
      <h2>Resumen semanal</h2>
      {employees.map((e) => {
        const { normalHours, extraHours, totalPay } = calculateWeeklyHours(e.schedule);
        return (
          <div key={e.id} className="summary-card">
            <span>{e.name}</span>
            <span>Horas normales: {normalHours}</span>
            <span>Horas extras: {extraHours}</span>
            <span>Total: {totalPay}€</span>
            <div className="mini-graph">
              <div style={{ width: normalHours*10, background: "green", height: 10 }}></div>
              <div style={{ width: extraHours*10, background: "red", height: 10 }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default WeeklySummary;