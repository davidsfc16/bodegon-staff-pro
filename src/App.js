import React, { useState, useEffect } from "react";

const HOURLY_RATE = 8;
const EXTRA_RATE = 12;

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("bodegon")) || [];
    setEmployees(data);
  }, []);

  useEffect(() => {
    localStorage.setItem("bodegon", JSON.stringify(employees));
  }, [employees]);

  const addEmployee = () => {
    if (!name) return;
    setEmployees([...employees, { name, sessions: [], active: false }]);
    setName("");
  };

  const toggleShift = (emp) => {
    const now = new Date();
    setEmployees((prev) =>
      prev.map((e) => {
        if (e.name === emp.name) {
          if (!e.active) {
            return {
              ...e,
              active: true,
              sessions: [...e.sessions, { start: now, end: null }],
            };
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

    return {
      normal,
      extra,
      total: normal * HOURLY_RATE + extra * EXTRA_RATE,
    };
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial", background: "#f2f2f2", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center" }}>🍻 Bodegón Staff</h1>

      {!isAdmin && (
        <>
          <h2>Fichar</h2>

          {employees.map((e, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                padding: 15,
                marginBottom: 10,
                borderRadius: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong>{e.name}</strong>

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
          <button onClick={addEmployee}>Añadir</button>

          <h2>Acceso jefe</h2>
          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={{ padding: 10, marginRight: 10 }}
          />
          <button onClick={() => pin === "1616" && setIsAdmin(true)}>
            Entrar
          </button>
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
                }}
              >
                <strong>{e.name}</strong>
                <div>Horas normales: {data.normal.toFixed(1)}</div>
                <div>Horas extra: {data.extra.toFixed(1)}</div>
                <div style={{ fontWeight: "bold" }}>
                  💰 {data.total.toFixed(2)} €
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}