import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './App.css';
import RubbishBinIcon from './RubbishBinIcon';

const cleaningTypes = [
  'Compartment General Cleaning (3 days)',
  'EMU Cab Wax Polishing (120 days)',
  'Compartment Heavy Floor Cleaning (45 days)',
  'Compartment Heavy Cleaning (90 days)',
  'Cab Front Cleaning (45 days)',
  'Exterior Car-body Cleaning (90 days)',
  'Compartment Pest Control (Monthly)'
];

const TaskTable = ({ tasks, handleCleanCheck, handleRemoveTask, today, isHeavyCleaning, filters }) => {
  const filteredTasks = tasks.filter(task => {
    return (
      (!filters.trainNumber || task.trainModel === filters.trainNumber) &&
      (!filters.date || task.scheduledTime === filters.date) &&
      (!filters.cleaningType || task.cleaningType === filters.cleaningType) &&
      (!filters.cleanStatus || task.cleanStatus === filters.cleanStatus)
    );
  });

  // Sort the filtered tasks by date, from oldest to newest
  const sortedTasks = [...filteredTasks].sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

  return (
    <table>
      <thead>
        <tr>
          {isHeavyCleaning && <th>Train Number</th>}
          {isHeavyCleaning && <th>Scheduled Date</th>}
          {isHeavyCleaning && <th>Cleaning Type</th>}
          {isHeavyCleaning && <th>Cleaning Status</th>}
          {isHeavyCleaning && <th>Cleaned Date</th>}
          {isHeavyCleaning && <th></th>}
        </tr>
      </thead>
      <tbody>
        {sortedTasks.map((task, index) => (
          <tr
            key={index}
            className={
              task.cleanStatus === 'Cleaned'
                ? 'task-cleaned'
                : task.scheduledTime === today
                ? 'task-today'
                : task.scheduledTime < today && task.cleanStatus === 'Uncleaned'
                ? 'task-overdue'
                : 'task-coming'
            }
          >
            <td>{task.trainModel}</td>
            <td>{task.scheduledTime}</td>
            {isHeavyCleaning && <td>{task.cleaningType}</td>}
            <td>
              <input
                type="checkbox"
                checked={task.cleanStatus === 'Cleaned'}
                onChange={() => handleCleanCheck(index)}
              />
            </td>
            {isHeavyCleaning && (
              <td>{task.cleanStatus === 'Cleaned' ? task.cleanedDate : ''}</td>
            )}
            {isHeavyCleaning && (
              <td>
                <RubbishBinIcon onClick={() => handleRemoveTask(index)} />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState({
    trainModel: '',
    scheduledTime: '',
    cleaningType: cleaningTypes[0]
  });
  const [today, setToday] = useState(new Date().toISOString().split('T')[0]);
  const [activeSection, setActiveSection] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [filters, setFilters] = useState({
    trainNumber: '',
    date: '',
    cleaningType: '',
    cleanStatus: ''
  });
  
  const [trainNumbers, setTrainNumbers] = useState([]);
  const [workbook, setWorkbook] = useState(null);
  const [showAllTrainDetails, setShowAllTrainDetails] = useState(false);
  const [allTrainData, setAllTrainData] = useState({});
  const [showDetailsTable, setShowDetailsTable] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setToday(new Date().toISOString().split('T')[0]);
    }, 86400000);

    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const newTask = {
      trainModel: formData.trainModel,
      scheduledTime: formData.scheduledTime,
      cleaningType: formData.cleaningType,
      cleanStatus: 'Uncleaned'
    };
    setTasks(prevTasks => {
      const updatedTasks = [...prevTasks, newTask];
      return updatedTasks.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
    });
    setFormData({
      trainModel: '',
      scheduledTime: '',
      cleaningType: cleaningTypes[0]
    });
  };

  const handleCleanCheck = (index) => {
    const updatedTasks = [...tasks];
    if (updatedTasks[index].cleanStatus === 'Uncleaned') {
      updatedTasks[index].cleanStatus = 'Cleaned';
      updatedTasks[index].cleanedDate = new Date().toISOString().split('T')[0];
    } else {
      updatedTasks[index].cleanStatus = 'Uncleaned';
      updatedTasks[index].cleanedDate = '';
    }
    setTasks(updatedTasks);
  };

  const handleRemoveTask = (index) => {
    const updatedTasks = tasks.filter((_, i) => i !== index);
    setTasks(updatedTasks);
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      setWorkbook(wb);
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      const formattedData = data.slice(15).filter((row, index) => index % 2 === 0).map((row, index) => {
        const currentRow = row.join('');
        const nextRow = data[16 + index * 2] ? data[16 + index * 2].join('') : '';
        
        return {
          trainNumber: row[1],
          wCount: (currentRow.match(/W/g) || []).length,
          cCount: (currentRow.match(/C/g) || []).length,
          sCount: (currentRow.match(/S/g) || []).length,
          phdCount: (nextRow.match(/P/g) || []).length,
          tadCount: (nextRow.match(/T/g) || []).length,
          hhsCount: (nextRow.match(/H/g) || []).length
        };
      }).filter(row => row.trainNumber && row.trainNumber.trim() !== '');
  
      setExcelData(formattedData);
      setTrainNumbers([...new Set(formattedData.map(row => row.trainNumber))]);
      // Update allTrainData
    const newAllTrainData = {};
    formattedData.forEach(row => {
      if (!newAllTrainData[row.trainNumber]) {
        newAllTrainData[row.trainNumber] = {};
      }
      newAllTrainData[row.trainNumber][today] = true;
    });
    setAllTrainData(newAllTrainData);
  };

  reader.readAsArrayBuffer(file);
};

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const handleShowAllTrainDetails = () => {
    if (workbook) {
      const ws = workbook.Sheets[workbook.SheetNames[0]];
      const range = XLSX.utils.decode_range(ws['!ref']);
  
      // Read dates from row 13
      const dates = [];
      for (let col = 7; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 12, c: col });
        if (ws[cellAddress] && ws[cellAddress].v) {
          dates.push({ date: ws[cellAddress].v, col });
        }
      }
  
      // Sort dates
      dates.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });
  
      const allData = {};
      for (let row = 15; row <= range.e.r; row += 2) {
        const trainNumberCell = ws[XLSX.utils.encode_cell({ r: row, c: 1 })];
        if (trainNumberCell && trainNumberCell.v) {
          const trainNumber = trainNumberCell.v;
          allData[trainNumber] = {};
          dates.forEach(({ date, col }) => {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            allData[trainNumber][date] = ws[cellAddress] && ws[cellAddress].v === 'W';
          });
        }
      }
  
      setAllTrainData(allData);
      setShowAllTrainDetails(prevState => !prevState);
      setShowDetailsTable(prevState => !prevState);
    }
  };

  const getUniqueValues = (key) => {
    const uniqueValues = [...new Set(tasks.map(task => task[key]))];
    return uniqueValues.sort((a, b) => {
      if (key === 'trainModel') {
        // Assuming train numbers are strings that can be compared lexicographically
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      }
      return a.localeCompare(b);
    });
  };

  return (
    <div className='App'>
      <h1>TML Cleaning Monitoring System</h1>
      
      {!activeSection && (
        <div className="button-container">
          <button className="big-button" onClick={() => handleSectionChange('Daily Cleaning')}>
            Daily Cleaning
          </button>
          <button className="big-button" onClick={() => handleSectionChange('Heavy Cleaning')}>
            Heavy Cleaning
          </button>
        </div>
      )}
  
  {activeSection === 'Heavy Cleaning' && (
  <>
    <h2>Heavy Cleaning</h2>
    <form onSubmit={handleSubmit} className="add-task-form">
      <div className="add-task-row">
        <label>
          Add new task: 
          <input
            type="text"
            name="trainModel"
            value={formData.trainModel}
            onChange={handleInputChange}
            placeholder="Train Number"
            required
          />
        </label>
        <input
          type="date"
          name="scheduledTime"
          value={formData.scheduledTime}
          onChange={handleInputChange}
          required
        />
        <select
          name="cleaningType"
          value={formData.cleaningType}
          onChange={handleInputChange}
          required
        >
          {cleaningTypes.map((type, index) => (
            <option key={index} value={type}>{type}</option>
          ))}
        </select>
        <button type="submit">Add Task</button>
      </div>
    </form>

    <div className="filter-row">
      <label>
        Filter Here: </label>
      <select name="trainNumber" onChange={handleFilterChange} value={filters.trainNumber || ''}>
        <option value="">All Train Numbers</option>
        {getUniqueValues('trainModel').map((trainNumber, index) => (
          <option key={index} value={trainNumber}>{trainNumber}</option>
        ))}
      </select>
      <input
        type="date"
        name="date"
        onChange={handleFilterChange}
        value={filters.date || ''}
      />
      <select name="cleaningType" onChange={handleFilterChange} value={filters.cleaningType || ''}>
        <option value="">All Cleaning Types</option>
        {cleaningTypes.map((type, index) => (
          <option key={index} value={type}>{type}</option>
        ))}
      </select>
      <select name="cleanStatus" onChange={handleFilterChange} value={filters.cleanStatus || ''}>
        <option value="">All Statuses</option>
        <option value="Cleaned">Cleaned</option>
        <option value="Uncleaned">Uncleaned</option>
      </select>
    </div>
    <button onClick={() => setActiveSection(null)} className="back-button">Back to Main Menu</button>
    <TaskTable
      tasks={tasks.filter(task => cleaningTypes.includes(task.cleaningType))}
      handleCleanCheck={handleCleanCheck}
      handleRemoveTask={handleRemoveTask}
      today={today}
      isHeavyCleaning={true}
      filters={filters}
    />
  </>
)}
  
  {activeSection === 'Daily Cleaning' && (
  <>
    <h2>Daily Cleaning</h2>
    <div className="daily-cleaning-controls">
      <div className="file-input-wrapper">
        <button className="import-button">Import from Excel</button>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
      </div>
      <button onClick={handleShowAllTrainDetails} className="show-all-trains-button">
        {showAllTrainDetails ? 'Hide Details Table' : 'Show Details Table'}
      </button>
      <button onClick={() => setActiveSection(null)} className="back-button">Back to Main Menu</button>
    </div>

    {showAllTrainDetails && (
  <div className="all-train-details">
    <h3>All Train Details</h3>
    <table>
      <thead>
        <tr>
          <th>Train Number</th>
          {Object.keys(Object.values(allTrainData)[0] || {})
            .sort((a, b) => new Date(a) - new Date(b))
            .map(date => (
              <th key={date}>{date}</th>
            ))}
        </tr>
      </thead>
      <tbody>
        {Object.entries(allTrainData).map(([trainNumber, trainData]) => {
          const sortedDates = Object.keys(trainData)
            .sort((a, b) => new Date(a) - new Date(b));
          const wCount = excelData.find(row => row.trainNumber === trainNumber)?.wCount || 0;

          return (
            <tr key={trainNumber}>
              <td>{trainNumber}</td>
              {sortedDates.map((date, index) => (
                <td key={date}>
                  {index === sortedDates.length - 1 ? wCount : (trainData[date] ? '✓' : '')}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
)}

    {showDetailsTable && (
      <table>
        <thead>
          <tr>
            <th>Train Number</th>
            <th>External Water Washed (W Count)</th>
            <th>Train Compartment Cleaned (C Count)</th>
            <th>Released to Morning Service (S Count)</th>
            <th>PHD</th>
            <th>TAD</th>
            <th>HHS</th>
          </tr>
        </thead>
        <tbody>
          {excelData.length > 0 ? (
            excelData.map((row, index) => (
              <tr key={index}>
                <td>{row.trainNumber}</td>
                <td>{row.wCount}</td>
                <td>{row.cCount}</td>
                <td>{row.sCount}</td>
                <td>{row.phdCount}</td>
                <td>{row.tadCount}</td>
                <td>{row.hhsCount}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7">No data imported yet. Please upload an Excel file.</td>
            </tr>
              )}
            </tbody>
          </table>
        )}
        </>
      )}
    </div>
  );
}

export default App;

