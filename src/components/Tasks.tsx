import React, { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Plus, Clock, CheckCircle2, X, Trash2, GripVertical, CircleDashed, ListTodo, Play, Pause, RotateCcw, ArrowUpDown } from 'lucide-react';
import type { Task } from '../lib/vault';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from './ConfirmModal';

const PRIORITY_COLORS = {
  low: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  high: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  urgent: 'text-red-500 bg-red-500/10 border-red-500/20'
};

const PRIORITY_WEIGHT = { urgent: 4, high: 3, medium: 2, low: 1 };

const COLUMNS = [
  { id: 'todo', title: 'To Do', icon: <CircleDashed size={16} /> },
  { id: 'in-progress', title: 'In Progress', icon: <Clock size={16} /> },
  { id: 'done', title: 'Done', icon: <CheckCircle2 size={16} /> }
] as const;

export const Tasks: React.FC = () => {
  const { vaultData, updateVaultData } = useVault();
  const tasks = vaultData?.tasks || [];
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(false);

  // --- Pomodoro State ---
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');

  useEffect(() => {
    let interval: number;
    if (isTimerRunning && timeLeft > 0) {
      interval = window.setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      if (timerMode === 'focus') {
        setTimerMode('break');
        setTimeLeft(5 * 60);
        new Notification("Focus session complete! Take a 5 minute break.");
      } else {
        setTimerMode('focus');
        setTimeLeft(25 * 60);
        new Notification("Break is over! Ready to focus?");
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, timerMode]);

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerMode === 'focus' ? 25 * 60 : 5 * 60);
  };
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  // --- Task Handlers ---
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (sortByPriority) {
      // If sorting by priority, we only care about moving columns, not exact index
      const newTasks = tasks.map(t => t.id === draggableId ? { ...t, status: destination.droppableId as Task['status'] } : t);
      await updateVaultData({ tasks: newTasks });
      return;
    }

    const newTasks = Array.from(tasks);
    const sourceIndex = newTasks.findIndex(t => t.id === draggableId);
    if (sourceIndex === -1) return;
    
    // Remove task from global array
    const [movedTask] = newTasks.splice(sourceIndex, 1);
    movedTask.status = destination.droppableId as Task['status'];
    
    // Find where to insert it based on destination index in the filtered column
    const targetColumnTasks = newTasks.filter(t => t.status === destination.droppableId);
    
    if (destination.index >= targetColumnTasks.length) {
      newTasks.push(movedTask); // put at end
    } else {
      const targetTask = targetColumnTasks[destination.index];
      const targetGlobalIndex = newTasks.findIndex(t => t.id === targetTask.id);
      newTasks.splice(targetGlobalIndex, 0, movedTask); // insert before target
    }

    await updateVaultData({ tasks: newTasks });
  };

  const handleCreateTask = async (status: Task['status']) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: 'New Task',
      description: '',
      status,
      priority: 'medium',
      subtasks: [],
      createdAt: Date.now()
    };
    await updateVaultData({ tasks: [...tasks, newTask] });
    setEditingTask(newTask);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    const updatedTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    setEditingTask(updatedTask);
    await updateVaultData({ tasks: updatedTasks });
  };

  const handleDeleteTask = async () => {
    if (!editingTask) return;
    const updatedTasks = tasks.filter(t => t.id !== editingTask.id);
    await updateVaultData({ tasks: updatedTasks });
    setEditingTask(null);
    setIsDeleteModalOpen(false);
  };

  return (
    <div className="flex h-full bg-[#fafafa] dark:bg-[#0c0c0e] relative overflow-hidden">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to permanently delete "${editingTask?.title || 'this task'}"?`}
      />
      
      {/* Main Kanban Board */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header & Pomodoro */}
        <div className="h-20 shrink-0 border-b border-gray-200 dark:border-white/10 px-8 flex items-center justify-between bg-white dark:bg-[#121214]">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-3">
              <ListTodo className="text-accent" /> Tasks
            </h1>
            <div className="h-6 w-[1px] bg-gray-200 dark:bg-white/10"></div>
            <button 
              onClick={() => setSortByPriority(!sortByPriority)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sortByPriority ? 'bg-accent/10 text-accent' : 'bg-gray-100 dark:bg-zinc-900 text-gray-500 hover:text-gray-900 dark:hover:text-zinc-100'}`}
            >
              <ArrowUpDown size={14} /> 
              {sortByPriority ? 'Priority Sort: ON' : 'Priority Sort: OFF'}
            </button>
          </div>

          <div className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-900/50 p-2 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
            <div className="flex flex-col pr-4 border-r border-gray-200 dark:border-white/10">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                {timerMode === 'focus' ? 'Focus Mode' : 'Break Time'}
              </span>
              <span className={`text-xl font-mono font-bold leading-none ${isTimerRunning ? 'text-accent' : 'text-gray-700 dark:text-zinc-300'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="flex gap-1">
              <button onClick={toggleTimer} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isTimerRunning ? 'bg-accent/10 text-accent hover:bg-accent/20' : 'hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400'}`}>
                {isTimerRunning ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>
              <button onClick={resetTimer} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors text-gray-600 dark:text-zinc-400">
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Board Columns */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-6 h-full items-start">
              {COLUMNS.map(col => {
                let columnTasks = tasks.filter(t => t.status === col.id);
                if (sortByPriority) {
                  columnTasks = columnTasks.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
                }
                return (
                  <div key={col.id} className="flex flex-col w-80 shrink-0 h-full bg-gray-100/50 dark:bg-zinc-900/30 rounded-xl border border-gray-200 dark:border-white/5">
                    
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/5">
                      <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-zinc-300">
                        {col.icon} {col.title}
                        <span className="ml-2 text-xs py-0.5 px-2 bg-gray-200 dark:bg-black rounded-full text-gray-500">{columnTasks.length}</span>
                      </div>
                      <button onClick={() => handleCreateTask(col.id)} className="text-gray-400 hover:text-accent transition-colors">
                        <Plus size={18} />
                      </button>
                    </div>

                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.droppableProps}
                          className={`flex-1 p-3 overflow-y-auto space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-gray-200/50 dark:bg-zinc-800/30' : ''}`}
                        >
                          {columnTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => setEditingTask(task)}
                                  className={`bg-white dark:bg-[#18181b] p-4 rounded-xl border transition-colors cursor-pointer group ${
                                    snapshot.isDragging 
                                      ? 'border-accent shadow-xl shadow-accent/10 z-50' 
                                      : 'border-gray-200 dark:border-white/10 hover:border-accent/50 shadow-sm'
                                  } ${editingTask?.id === task.id ? 'ring-2 ring-accent ring-offset-2 dark:ring-offset-[#18181b]' : ''}`}
                                >
                                  <div className="flex justify-between items-start mb-2 gap-2">
                                    <h3 className="font-medium text-gray-900 dark:text-zinc-100 leading-snug line-clamp-2">
                                      {task.title || 'Untitled'}
                                    </h3>
                                    <GripVertical size={14} className="text-gray-300 dark:text-zinc-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  
                                  <div className="flex items-center gap-2 mt-4">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${PRIORITY_COLORS[task.priority]}`}>
                                      {task.priority}
                                    </span>
                                    {task.subtasks.length > 0 && (
                                      <span className="text-xs text-gray-500 dark:text-zinc-500 flex items-center gap-1 ml-auto">
                                        <ListTodo size={12} />
                                        {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      </div>

      {/* Slide-out Edit Panel */}
      <AnimatePresence>
        {editingTask && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-96 bg-white dark:bg-[#121214] border-l border-gray-200 dark:border-white/10 shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
                <h2 className="font-semibold text-lg">Edit Task</h2>
                <div className="flex gap-2">
                  <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => setEditingTask(null)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => handleUpdateTask({ ...editingTask, title: e.target.value })}
                    className="w-full text-xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-zinc-100 placeholder-gray-400"
                    placeholder="Task Title"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => handleUpdateTask({ ...editingTask, priority: p })}
                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors border ${
                          editingTask.priority === p 
                            ? PRIORITY_COLORS[p] 
                            : 'border-gray-200 dark:border-white/10 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date <span className="opacity-50">(Syncs to Calendar)</span></label>
                  <input
                    type="date"
                    value={editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        handleUpdateTask({ ...editingTask, dueDate: undefined });
                      } else {
                        const d = new Date(val + "T12:00:00");
                        handleUpdateTask({ ...editingTask, dueDate: d.getTime() });
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-accent [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</label>
                  <textarea
                    value={editingTask.description}
                    onChange={(e) => handleUpdateTask({ ...editingTask, description: e.target.value })}
                    className="w-full h-32 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    placeholder="Add details..."
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtasks</label>
                    <button 
                      onClick={() => handleUpdateTask({ ...editingTask, subtasks: [...editingTask.subtasks, { id: crypto.randomUUID(), title: '', isCompleted: false }] })}
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {editingTask.subtasks.map(subtask => (
                      <div key={subtask.id} className="flex items-start gap-3 group">
                        <button
                          onClick={() => handleUpdateTask({ ...editingTask, subtasks: editingTask.subtasks.map(s => s.id === subtask.id ? { ...s, isCompleted: !s.isCompleted } : s) })}
                          className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${subtask.isCompleted ? 'bg-accent border-accent text-white' : 'border-gray-300 dark:border-zinc-700 text-transparent hover:border-accent'}`}
                        >
                          <CheckCircle2 size={12} />
                        </button>
                        <input
                          type="text"
                          value={subtask.title}
                          onChange={(e) => handleUpdateTask({ ...editingTask, subtasks: editingTask.subtasks.map(s => s.id === subtask.id ? { ...s, title: e.target.value } : s) })}
                          className={`flex-1 bg-transparent text-sm focus:outline-none ${subtask.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-zinc-100'}`}
                          placeholder="Subtask..."
                        />
                        <button 
                          onClick={() => handleUpdateTask({ ...editingTask, subtasks: editingTask.subtasks.filter(s => s.id !== subtask.id) })}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};


