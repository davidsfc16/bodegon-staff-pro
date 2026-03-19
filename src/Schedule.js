import React, { useState } from "react";

export default function Schedule({ employees, setEmployees }) {
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [day, setDay] = useState("Lun");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const addSchedule = () => {
    if (!selectedEmp || !start) return;
    setEmployees(prev =>
      prev.map(e => {
        if (e.name === selectedEmp) {
          const updatedSchedule = [...(e.schedule||[]), { day, start, end: end || undefined }];
          return { ...e, schedule: updatedSchedule };
        }
        return e;
      })
    );
    setStart(""); setEnd("");
  };

  return (
    <div className="schedule-panel">
      <h3>Asignar Horario</h3>
      <select value={selectedEmp||""} onChange={e=>setSelectedEmp(e.target.value)}>
        <option value="">Empleado</option>
        {employees.map((e,i)=><option key={i} value={e.name}>{e.name}</option>)}
      </select>
      <select value={day} onChange={e=>setDay(e.target.value)}>
        {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d=><option key={d} value={d}>{d}</option>)}
      </select>
      <input type="time" value={start} onChange={e=>setStart(e.target.value)} placeholder="Hora inicio"/>
      <input type="time" value={end} onChange={e=>setEnd(e.target.value)} placeholder="Hora fin (opcional)"/>
      <button onClick={addSchedule}>Añadir</button>
    </div>
  )
}