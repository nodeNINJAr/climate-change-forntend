'use client';

import { useEffect, useState } from 'react';
import { entryService, criteriaService, calculatorService, configService } from '../services/api';
import { IEntry, ICriteria, IConfig, BD_DIVISIONS, IDivisionCalculationResult } from '../types';

export default function App() {
  const [entries, setEntries] = useState<IEntry[]>([]);
  const [configs, setConfigs] = useState<IConfig[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [division, setDivision] = useState(BD_DIVISIONS[0]);
  const [climateHazardCategory, setClimateHazardCategory] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const [criteria, setCriteria] = useState<ICriteria[]>([]);
  const [criteriaName, setCriteriaName] = useState('');
  const [weight, setWeight] = useState<number>(0);
  const [editingCriteriaId, setEditingCriteriaId] = useState<string | null>(null);

  const [divisionCalculation, setDivisionCalculation] = useState<IDivisionCalculationResult | null>(null);
  const [viewAllDivisions, setViewAllDivisions] = useState(false);
  const [selectedDivisionView, setSelectedDivisionView] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadEntries = async () => {
    try {
      const res = await entryService.getAll();
      if (res.data.success) setEntries(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadConfigs = async () => {
    try {
      const res = await configService.getAll();
      if (res.data.success) {
        setConfigs(res.data.data);
        if (res.data.data.length > 0) {
          setWeight(res.data.data[0].value);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadEntries();
    loadConfigs();
  }, []);

  const loadCriteria = async (entryId: string) => {
    try {
      const res = await criteriaService.getByEntry(entryId);
      if (res.data.success) setCriteria(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEntryChange = (entryId: string) => {
    setSelectedEntryId(entryId);
    setDivisionCalculation(null);
    setEditingEntryId(null);
    if (entryId) {
      loadCriteria(entryId);
      const entry = entries.find(e => e._id === entryId);
      if (entry) {
        setDivision(entry.division as typeof division);
        setClimateHazardCategory(entry.climateHazardCategory);
      }
    }
  };

  const handleCreateOrUpdateEntry = async () => {
    if (!division || !climateHazardCategory) return alert('Division and Hazard Category are required');
    setLoading(true);
    try {
      if (editingEntryId) {
        const res = await entryService.update(editingEntryId, { division, climateHazardCategory });
        if (res.data.success) {
          setEntries(prev => prev.map(e => e._id === editingEntryId ? res.data.data : e));
          setEditingEntryId(null);
          setClimateHazardCategory('');
          alert('Entry Updated!');
        }
      } else {
        const res = await entryService.create({ division, climateHazardCategory });
        if (res.data.success) {
          const newEntry = res.data.data;
          setEntries(prev => [...prev, newEntry]);
          setClimateHazardCategory('');
          handleEntryChange(newEntry._id);
          alert('Entry Created!');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error creating/updating entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      const res = await entryService.delete(id);
      if (res.data.success) {
        setEntries(prev => prev.filter(e => e._id !== id));
        if (selectedEntryId === id) {
          setSelectedEntryId('');
          setCriteria([]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddOrUpdateCriteria = async () => {
    if (!selectedEntryId || !criteriaName) return alert('Select entry and enter criteria name');
    setLoading(true);
    try {
      if (editingCriteriaId) {
        const res = await criteriaService.update(editingCriteriaId, { criteriaTitle: criteriaName, weight });
        if (res.data.success) {
          setCriteria(prev => prev.map(c => c._id === editingCriteriaId ? res.data.data : c));
          setEditingCriteriaId(null);
          setCriteriaName('');
        }
      } else {
        const res = await criteriaService.create({
          criteriaTitle: criteriaName,
          weight,
          entryId: selectedEntryId,
        });
        if (res.data.success) {
          setCriteria(prev => [...prev, res.data.data]);
          setCriteriaName('');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error adding/updating criteria');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCriteria = async (id: string) => {
    try {
      const res = await criteriaService.delete(id);
      if (res.data.success) {
        setCriteria(prev => prev.filter(c => c._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate for the division of the selected entry
  const handleCalculateDivision = async () => {
    if (!selectedEntryId) {
      alert('Select an entry first');
      return;
    }
    
    const entry = entries.find(e => e._id === selectedEntryId);
    if (!entry) {
      alert('Entry not found');
      return;
    }

    try {
      setLoading(true);
      console.log('Calculating division:', entry.division);
      
      const res = await calculatorService.calculateDivision(entry.division);
      
      console.log('Response:', res.data);
      
      if (res.data.success) {
        setDivisionCalculation(res.data.data);
      } else {
        alert(res.data.message || 'Division calculation failed');
      }
    } catch (err: unknown) {
      console.error('Calculation error:', err);
      const errorMessage = 
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 
        (err as { message?: string })?.message || 
        'Unknown error';
      alert(`Error calculating division hazard: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const exportDivisionPDF = async () => {
    if (!divisionCalculation) return;
    try {
      setLoading(true);
      const res = await calculatorService.generateDivisionPDF(divisionCalculation);
      const pdfData = res.data.data;
      if (pdfData?.pdfUrl) {
        window.open(`http://localhost:5000${pdfData.pdfUrl}`, '_blank');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating PDF');
    } finally {
      setLoading(false);
    }
  };

  // Get entries for the selected division (for main page list)
  const getFilteredEntries = () => {
    if (!selectedEntryId) return entries;
    
    const selectedEntry = entries.find(e => e._id === selectedEntryId);
    if (!selectedEntry) return entries;
    
    // Filter entries by the division of the selected entry
    return entries.filter(e => e.division === selectedEntry.division);
  };

  // Get entries for selected division in division view
  const getEntriesForDivisionView = () => {
    if (!selectedDivisionView) return [];
    return entries.filter(e => e.division === selectedDivisionView);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="flex justify-between items-center mb-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800">Climate Hazard Calculator</h1>
        <button 
          onClick={() => {
            setViewAllDivisions(!viewAllDivisions);
            setDivisionCalculation(null);
            setSelectedDivisionView('');
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors shadow"
        >
          {viewAllDivisions ? '← Back to Calculator' : 'View All Divisions →'}
        </button>
      </div>

      {!viewAllDivisions ? (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Entry Management */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-bold mb-4 text-gray-700">
                {editingEntryId ? 'Update Entry' : 'Create New Entry'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Division</label>
                  <select
                    className="border p-2 rounded w-full bg-white font-semibold"
                    value={division}
                    onChange={e => setDivision(e.target.value as typeof division)}
                  >
                    {BD_DIVISIONS.map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Hazard Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Flood, Landslide"
                    value={climateHazardCategory}
                    onChange={e => setClimateHazardCategory(e.target.value)}
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateOrUpdateEntry}
                    disabled={loading}
                    className={`flex-1 ${editingEntryId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-600 hover:bg-purple-700'} text-white px-4 py-2 rounded transition-colors font-medium disabled:bg-gray-400`}
                  >
                    {editingEntryId ? 'Update' : 'Create Entry'}
                  </button>
                  {editingEntryId && (
                    <button
                      onClick={() => {
                        setEditingEntryId(null);
                        setClimateHazardCategory('');
                      }}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-bold mb-4 text-gray-700">
                {selectedEntryId ? `${entries.find(e => e._id === selectedEntryId)?.division} Entries` : 'All Entries'}
              </h2>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {getFilteredEntries().length > 0 ? (
                  getFilteredEntries().map(entry => (
                    <div 
                      key={entry._id} 
                      className={`p-3 rounded border flex justify-between items-center cursor-pointer transition-colors ${selectedEntryId === entry._id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
                      onClick={() => handleEntryChange(entry._id)}
                    >
                      <div>
                        <p className="font-bold text-gray-800">{entry.climateHazardCategory}</p>
                        <p className="text-xs text-gray-500">{entry.division}</p>
                      </div>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            setEditingEntryId(entry._id);
                            setDivision(entry.division as typeof division);
                            setClimateHazardCategory(entry.climateHazardCategory);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        >
                          ✎
                        </button>
                        <button 
                          onClick={() => handleDeleteEntry(entry._id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 italic text-center py-4">
                    {selectedEntryId ? 'No other entries in this division' : 'No entries yet.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Criteria & Results */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedEntryId ? (
              <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
                <p className="text-gray-500 text-lg">Select an entry from the list to manage criteria and calculate division risk.</p>
              </div>
            ) : (
              <>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">
                        {entries.find(e => e._id === selectedEntryId)?.climateHazardCategory}
                      </h2>
                      <p className="text-sm text-gray-600">Division: {entries.find(e => e._id === selectedEntryId)?.division}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded uppercase">Selected</span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border mb-6">
                    <h3 className="font-bold mb-3 text-gray-700">{editingCriteriaId ? 'Update Criteria' : 'Add Criteria'}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="Criteria Name"
                        value={criteriaName}
                        onChange={e => setCriteriaName(e.target.value)}
                        className="border p-2 rounded col-span-1"
                      />
                      <select
                        className="border p-2 rounded bg-white"
                        value={weight}
                        onChange={e => setWeight(Number(e.target.value))}
                      >
                        {configs.map(config => (
                          <option key={config._id} value={config.value}>
                            {config.name} ({config.value})
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddOrUpdateCriteria}
                          disabled={loading}
                          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex-1 disabled:bg-gray-400"
                        >
                          {editingCriteriaId ? 'Update' : 'Add'}
                        </button>
                        {editingCriteriaId && (
                          <button
                            onClick={() => {
                              setEditingCriteriaId(null);
                              setCriteriaName('');
                            }}
                            className="bg-gray-200 px-3 py-2 rounded"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-700 flex justify-between items-center">
                      Assigned Criteria 
                      <span className="text-xs font-normal text-gray-500">{criteria.length} items</span>
                    </h3>
                    <div className="border rounded divide-y">
                      {criteria.length > 0 ? (
                        criteria.map(c => (
                          <div key={c._id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                            <div>
                              <span className="font-medium">{c.criteriaTitle}</span>
                              <span className="ml-3 text-sm text-gray-500">
                                Weight: {configs.find(conf => conf.value === c.weight)?.name || c.weight}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  setEditingCriteriaId(c._id);
                                  setCriteriaName(c.criteriaTitle);
                                  setWeight(c.weight);
                                }}
                                className="text-blue-500 text-sm hover:underline"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteCriteria(c._id)}
                                className="text-red-500 text-sm hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-400 italic">No criteria added for this entry.</div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleCalculateDivision}
                    disabled={loading}
                    className="mt-8 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors w-full font-bold shadow-md disabled:bg-gray-400"
                  >
                    {loading ? 'Calculating...' : `Calculate ${division} Division Risk`}
                  </button>
                </div>

                {divisionCalculation && (
                  <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-green-500">
                    <h2 className="text-3xl font-bold mb-6 text-gray-800">
                      {divisionCalculation.division} Division Assessment
                    </h2>
                    
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 text-center">
                        <p className="text-sm text-blue-600 uppercase font-semibold mb-2">Total Entries</p>
                        <p className="text-4xl font-bold text-blue-800">{divisionCalculation.entryCount}</p>
                      </div>
                      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 text-center">
                        <p className="text-sm text-purple-600 uppercase font-semibold mb-2">Total Criteria</p>
                        <p className="text-4xl font-bold text-purple-800">{divisionCalculation.totalCriteriaCount}</p>
                      </div>
                      <div className="bg-orange-50 p-6 rounded-lg border border-orange-200 text-center">
                        <p className="text-sm text-orange-600 uppercase font-semibold mb-2">Sum of Values</p>
                        <p className="text-4xl font-bold text-orange-800">{divisionCalculation.sumOfAllCriteriaValues.toFixed(2)}</p>
                      </div>
                      <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
                        <p className="text-sm text-green-600 uppercase font-semibold mb-2">Average Score</p>
                        <p className="text-4xl font-bold text-green-800">{divisionCalculation.divisionAverageScore.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Formula Breakdown */}
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-8 rounded">
                      <h3 className="font-bold text-yellow-800 mb-3 text-lg">📊 Calculation Formula</h3>
                      <div className="space-y-2 text-gray-700">
                        <p><strong>Sum of All Criteria Values:</strong> {divisionCalculation.sumOfAllCriteriaValues.toFixed(2)}</p>
                        <p><strong>Total Criteria Count:</strong> {divisionCalculation.totalCriteriaCount}</p>
                        <p className="text-lg font-bold text-yellow-900 mt-3">
                          Average Score = {divisionCalculation.sumOfAllCriteriaValues.toFixed(2)} ÷ {divisionCalculation.totalCriteriaCount} = {divisionCalculation.divisionAverageScore.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Entry Details */}
                    <div className="mb-8">
                      <h3 className="text-xl font-bold mb-4 text-gray-800 border-b-2 border-blue-500 pb-2">
                        Entry Breakdown ({divisionCalculation.entryResults.length} Entries)
                      </h3>
                      <div className="space-y-4">
                        {divisionCalculation.entryResults.map(entry => (
                          <div key={entry.entryId} className="border-2 border-gray-200 rounded-lg p-5 hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-lg font-bold text-gray-800">{entry.climateHazardCategory}</h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                entry.riskLevel.includes('High') ? 'bg-red-500 text-white' :
                                entry.riskLevel.includes('Moderate') ? 'bg-yellow-500 text-white' :
                                entry.riskLevel === 'No Data' ? 'bg-gray-400 text-white' : 'bg-green-500 text-white'
                              }`}>
                                {entry.riskLevel}
                              </span>
                            </div>
                            
                            {entry.criteriaResults.length > 0 ? (
                              <>
                                <div className="overflow-x-auto mb-3">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="text-left p-2 border">Criteria</th>
                                        <th className="text-left p-2 border">Damage Level</th>
                                        <th className="text-center p-2 border">Score</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {entry.criteriaResults.map((cr, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                          <td className="p-2 border">{cr.criteriaTitle}</td>
                                          <td className="p-2 border">{cr.selectedConfig}</td>
                                          <td className="p-2 border text-center font-semibold">{cr.configValue}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="flex justify-between text-sm bg-gray-50 p-3 rounded">
                                  <span><strong>Entry Total:</strong> {entry.totalScore.toFixed(2)}</span>
                                  <span><strong>Entry Average:</strong> {entry.averageScore.toFixed(2)}</span>
                                  <span><strong>Criteria Count:</strong> {entry.criteriaCount}</span>
                                </div>
                              </>
                            ) : (
                              <p className="text-gray-400 italic text-sm">No criteria data available</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Final Result */}
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-500 rounded-lg p-8 text-center">
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">Division-Wide Risk Level</h3>
                      <div className={`text-5xl font-black mb-6 ${
                        divisionCalculation.divisionRiskLevel.includes('High') ? 'text-red-600' :
                        divisionCalculation.divisionRiskLevel.includes('Moderate') ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {divisionCalculation.divisionRiskLevel}
                      </div>
                      <button 
                        onClick={exportDivisionPDF}
                        disabled={loading}
                        className="bg-gray-800 text-white px-8 py-3 rounded-lg hover:bg-gray-900 transition-colors text-lg font-semibold shadow-lg disabled:bg-gray-400"
                      >
                        {loading ? 'Generating PDF...' : '📥 Download Division PDF Report'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          {!selectedDivisionView ? (
            <>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Select a Division to View Entries</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {BD_DIVISIONS.map(div => {
                  const divisionEntries = entries.filter(e => e.division === div);
                  return (
                    <div 
                      key={div} 
                      className="bg-white p-5 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedDivisionView(div)}
                    >
                      <h3 className="text-lg font-bold border-b pb-2 mb-3 text-blue-800 flex justify-between items-center">
                        {div}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{divisionEntries.length}</span>
                      </h3>
                      <p className="text-sm text-gray-500">Click to view entries →</p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{selectedDivisionView} - All Entries</h2>
                <button 
                  onClick={() => setSelectedDivisionView('')}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  ← Back to Divisions
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getEntriesForDivisionView().map(entry => (
                  <div 
                    key={entry._id} 
                    className="bg-white p-5 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setViewAllDivisions(false);
                      setSelectedDivisionView('');
                      handleEntryChange(entry._id);
                    }}
                  >
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{entry.climateHazardCategory}</h3>
                    <p className="text-sm text-gray-500">Click to manage criteria →</p>
                  </div>
                ))}
                {getEntriesForDivisionView().length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-400 text-lg">No entries found for {selectedDivisionView}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}