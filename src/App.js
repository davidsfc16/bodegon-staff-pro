import Calendar from "./Calendar";
import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const HOURLY_RATE = 8;
const EXTRA_RATE = 12;

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [photoURL, setPhotoURL] = useState("");

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("bodegon")) || [];
    setEmployees(data);
  }, []);

  useEffect(() => {
    localStorage.setItem("bodegon", JSON.stringify(employees));
  }, [employees]);

  const addEmployee = () => {
    if (!name) return;
    setEmployees([...employees, { name, sessions: [], active: false, photo: photoURL }]);
    setName("");
    setPhotoURL("");
  };

  const toggleShift = (emp) => {
    const now = new Date();
    setEmployees((prev) =>
      prev.map((e) => {
        if (e.name === emp.name) {
          if (!e.active) {
            return { ...e, active: true, sessions: [...e.sessions, { start: now, end: null }] };
          } else {
            const sessions = [...e.sessions];
            sessions[sessions.length - 1].end = now;
            return { ...e, active: false, sessions };
          }
        }
        return e;
      })
    );
  };

  const calcSalary = (emp) => {
    let normal = 0;
    let extra = 0;
    emp.sessions.forEach((s) => {
      if (!s.end) return;
      const hours = (new Date(s.end) - new Date(s.start)) / 3600000;
      if (hours > 8) {
        normal += 8;
        extra += hours - 8;
      } else {
        normal += hours;
      }
    });
    return { normal, extra, total: normal * HOURLY_RATE + extra * EXTRA_RATE };
  };

  // Datos para gráficos
  const chartData = employees.map((e) => {
    const s = calcSalary(e);
    return { name: e.name, Normal: s.normal, Extra: s.extra };
  });

  return (
    <div style={{ padding: 20, fontFamily: "Arial", background: "#f2f2f2", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center" }}>🍻 Bodegón Staff PRO</h1>

      {!isAdmin && (
        <>
          <h2>Fichar</h2>
          {employees.map((e, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                background: "#fff",
                padding: 15,
                marginBottom: 10,
                borderRadius: 10,
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                {e.photo && (
                  <img
                    src={e.photo}
                    alt={e.name}
                    style={{ width: 50, height: 50, borderRadius: "50%", marginRight: 10 }}
                  />
                )}
                <strong>{e.name}</strong>
              </div>
              <button
                onClick={() => toggleShift(e)}
                style={{
                  padding: "10px 20px",
                  fontSize: 16,
                  border: "none",
                  borderRadius: 8,
                  background: e.active ? "#e74c3c" : "#2ecc71",
                  color: "#fff",
                }}
              >
                {e.active ? "Salir" : "Entrar"}
              </button>
            </div>
          ))}

          <h2>Añadir empleado</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre"
            style={{ padding: 10, marginRight: 10 }}
          />
          <input
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            placeholder="URL Foto (opcional)"
            style={{ padding: 10, marginRight: 10 }}
          />
          <button onClick={addEmployee}>Añadir</button>

          <h2>Acceso jefe</h2>
          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={{ padding: 10, marginRight: 10 }}
          />
          <button onClick={() => pin === "1616" && setIsAdmin(true)}>Entrar</button>
        </>
      )}

      {isAdmin && (
        <>
          <h2>👑 Panel jefe</h2>
          <button onClick={() => setIsAdmin(false)}>Salir</button>

          {employees.map((e, i) => {
            const data = calcSalary(e);
            return (
              <div
                key={i}
                style={{
                  background: "#fff",
                  padding: 15,
                  marginTop: 10,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {e.photo && (
                  <img
                    src={e.photo}
                    alt={e.name}
                    style={{ width: 50, height: 50, borderRadius: "50%", marginRight: 10 }}
                  />
                )}
                <div>
                  <strong>{e.name}</strong>
                  <div>Horas normales: {data.normal.toFixed(1)}</div>
                  <div>Horas extra: {data.extra.toFixed(1)}</div>
                  <div style={{ fontWeight: "bold" }}>💰 {data.total.toFixed(2)} €</div>
                </div>
              </div>
            );
          })}

          <h2>📊 Gráfica semanal</h2>
          <div style={{ width: "100%", height: 300, marginTop: 20 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Normal" fill="#2ecc71" />
                <Bar dataKey="Extra" fill="#e74c3c" />
              </BarChart>
            </ResponsiveContainer>
            <Calendar employees={employees} />
          </div>
        </>
      )}
    </div>
  );
}