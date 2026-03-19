import React from "react";

export default function Calendar({ employees }) {
  // Crear un objeto de calendario semanal
  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  
  // Generar matriz: empleados x días
  return (
    <div style={{ marginTop: 20 }}>
      <h2>📅 Calendario Semanal</h2>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr>
            <th>Empleado</th>
            {weekDays.map((d,i)=><th key={i}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {employees.map((e,i)=>{
            const daysWorked = e.sessions.map(s => new Date(s.start).getDay()); // 0=Domingo
            return (
              <tr key={i}>
                <td style={{padding:5}}>{e.name}</td>
                {weekDays.map((_,idx)=>{
                  const dayNum = idx+1; // Lun=1 ... Dom=7
                  return (
                    <td key={idx} style={{padding:5, textAlign:"center"}}>
                      {daysWorked.includes(dayNum) ? "✅" : ""}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}