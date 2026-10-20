'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';
import { ArrowLeftRight, CheckCircle2 } from 'lucide-react';

export default function ShiftHandoverTabletPage() {
  const [logs, setLogs] = useState<any[]>([]);

  const loadLogs = async () => {
    const res = await apiClient.get('/shift-handover/logs/');
    setLogs(res.data);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleAcknowledge = async (id: string) =>