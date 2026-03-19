import React from "react";

export default function Calendar({ employees }) {
  const weekDays = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
  return (
    <div className="calendar-panel">
      <h2>📅 Calendario Semanal</h2>
      <table>
        <thead>
          <tr>
            <th>Empleado</th>
            {weekDays.map(d=><th key={d}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {employees.map((e,i)=>{
            const daysWorked = e.schedule?.map(s=>s.day)||[];
            return (
              <tr key={i}>
                <td>{e.name}</td>
                {weekDays.map(d=><td key={d} style={{textAlign:"center"}}>{daysWorked.includes(d)?"✅":""}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}