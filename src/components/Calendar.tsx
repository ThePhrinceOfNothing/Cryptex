import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEvent } from '../lib/vault';
import { motion } from 'framer-motion';

export const Calendar: React.FC = () => {
  const { vaultData, updateVaultData } = useVault();
  const events = vaultData?.events || [];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);
    setIsAdding(true);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !selectedDateStr) return;

    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      date: selectedDateStr,
      title: eventTitle.trim()
    };

    await updateVaultData({ events: [...events, newEvent] });
    setEventTitle('');
    setIsAdding(false);
  };

  // Generate blank cells for days before the 1st
  const blanks = Array.from({ length: firstDayOfMonth }).map((_, i) => (
    <div key={`blank-${i}`} className="min-h-[120px] bg-gray-50/50 border-r border-b border-gray-200"></div>
  ));

  // Generate day cells
  const days = Array.from({ length: daysInMonth }).map((_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.date === dateStr);

    return (
      <div 
        key={`day-${day}`} 
        onClick={() => handleDayClick(day)}
        className="min-h-[120px] bg-white border-r border-b border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors group relative"
      >
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium text-gray-700">{day}</span>
          <Plus className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <div className="mt-2 flex flex-col gap-1">
          {dayEvents.map(evt => (
            <div key={evt.id} className="bg-accent/10 text-accent text-xs font-medium px-2 py-1 rounded-full truncate border border-accent/20">
              {evt.title}
            </div>
          ))}
        </div>
      </div>
    );
  });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="p-8 h-full bg-white flex flex-col max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="text-accent w-6 h-6" />
            Calendar
          </h1>
          <p className="text-sm text-gray-500 mt-1">Schedule and manage your secure events.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={handlePrevMonth} className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-lg font-medium text-gray-900 w-32 text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={handleNextMonth} className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-end gap-4 shrink-0">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              New Event on {selectedDateStr}
            </label>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Event Title..."
              autoFocus
              className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <motion.button
              onClick={handleAddEvent}
              disabled={!eventTitle.trim()}
              whileHover={{ scale: !eventTitle.trim() ? 1 : 1.02 }}
              whileTap={{ scale: !eventTitle.trim() ? 1 : 0.97 }}
              className="px-6 py-2 bg-accent hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-md transition-colors"
            >
              Save Event
            </motion.button>
          </div>
        </div>
      )}

      {/* CSS Grid Calendar */}
      <div className="flex-1 border-t border-l border-gray-200 rounded-lg overflow-hidden flex flex-col">
        {/* Days Header */}
        <div className="grid grid-cols-7 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-b border-gray-200">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1 overflow-y-auto">
          {blanks}
          {days}
        </div>
      </div>
    </div>
  );
};
