import { useState } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import axios from 'axios';

interface JournalImportProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportMapping {
  dateColumn: string;
  moodColumn: string;
  contentColumn: string;
  activitiesColumn: string;
  tagsColumn: string;
  sleepColumn: string;
}

const JournalImport: React.FC<JournalImportProps> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({
    dateColumn: '',
    moodColumn: '',
    contentColumn: '',
    activitiesColumn: '',
    tagsColumn: '',
    sleepColumn: ''
  });
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'map' | 'import' | 'complete'>('upload');
  const [importStats, setImportStats] = useState({ entries: 0, moods: 0, activities: 0 });
  const [previewData, setPreviewData] = useState<string[][]>([]);

  const { user } = useUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    if (uploadedFile.type !== 'text/csv' && !uploadedFile.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setFile(uploadedFile);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').map(row => {
        // Handle CSV parsing with potential commas in quoted fields
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        result.push(current.trim());
        return result.map(cell => cell.replace(/^"|"$/g, '')); // Remove surrounding quotes
      }).filter(row => row.some(cell => cell.length > 0)); // Filter out empty rows

      if (rows.length > 0) {
        setHeaders(rows[0]);
        setCsvData(rows.slice(1));
        setPreviewData(rows.slice(1, 6)); // Show first 5 rows for preview
        setStep('map');
        
        // Auto-detect common column mappings
        const headerLower = rows[0].map(h => h.toLowerCase());
        const newMapping = { ...mapping };
        
        // Common date column names
        const dateColumns = ['date', 'day', 'timestamp', 'created_at', 'entry_date'];
        const dateMatch = headerLower.findIndex(h => dateColumns.some(d => h.includes(d)));
        if (dateMatch !== -1) newMapping.dateColumn = rows[0][dateMatch];
        
        // Common mood column names
        const moodColumns = ['mood', 'feeling', 'emotion', 'rating', 'score'];
        const moodMatch = headerLower.findIndex(h => moodColumns.some(m => h.includes(m)));
        if (moodMatch !== -1) newMapping.moodColumn = rows[0][moodMatch];
        
        // Common content column names
        const contentColumns = ['content', 'entry', 'text', 'note', 'description', 'journal'];
        const contentMatch = headerLower.findIndex(h => contentColumns.some(c => h.includes(c)));
        if (contentMatch !== -1) newMapping.contentColumn = rows[0][contentMatch];
        
        // Common activities column names
        const activityColumns = ['activities', 'activity', 'tags', 'categories'];
        const activityMatch = headerLower.findIndex(h => activityColumns.some(a => h.includes(a)));
        if (activityMatch !== -1) newMapping.activitiesColumn = rows[0][activityMatch];
        
        // Common sleep column names
        const sleepColumns = ['sleep', 'hours', 'sleep_hours', 'sleep_quality'];
        const sleepMatch = headerLower.findIndex(h => sleepColumns.some(s => h.includes(s)));
        if (sleepMatch !== -1) newMapping.sleepColumn = rows[0][sleepMatch];
        
        setMapping(newMapping);
      }
    };
    
    reader.readAsText(uploadedFile);
  };

  // Handle import process
  const handleImport = async () => {
    if (!mapping.dateColumn) {
      alert('Please select at least a date column to import');
      return;
    }

    setImporting(true);
    setStep('import');
    setProgress(0);

    try {
      const dateIndex = headers.indexOf(mapping.dateColumn);
      const moodIndex = mapping.moodColumn ? headers.indexOf(mapping.moodColumn) : -1;
      const contentIndex = mapping.contentColumn ? headers.indexOf(mapping.contentColumn) : -1;
      const activitiesIndex = mapping.activitiesColumn ? headers.indexOf(mapping.activitiesColumn) : -1;
      const sleepIndex = mapping.sleepColumn ? headers.indexOf(mapping.sleepColumn) : -1;

      let entriesCount = 0;
      let moodsCount = 0;
      let activitiesCount = 0;

      // Process each row
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        
        if (row.length <= dateIndex || !row[dateIndex]) continue;

        // Parse date
        let dateStr = row[dateIndex];
        try {
          // Try to parse various date formats
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            // Try different formats
            const formats = [
              /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
              /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
              /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
            ];
            
            let parsedDate = null;
            for (const format of formats) {
              const match = dateStr.match(format);
              if (match) {
                if (format === formats[0]) { // MM/DD/YYYY
                  parsedDate = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
                } else if (format === formats[1]) { // YYYY-MM-DD
                  parsedDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                } else if (format === formats[2]) { // DD-MM-YYYY
                  parsedDate = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
                }
                break;
              }
            }
            
            if (parsedDate && !isNaN(parsedDate.getTime())) {
              dateStr = parsedDate.toISOString().split('T')[0];
            } else {
              console.warn(`Could not parse date: ${dateStr}`);
              continue;
            }
          } else {
            dateStr = date.toISOString().split('T')[0];
          }
        } catch (error) {
          console.warn(`Error parsing date: ${dateStr}`, error);
          continue;
        }

        // Import content if available
        if (contentIndex !== -1 && row[contentIndex]) {
          try {
            await axios.post('/api/journal/entry', {
              date: dateStr,
              content: row[contentIndex],
              timestamp: new Date().toISOString()
            });
            entriesCount++;
          } catch (error) {
            console.error(`Error importing entry for ${dateStr}:`, error);
          }
        }

        // Import mood if available
        if (moodIndex !== -1 && row[moodIndex]) {
          try {
            const moodValue = row[moodIndex].toLowerCase();
            let emoji = '😐';
            let label = 'Meh';
            
            // Map common mood values to our emoji system
            if (moodValue.includes('awful') || moodValue.includes('terrible') || moodValue === '1') {
              emoji = '😞'; label = 'Awful';
            } else if (moodValue.includes('bad') || moodValue.includes('poor') || moodValue === '2') {
              emoji = '😕'; label = 'Bad';
            } else if (moodValue.includes('okay') || moodValue.includes('meh') || moodValue.includes('neutral') || moodValue === '3') {
              emoji = '😐'; label = 'Meh';
            } else if (moodValue.includes('good') || moodValue.includes('happy') || moodValue === '4') {
              emoji = '🙂'; label = 'Good';
            } else if (moodValue.includes('great') || moodValue.includes('excellent') || moodValue.includes('rad') || moodValue === '5') {
              emoji = '😄'; label = 'Rad';
            }

            await axios.post('/api/journal/mood', {
              date: dateStr,
              emoji,
              label,
              tags: []
            });
            moodsCount++;
          } catch (error) {
            console.error(`Error importing mood for ${dateStr}:`, error);
          }
        }

        // Import activities if available
        if (activitiesIndex !== -1 && row[activitiesIndex]) {
          try {
            const activitiesStr = row[activitiesIndex];
            const activities = activitiesStr.split(/[,;|]/).map(a => a.trim()).filter(a => a.length > 0);
            
            if (activities.length > 0) {
              await axios.post('/api/journal/activities', {
                date: dateStr,
                activities
              });
              activitiesCount++;
            }
          } catch (error) {
            console.error(`Error importing activities for ${dateStr}:`, error);
          }
        }

        // Update progress
        setProgress((i + 1) / csvData.length * 100);
      }

      setImportStats({ entries: entriesCount, moods: moodsCount, activities: activitiesCount });
      setStep('complete');
    } catch (error) {
      console.error('Import error:', error);
      alert('An error occurred during import. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                <span className="text-3xl mr-3">📥</span>
                Import Journal Data
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Import your existing journal entries from CSV files
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center mt-6 space-x-4">
            {['upload', 'map', 'import', 'complete'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepName ? 'bg-[#00C9A7] text-white' :
                  ['upload', 'map', 'import', 'complete'].indexOf(step) > index ? 'bg-[#00C9A7] text-white' :
                  'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                }`}>
                  {['upload', 'map', 'import', 'complete'].indexOf(step) > index ? '✓' : index + 1}
                </div>
                {index < 3 && (
                  <div className={`w-8 h-1 mx-2 ${
                    ['upload', 'map', 'import', 'complete'].indexOf(step) > index ? 'bg-[#00C9A7]' : 'bg-slate-200 dark:bg-slate-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-[#00C9A7]/20 to-[#FF6B6B]/20 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-[#00C9A7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Upload Your CSV File</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Select a CSV file containing your journal data. We support exports from Daylio, Journey, and other popular journaling apps.
                </p>
              </div>
              
              <label className="block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-8 hover:border-[#00C9A7] dark:hover:border-[#00C9A7] transition-colors cursor-pointer">
                  <div className="text-4xl mb-4">📄</div>
                  <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                    {file ? file.name : 'Choose CSV file or drag & drop'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Maximum file size: 10MB
                  </p>
                </div>
              </label>
              
              <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                <p className="mb-2">💡 <strong>Tip:</strong> Make sure your CSV includes these columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Date (required) - in YYYY-MM-DD, MM/DD/YYYY, or DD/MM/YYYY format</li>
                  <li>Mood/Rating (optional) - text descriptions or 1-5 numeric ratings</li>
                  <li>Entry/Content (optional) - your journal text</li>
                  <li>Activities (optional) - comma-separated list</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Map Columns */}
          {step === 'map' && (
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Map Your Columns</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Tell us which columns in your CSV correspond to different types of data.
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column Mapping */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Date Column <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={mapping.dateColumn}
                      onChange={(e) => setMapping({...mapping, dateColumn: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00C9A7] focus:border-transparent"
                    >
                      <option value="">Select date column...</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Mood/Rating Column
                    </label>
                    <select
                      value={mapping.moodColumn}
                      onChange={(e) => setMapping({...mapping, moodColumn: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00C9A7] focus:border-transparent"
                    >
                      <option value="">Select mood column...</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Journal Content Column
                    </label>
                    <select
                      value={mapping.contentColumn}
                      onChange={(e) => setMapping({...mapping, contentColumn: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00C9A7] focus:border-transparent"
                    >
                      <option value="">Select content column...</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Activities Column
                    </label>
                    <select
                      value={mapping.activitiesColumn}
                      onChange={(e) => setMapping({...mapping, activitiesColumn: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00C9A7] focus:border-transparent"
                    >
                      <option value="">Select activities column...</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Preview */}
                <div>
                  <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-3">Data Preview</h4>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          {headers.map(header => (
                            <th key={header} className="text-left p-2 font-medium text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(0, 3).map((row, index) => (
                          <tr key={index}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="p-2 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600">
                                {cell.length > 30 ? `${cell.substring(0, 30)}...` : cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Showing first 3 rows of {csvData.length} total rows
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep('upload')}
                  className="px-6 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={!mapping.dateColumn}
                  className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                    mapping.dateColumn
                      ? 'bg-[#00C9A7] text-white hover:bg-teal-600'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Start Import
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'import' && (
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-[#00C9A7]/20 to-[#FF6B6B]/20 rounded-2xl mx-auto flex items-center justify-center mb-6">
                <div className="animate-spin h-12 w-12 border-4 border-[#00C9A7] rounded-full border-t-transparent"></div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Importing Your Data</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Please wait while we process your journal entries...
              </p>
              
              <div className="max-w-md mx-auto">
                <div className="bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-2">
                  <div 
                    className="bg-gradient-to-r from-[#00C9A7] to-teal-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {Math.round(progress)}% complete
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-[#00C9A7]/20 to-[#FF6B6B]/20 rounded-2xl mx-auto flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-[#00C9A7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Import Complete!</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your journal data has been successfully imported.
              </p>
              
              <div className="bg-gradient-to-br from-[#00C9A7]/10 to-[#FF6B6B]/10 dark:from-[#00C9A7]/20 dark:to-[#FF6B6B]/20 rounded-2xl p-6 mb-6">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Import Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-[#00C9A7]">{importStats.entries}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Journal Entries</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#FF6B6B]">{importStats.moods}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Mood Entries</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-500">{importStats.activities}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Activity Sets</div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="px-8 py-3 rounded-xl bg-[#00C9A7] text-white font-medium hover:bg-teal-600 transition-colors"
              >
                View Imported Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JournalImport;