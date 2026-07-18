import React from 'react';
import { Link } from 'react-router-dom';

interface Props {
  patientId: string;
  patientName: string;
}

export default function PatientLink({ patientId, patientName }: Props) {
  return (
    <Link
      to={`/patient/${patientId}`}
      className="font-medium text-surface-800 hover:text-navy-700 hover:underline transition-colors"
    >
      {patientName}
    </Link>
  );
}
