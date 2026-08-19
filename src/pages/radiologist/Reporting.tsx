import React from 'react';
import { useSearchParams } from 'react-router-dom';
import DiagnosticHub from '../shared/DiagnosticHub';

export default function RadiologistReporting() {
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('caseId');
  const tab = searchParams.get('tab');
  return <DiagnosticHub initialTab={tab === 'reporting' || caseId ? 'reporting' : 'queue'} />;
}
