import React, { useState, useEffect, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, List, LayoutGrid, Clock, AlertCircle, X, Trash2, Tag, BellRing } from 'lucide-react';
import type { CalendarEvent, Task } from '../lib/vault';
import { ConfirmModal } from './ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

const COLOR_CLASSES = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  task: 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700 border-dashed'
};

export const Calendar: React.FC = () => {
  const { vaultData, updateVaultData } = useVault();
  const events = vaultData?.events || [];
  const tasks = vaultData?.tasks || [];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // --- Tauri Notifications ---
  useEffect(() => {
    let interval: number;
    const checkNotifications = async () => {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      
      if (permissionGranted) {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let updatedEvents = [...events];
        let changed = false;

        for (let i = 0; i < updatedEvents.length; i++) {
          const ev = updatedEvents[i];
          if (ev.date === todayStr && ev.time && !ev.notified) {
            const [h, m] = ev.time.split(':').map(Number);
            const eventMinutes = h * 60 + m;
            
            // Notify if event is within the next 15 minutes
            if (eventMinutes - currentMinutes <= 15 && eventMinutes >= currentMinutes) {
              sendNotification({
                title: 'Upcoming Event Reminder',
                body: `${ev.title} starts at ${ev.time}`
              });
              updatedEvents[i] = { ...ev, notified: true };
              changed = true;
            }
          }
        }
        if (changed) {
          updateVaultData({ events: updatedEvents });
        }
      }
    };

    checkNotifications(); // check immediately
    interval = window.setInterval(checkNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [events, updateVaultData]);

  // --- Grid Calculations ---
  const { days, allItems } = useMemo(() => {
    const dInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const dayArray = Array.from({ length: firstDay }, () => null).concat(
      Array.from({ length: dInMonth }, (_, i) => i + 1)
    );
    
    // Fill remaining to complete the grid (6 rows of 7 = 42)
    while (dayArray.length < 42) dayArray.push(null);

    // Merge tasks with due dates into the events array for rendering
    const mappedTasks: (CalendarEvent & { isTask: true })[] = tasks
      .filter(t => t.dueDate)
      .map(t => {
        const d = new Date(t.dueDate!);
        return {
          id: `task-${t.id}`,
          title: t.title,
          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
          isTask: true,
          color: 'task' as any
        };
      });

    const combined = [...events, ...mappedTasks];
    
    return { days: dayArray, allItems: combined };
  }, [year, month, events, tasks]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, ev: CalendarEvent) => {
    e.stopPropagation();
    if ((ev as any).isTask) return; // Can't edit tasks from calendar yet
    setSelectedDateStr(ev.date);
    setEditingEvent(ev);
    setIsModalOpen(true);
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    if (eventId.startsWith('task-')) {
      e.preventDefault(); // Don't allow dragging tasks
      return;
    }
    e.dataTransfer.setData('eventId', eventId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('eventId');
    if (!eventId) return;

    const targetEvent = events.find(ev => ev.id === eventId);
    if (targetEvent && targetEvent.date !== targetDateStr) {
      const updated = events.map(ev => ev.id === eventId ? { ...ev, date: targetDateStr, notified: false } : ev);
      await updateVaultData({ events: updated });
    }
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;
    const updated = events.filter(e => e.id !== eventToDelete);
    await updateVaultData({ events: updated });
    setIsDeleteModalOpen(false);
    setEventToDelete(null);
  };

  // --- Render Agendas ---
  const renderAgenda = () => {
    const upcoming = allItems
      .filter(i => new Date(i.date).getTime() >= new Date(new Date().setHours(0,0,0,0)).getTime())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (upcoming.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <CalendarIcon size={48} className="opacity-20 mb-4" />
          <p>No upcoming events or due tasks.</p>
        </div>
      );
    }

    let lastDate = '';
    return (
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
        {upcoming.map(item => {
          const dateLabel = new Date(item.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
          const showHeader = lastDate !== dateLabel;
          if (showHeader) lastDate = dateLabel;

          return (
            <React.Fragment key={item.id}>
              {showHeader && <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mt-8 mb-4 border-b border-gray-200 dark:border-white/10 pb-2">{dateLabel}</h3>}
              <div 
                onClick={(e) => handleEventClick(e as any, item)}
                className={`p-4 rounded-xl border mb-3 flex items-center justify-between cursor-pointer transition-transform hover:-translate-y-0.5 ${COLOR_CLASSES[item.color || 'blue']}`}
              >
                <div>
                  <h4 className="font-bold">{item.title}</h4>
                  {item.description && <p className="text-sm opacity-80 mt-1">{item.description}</p>}
                </div>
                <div className="flex items-center gap-4 opacity-80">
                  {(item as any).isTask && <span className="text-xs font-bold uppercase border border-current px-2 py-0.5 rounded">Task</span>}
                  {item.time && <span className="flex items-center gap-1 text-sm font-medium"><Clock size={14}/> {item.time}</span>}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#fafafa] dark:bg-[#0c0c0e] overflow-hidden">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Event"
        message="Are you sure you want to permanently erase this event from your calendar?"
      />

      {/* Header */}
      <div className="h-20 shrink-0 border-b border-gray-200 dark:border-white/10 px-8 flex items-center justify-between bg-white dark:bg-[#121214]">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-3">
            <CalendarIcon className="text-accent" /> Planner
          </h1>
          <div className="h-6 w-[1px] bg-gray-200 dark:bg-white/10 mx-2"></div>
          <div className="flex bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-white dark:bg-[#18181b] text-accent shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'}`}>
              <LayoutGrid size={14}/> Grid
            </button>
            <button onClick={() => setViewMode('agenda')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center gap-2 ${viewMode === 'agenda' ? 'bg-white dark:bg-[#18181b] text-accent shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'}`}>
              <List size={14}/> Agenda
            </button>
          </div>
        </div>
        
        {viewMode === 'grid' && (
          <div className="flex items-center gap-6">
            <button onClick={handleToday} className="px-3 py-1.5 text-sm font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-lg transition-colors border border-gray-200 dark:border-white/10">Today</button>
            <div className="flex items-center gap-4">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-lg text-gray-500"><ChevronLeft size={20}/></button>
              <h2 className="text-lg font-bold w-40 text-center text-gray-900 dark:text-zinc-100">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-lg text-gray-500"><ChevronRight size={20}/></button>
            </div>
            <button onClick={() => { setSelectedDateStr(new Date().toISOString().split('T')[0]); setEditingEvent(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20">
              <Plus size={16} /> New Event
            </button>
          </div>
        )}
      </div>

      {/* Main View */}
      {viewMode === 'agenda' ? renderAgenda() : (
        <div className="flex-1 flex flex-col p-6 min-h-0">
          <div className="grid grid-cols-7 mb-2 shrink-0">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-bold uppercase tracking-wider text-gray-500 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2 min-h-0">
            {days.map((day, idx) => {
              if (!day) return <div key={idx} className="bg-gray-50/50 dark:bg-zinc-900/20 rounded-xl border border-transparent min-h-0"></div>;
              
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayItems = allItems.filter(e => e.date === dateStr);
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

              return (
                <div 
                  key={idx} 
                  onClick={() => handleDayClick(day)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, dateStr)}
                  className={`bg-white dark:bg-[#18181b] rounded-xl border p-2 flex flex-col min-h-0 transition-colors cursor-pointer hover:border-accent/50 ${isToday ? 'border-accent shadow-sm ring-1 ring-accent/30' : 'border-gray-200 dark:border-white/10'}`}
                >
                  <span className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${isToday ? 'bg-accent text-white' : 'text-gray-400'}`}>
                    {day}
                  </span>
                  
                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar min-h-0">
                    {dayItems.map(item => (
                      <div
                        key={item.id}
                        draggable={!(item as any).isTask}
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onClick={(e) => handleEventClick(e, item)}
                        className={`text-[10px] px-1.5 py-1 rounded font-semibold truncate border ${COLOR_CLASSES[item.color || 'blue']} ${!(item as any).isTask ? 'cursor-grab active:cursor-grabbing' : 'opacity-80'}`}
                        title={item.title}
                      >
                        {item.time && <span className="mr-1 opacity-75">{item.time}</span>}
                        {item.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <EventModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            initialDate={selectedDateStr}
            ev={editingEvent}
            onSave={async (newEv) => {
              if (editingEvent) {
                await updateVaultData({ events: events.map(e => e.id === newEv.id ? newEv : e) });
              } else {
                await updateVaultData({ events: [...events, newEv] });
              }
              setIsModalOpen(false);
            }}
            onDeleteRequest={(id) => {
              setEventToDelete(id);
              setIsModalOpen(false);
              setIsDeleteModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

const EventModal: React.FC<{ isOpen: boolean, onClose: () => void, initialDate: string, ev: CalendarEvent | null, onSave: (e: CalendarEvent) => void, onDeleteRequest: (id: string) => void }> = ({ onClose, initialDate, ev, onSave, onDeleteRequest }) => {
  const [title, setTitle] = useState(ev?.title || '');
  const [date, setDate] = useState(ev?.date || initialDate);
  const [time, setTime] = useState(ev?.time || '');
  const [desc, setDesc] = useState(ev?.description || '');
  const [color, setColor] = useState<CalendarEvent['color']>(ev?.color || 'blue');
  const [recurring, setRecurring] = useState<CalendarEvent['recurring']>(ev?.recurring || 'none');

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: ev?.id || crypto.randomUUID(),
      title,
      date,
      time: time || undefined,
      description: desc,
      color,
      recurring,
      notified: false
    });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-md bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-zinc-100">{ev ? 'Edit Event' : 'New Event'}</h3>
          <div className="flex items-center gap-2">
            {ev && <button onClick={() => onDeleteRequest(ev.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"><X size={18} /></button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Event Title" className="w-full text-xl font-bold bg-transparent border-b border-transparent focus:border-accent pb-2 focus:outline-none text-gray-900 dark:text-white" autoFocus />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Time <span className="opacity-50">(Optional)</span></label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Color Tag</label>
            <div className="flex gap-2">
              {(['blue', 'red', 'green', 'yellow', 'purple'] as const).map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-gray-900 dark:border-white' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: `var(--color-${c}-500, ${c === 'blue' ? '#3b82f6' : c === 'red' ? '#ef4444' : c === 'green' ? '#10b981' : c === 'yellow' ? '#f59e0b' : '#8b5cf6'})` }} />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Add notes or location..." className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent h-24 resize-none" />
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-white/10">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-zinc-400">
              <span className="flex items-center gap-2"><BellRing size={14}/> Desktop Notifications enabled (15m before event)</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim()} className="px-5 py-2.5 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors shadow-md disabled:opacity-50">Save Event</button>
        </div>

      </motion.div>
    </div>
  );
};

