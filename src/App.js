import React, { useState } from "react";
import CalendarMonth from "./CalendarMonth";
import WeeklySummary from "./WeeklySummary";
import "./App.css";

function App() {
  const [employees, setEmployees] = useState([
    { id: 1, name: "Juan", photo: "/logo.png", schedule: [
      { day: 1, start: "16:00", end: "22:00" },
      { day: 3, start: "16:00", end: "22:00" },
    ] },
    { id: 2, name: "Ana", photo: "/logo.png", schedule: [
      { day: 2, start: "14:00", end: "22:00" },
    ] },
    // Añadir más empleados
  ]);

  return (
    <div className="app-container">
      <h1>Bodegón Staff PRO</h1>
      <CalendarMonth employees={employees} />
      <WeeklySummary employees={employees} />
    </div>
  );
}

export default App;