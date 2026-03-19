import React from "react";

function EmployeeCard({ employee, shift }) {
  return (
    <div className="employee-card">
      <img src={employee.photo} alt={employee.name} className="employee-photo" />
      <div className="employee-info">
        <span>{employee.name}</span>
        <span>{shift.start} - {shift.end || "Salga cuando quiera"}</span>
      </div>
    </div>
  );
}

export default EmployeeCard;