import React, { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Calendar, Filter, Users, Building2 } from 'lucide-react';
import { supabaseGes } from '../../lib/supagestion';
import { supabase } from '../../lib/supabase';
import { exportContractPeriodsToExcel } from '../../utils/exportContractPeriodsExcel';
import { exportDevisToExcel } from '../../utils/exportExcel';
import { calculateTotalHT } from '../../utils/gestionMethode';

interface ExportSectionProps {
  className?: string;
}

export default function ExportSection({ className = '' }: ExportSectionProps) {
  const [exportingP2, setExportingP2] = useState(false);
  const [exportingP5, setExportingP5] = useState(false);
  const [exportingCombined, setExportingCombined] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [filters, setFilters] = useState({
    clientFilter: '',
    statusFilter: ''
  });
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  React.useEffect(() => {
    loadClientsList();
  }, []);

  const loadClientsList = async () => {
    try {
      const { data, error } = await supabaseGes
        .from('clients_devis')
        .select('id, client')
        .order('client');

      if (error) throw error;
      setClientsList(data || []);