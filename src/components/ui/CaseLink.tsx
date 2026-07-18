import React from 'react';
import { Link } from 'react-router-dom';

interface Props {
  caseId: string;
  caseNumber: string;
}

export default function CaseLink({ caseId, caseNumber }: Props) {
  return (
    <Link
      to={`/case/${caseId}`}
      className="font-mono text-navy-600 font-medium text-xs hover:text-navy-800 hover:underline transition-colors"
    >
      {caseNumber}
    </Link>
  );
}
