import React, { useState, useEffect, useMemo } from 'react';
import { useVault } from '../../context/VaultContext';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, List, LayoutGrid, Clock, X, Trash2, BellRing } from 'lucide-react';
import type { CalendarEvent } from '../../lib/vault';
import { ConfirmModal } from '../modals/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

const COLOR_CLASSES = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  yellow: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
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

    checkNotifications();
    interval = window.setInterval(checkNotifications, 60000);
    return () => clearInterval(interval);
  }, [events, updateVaultData]);

  // --- Grid Calculations ---
  const { days, allItems } = useMemo(() => {
    const dInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const dayArray = Array.from({ length: firstDay }, () => null).concat(
      Array.from({ length: dInMonth }, (_, i) => i + 1)
    );
    
    while (dayArray.length < 42) dayArray.push(null);

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
    if ((ev as any).isTask) return;
    setSelectedDateStr(ev.date);
    setEditingEvent(ev);
    setIsModalOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    if (eventId.startsWith('task-')) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('eventId', eventId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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

  // --- Render Agenda View ---
  const renderAgenda = () => {
    const upcoming = allItems
      .filter(i => new Date(i.date).getTime() >= new Date(new Date().setHours(0,0,0,0)).getTime())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (upcoming.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-zinc-600 text-xs py-12">
          <CalendarIcon size={36} className="opacity-20 mb-3" strokeWidth={1.5} />
          <p>No upcoming events or scheduled tasks.</p>
        </div>
      );
    }

    let lastDate = '';
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
        {upcoming.map(item => {
          const dateLabel = new Date(item.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
          const showHeader = lastDate !== dateLabel;
          if (showHeader) lastDate = dateLabel;

          return (
            <React.Fragment key={item.id}>
              {showHeader && (
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mt-6 mb-3 border-b border-gray-100 dark:border-[#262626] pb-1.5">
                  {dateLabel}
                </h3>
              )}
              <div 
                onClick={(e) => handleEventClick(e as any, item)}
                className={`p-3 rounded-lg border mb-2 flex items-center justify-between cursor-pointer transition-colors active:scale-[0.98] ${COLOR_CLASSES[item.color || 'blue']}`}
              >
                <div>
                  <h4 className="font-semibold text-xs text-gray-900 dark:text-white">{item.title}</h4>
                  {item.description && <p className="text-[11px] opacity-75 mt-0.5">{item.description}</p>}
                </div>
                <div className="flex items-center gap-3 opacity-80 text-xs">
                  {(item as any).isTask && <span className="text-[10px] font-semibold uppercase border border-current px-1.5 py-0.2 rounded">Task</span>}
                  {item.time && <span className="flex items-center gap-1 text-[11px] tabular-nums font-medium"><Clock size={12} strokeWidth={1.75} /> {item.time}</span>}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] overflow-hidden">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Event"
        message="Are you sure you want to permanently delete this event?"
      />

      {/* Header */}
      <div className="border-b border-gray-200 dark:border-[#262626] px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111113] shrink-0">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon size={20} strokeWidth={1.75} className="text-zinc-700 dark:text-zinc-300" />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-zinc-100">Planner</h1>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-gray-200 dark:border-[#262626]">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 active:scale-[0.97] ${
                viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-2xs' : 'text-gray-500'
              }`}
            >
              <LayoutGrid size={13} strokeWidth={1.75} /> 
              <span>Grid</span>
            </button>
            <button 
              onClick={() => setViewMode('agenda')} 
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 active:scale-[0.97] ${
                viewMode === 'agenda' ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-2xs' : 'text-gray-500'
              }`}
            >
              <List size={13} strokeWidth={1.75} /> 
              <span>Agenda</span>
            </button>
          </div>
        </div>

        {/* Date Navigator Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <button 
            onClick={handleToday} 
            className="px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md border border-gray-200 dark:border-[#262626] transition-colors active:scale-[0.97]"
          >
            Today
          </button>
          
          <div className="flex items-center gap-1">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md text-gray-500 active:scale-[0.95]"><ChevronLeft size={16} strokeWidth={1.75} /></button>
            <h2 className="text-xs sm:text-sm font-semibold w-28 sm:w-36 text-center text-gray-900 dark:text-zinc-100 tabular-nums truncate">
              {currentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
            </h2>
            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md text-gray-500 active:scale-[0.95]"><ChevronRight size={16} strokeWidth={1.75} /></button>
          </div>

          <button 
            onClick={() => { setSelectedDateStr(new Date().toISOString().split('T')[0]); setEditingEvent(null); setIsModalOpen(true); }} 
            className="flex items-center gap-1.5 px-3 py-1 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium rounded-md transition-colors shadow-2xs active:scale-[0.97]"
          >
            <Plus size={14} strokeWidth={1.75} /> 
            <span className="hidden sm:inline">New Event</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'agenda' ? renderAgenda() : (
        <div className="flex-1 flex flex-col p-3 sm:p-5 min-h-0 overflow-x-auto">
          <div className="min-w-[550px] flex-1 flex flex-col">
            <div className="grid grid-cols-7 mb-1 shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 py-1">
                  {d}
                </div>
              ))}
            </div>
            
            <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1.5 min-h-0">
              {days.map((day, idx) => {
                if (!day) return <div key={idx} className="bg-gray-50/40 dark:bg-zinc-900/10 rounded-lg min-h-0"></div>;
                
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayItems = allItems.filter(e => e.date === dateStr);
                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                return (
                  <div 
                    key={idx} 
                    onClick={() => handleDayClick(day)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, dateStr)}
                    className={`bg-white dark:bg-[#141416] rounded-lg border p-1.5 flex flex-col min-h-0 transition-colors cursor-pointer hover:border-gray-400 dark:hover:border-zinc-600 ${
                      isToday ? 'border-zinc-900 dark:border-white ring-1 ring-zinc-400 dark:ring-zinc-600' : 'border-gray-200 dark:border-[#262626]'
                    }`}
                  >
                    <span className={`text-[10px] font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full shrink-0 tabular-nums ${
                      isToday ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'text-gray-400 dark:text-zinc-500'
                    }`}>
                      {day}
                    </span>
                    
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto min-h-0">
                      {dayItems.map(item => (
                        <div
                          key={item.id}
                          draggable={!(item as any).isTask}
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onClick={(e) => handleEventClick(e, item)}
                          className={`text-[9px] px-1 py-0.5 rounded font-medium truncate border ${COLOR_CLASSES[item.color || 'blue']} ${!(item as any).isTask ? 'cursor-grab active:cursor-grabbing' : 'opacity-80'}`}
                          title={item.title}
                        >
                          {item.time && <span className="mr-1 opacity-70 tabular-nums">{item.time}</span>}
                          {item.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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
              setEditingEvent(null);
            }}
            onDelete={() => {
              if (editingEvent) {
                setEventToDelete(editingEvent.id);
                setIsModalOpen(false);
                setIsDeleteModalOpen(true);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Event Modal Subcomponent ---
const EventModal: React.FC<{ 
  isOpen: boolean;
  onClose: () => void;
  initialDate: string;
  ev: CalendarEvent | null;
  onSave: (ev: CalendarEvent) => void;
  onDelete?: () => void;
}> = ({ onClose, initialDate, ev, onSave, onDelete }) => {
  const [title, setTitle] = useState(ev?.title || '');
  const [date, setDate] = useState(ev?.date || initialDate);
  const [time, setTime] = useState(ev?.time || '');
  const [desc, setDesc] = useState(ev?.description || '');
  const [color, setColor] = useState<CalendarEvent['color']>(ev?.color || 'blue');

  const handleSave = () => {
    if (!title.trim()) return;
    const newEvent: CalendarEvent = {
      id: ev?.id || crypto.randomUUID(),
      title,
      date,
      time: time || undefined,
      description: desc || undefined,
      color,
      notified: ev ? ev.notified : false
    };
    onSave(newEvent);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-2xs" />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="relative w-full max-w-sm bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#222]">
          <h3 className="font-semibold text-xs text-gray-900 dark:text-zinc-100 uppercase tracking-wider">{ev ? 'Edit Event' : 'New Event'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors active:scale-[0.95]"><X size={15} strokeWidth={1.75} /></button>
        </div>
        
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-white focus:outline-none focus:border-zinc-400 font-medium" placeholder="Event title" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-white focus:outline-none focus:border-zinc-400 [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Time (Optional)</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-white focus:outline-none focus:border-zinc-400 [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full h-16 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md p-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-zinc-400 resize-none" placeholder="Notes..." />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Tag Color</label>
            <div className="flex gap-2 pt-0.5">
              {(['blue', 'red', 'green', 'yellow', 'purple'] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform active:scale-[0.95] ${COLOR_CLASSES[c]} ${color === c ? 'scale-115 border-zinc-900 dark:border-white' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-[#111113]/50 flex justify-between items-center shrink-0">
          {ev && onDelete ? (
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-rose-500 rounded transition-colors active:scale-[0.95]" title="Delete event">
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-[0.97]">Cancel</button>
            <button onClick={handleSave} className="px-3.5 py-1.5 text-xs font-medium bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-md transition-colors shadow-2xs active:scale-[0.97]">Save Event</button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
