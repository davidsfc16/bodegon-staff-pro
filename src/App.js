import React, { useState, useEffect } from "react";
import Calendar from "./Calendar";
import Schedule from "./Schedule";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./App.css";

const HOURLY_RATE = 8;
const EXTRA_RATE = 12;

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [pin, setPin] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("bodegon")) || [];
    setEmployees(data);
  }, []);

  useEffect(() => {
    localStorage.setItem("bodegon", JSON.stringify(employees));
  }, [employees]);

  // Turnos automáticos
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const day = now.getDay(); // 0=Dom, 1=Lun...
      const hours = now.getHours();
      const minutes = now.getMinutes();

      setEmployees(prev =>
        prev.map(emp => {
          const updatedSessions = [...emp.sessions];
          emp.schedule?.forEach(sch => {
            const schDay = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].indexOf(sch.day);
            if (schDay === day) {
              const [startH,startM] = sch.start?.split(":").map(Number) || [];
              const [endH,endM] = sch.end?.split(":").map(Number) || [];
              // activar turno si empieza ahora y no activo
              if (!emp.active && startH === hours && startM === minutes) {
                updatedSessions.push({ start: now, end: sch.end ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM) : null });
                emp.active = true;
              }
              // terminar automáticamente si tiene end
              if (emp.active && endH !== undefined && endM !== undefined) {
                const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);
                if (now >= endDate) {
                  emp.active = false;
                  updatedSessions[updatedSessions.length-1].end = endDate;
                }
              }
            }
          });
          return { ...emp, sessions: updatedSessions };
        })
      );
    }, 60000); // comprueba cada minuto
    return () => clearInterval(interval);
  }, [employees]);

  const addEmployee = () => {
    if (!name) return;
    setEmployees([...employees, { name, photo: photoURL, sessions: [], active: false, schedule: [] }]);
    setName("");
    setPhotoURL("");
  };

  const toggleShift = (emp) => {
    const now = new Date();
    setEmployees(prev =>
      prev.map(e => {
        if (e.name === emp.name) {
          const sessions = [...e.sessions];
          if (!e.active) {
            sessions.push({ start: now, end: null });
            return { ...e, active: true, sessions };
          } else {
            sessions[sessions.length-1].end = now;
            return { ...e, active: false, sessions };
          }
        }
        return e;
      })
    );
  };

  const calcSalary = (emp) => {
    let normal = 0, extra = 0;
    emp.sessions.forEach(s => {
      if (!s.end) return;
      const hours = (new Date(s.end) - new Date(s.start))/3600000;
      if (hours > 8) { normal += 8; extra += hours-8; } else { normal += hours; }
    });
    return { normal, extra, total: normal*HOURLY_RATE + extra*EXTRA_RATE };
  };

  const chartData = employees.map(e => {
    const s = calcSalary(e);
    return { name: e.name, Normal: s.normal, Extra: s.extra };
  });

  return (
    <div className="app-container">
      <header className="app-header">
        <img src="/logo.png" alt="Bodegón" className="logo"/>
        <h1>Bodegón Staff PRO Ultimate</h1>
      </header>

      {!isAdmin ? (
        <div className="employee-section">
          <h2>Empleados</h2>
          {employees.map((e,i) => (
            <div key={i} className={`employee-card ${e.active ? "active" : ""}`}>
              {e.photo && <img src={e.photo} alt={e.name} className="employee-photo"/>}
              <div className="employee-info">
                <strong>{e.name}</strong>
                <div>Turno activo: {e.active ? "Sí" : "No"}</div>
              </div>
              <button onClick={() => toggleShift(e)} className={shift-btn ${e.active ? "exit" : "enter"}}>
                {e.active ? "Salir" : "Entrar"}
              </button>
            </div>
          ))}

          <div className="add-employee">
            <input placeholder="Nombre" value={name} onChange={(e)=>setName(e.target.value)}/>
            <input placeholder="URL Foto" value={photoURL} onChange={(e)=>setPhotoURL(e.target.value)}/>
            <button onClick={addEmployee}>Añadir</button>
          </div>

          <div className="admin-access">
            <input type="password" placeholder="PIN" value={pin} onChange={(e)=>setPin(e.target.value)}/>
            <button onClick={()=>pin==="1616" && setIsAdmin(true)}>Entrar Jefe</button>
          </div>
        </div>
      ) : (
        <div className="admin-section">
          <button className="exit-admin" onClick={()=>setIsAdmin(false)}>Salir</button>
          <h2>Panel Jefe</h2>
          <Schedule employees={employees} setEmployees={setEmployees}/>
          {employees.map((e,i)=>{
            const s = calcSalary(e);
            return (
              <div key={i} className="employee-card admin">
                {e.photo && <img src={e.photo} alt={e.name} className="employee-photo"/>}
                <div className="employee-info">
                  <strong>{e.name}</strong>
                  <div>Horas normales: {s.normal.toFixed(1)}</div>
                  <div>Horas extra: {s.extra.toFixed(1)}</div>
                  <div className="salary">💰 {s.total.toFixed(2)}€</div>
                </div>
              </div>
            )
          })}
          <h2>Gráfica Semanal</h2>
          <div style={{width:"100%", height:300}}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{top:20,right:30,left:0,bottom:0}}>
                <XAxis dataKey="name"/>
                <YAxis/>
                <Tooltip/>
                <Legend/>
                <Bar dataKey="Normal" fill="#2ecc71"/>
                <Bar dataKey="Extra" fill="#e74c3c"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Calendar employees={employees}/>
        </div>
      )}
    </div>
  );
}