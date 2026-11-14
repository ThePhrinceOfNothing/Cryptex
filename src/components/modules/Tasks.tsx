import React, { useState, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Plus, Clock, CheckCircle2, Check, X, Trash2, GripVertical, CircleDashed, ListTodo, Play, Pause, RotateCcw, ArrowUpDown } from 'lucide-react';
import type { Task } from '../../lib/vault';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from '../modals/ConfirmModal';

const PRIORITY_COLORS = {
  low: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  medium: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  high: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  urgent: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
};

const PRIORITY_WEIGHT = { urgent: 4, high: 3, medium: 2, low: 1 };

const COLUMNS = [
  { id: 'todo', title: 'To Do', icon: <CircleDashed size={14} strokeWidth={1.75} /> },
  { id: 'in-progress', title: 'In Progress', icon: <Clock size={14} strokeWidth={1.75} /> },
  { id: 'done', title: 'Done', icon: <CheckCircle2 size={14} strokeWidth={1.75} /> }
] as const;

export const Tasks: React.FC = () => {
  const { vaultData, updateVaultData } = useVault();
  const tasks = vaultData?.tasks || [];
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [mobileActiveColumn, setMobileActiveColumn] = useState<Task['status']>('todo');

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
      const newTasks = tasks.map(t => t.id === draggableId ? { ...t, status: destination.droppableId as Task['status'] } : t);
      await updateVaultData({ tasks: newTasks });
      return;
    }

    const newTasks = Array.from(tasks);
    const sourceIndex = newTasks.findIndex(t => t.id === draggableId);
    if (sourceIndex === -1) return;
    
    const [movedTask] = newTasks.splice(sourceIndex, 1);
    movedTask.status = destination.droppableId as Task['status'];
    
    const targetColumnTasks = newTasks.filter(t => t.status === destination.droppableId);
    
    if (destination.index >= targetColumnTasks.length) {
      newTasks.push(movedTask);
    } else {
      const targetTask = targetColumnTasks[destination.index];
      const targetGlobalIndex = newTasks.findIndex(t => t.id === targetTask.id);
      newTasks.splice(targetGlobalIndex, 0, movedTask);
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

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId && t.subtasks) {
        const updatedSubtasks = t.subtasks.map(s => 
          s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
        );
        return { ...t, subtasks: updatedSubtasks };
      }
      return t;
    });
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
    <div className="flex h-full bg-white dark:bg-[#0a0a0a] relative overflow-hidden flex-col">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to permanently delete "${editingTask?.title || 'this task'}"?`}
      />
      
      {/* Header & Controls */}
      <div className="border-b border-gray-200 dark:border-[#262626] px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111113] shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <ListTodo size={20} strokeWidth={1.75} className="text-zinc-700 dark:text-zinc-300" />
            <span>Tasks</span>
          </h1>
          <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800" />
          <button 
            onClick={() => setSortByPriority(!sortByPriority)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors active:scale-[0.97] ${
              sortByPriority 
                ? 'bg-zinc-200 dark:bg-zinc-800 text-gray-900 dark:text-white' 
                : 'bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100'
            }`}
          >
            <ArrowUpDown size={13} strokeWidth={1.75} /> 
            <span>{sortByPriority ? 'Priority: High to Low' : 'Default Order'}</span>
          </button>
        </div>

        {/* Pomodoro Timer (Rule 18 tabular-nums) */}
        <div className="self-start sm:self-auto flex items-center gap-3 bg-gray-50 dark:bg-[#141416] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#262626] shadow-2xs">
          <div className="flex flex-col pr-3 border-r border-gray-200 dark:border-[#262626]">
            <span className="text-[9px] uppercase font-semibold text-gray-500 dark:text-zinc-500 tracking-wider">
              {timerMode === 'focus' ? 'Focus' : 'Break'}
            </span>
            <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-zinc-100">
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={toggleTimer} 
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 transition-colors active:scale-[0.95]"
              title={isTimerRunning ? "Pause timer" : "Start timer"}
            >
              {isTimerRunning ? <Pause size={13} strokeWidth={1.75} /> : <Play size={13} strokeWidth={1.75} className="translate-x-[0.5px]" />}
            </button>
            <button 
              onClick={resetTimer} 
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors text-gray-500 dark:text-zinc-400 active:scale-[0.95]"
              title="Reset timer"
            >
              <RotateCcw size={13} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Column Tab Switcher (< 768px) */}
      <div className="flex md:hidden border-b border-gray-200 dark:border-[#262626] bg-[#fafafa] dark:bg-[#111113] p-1.5 gap-1 shrink-0">
        {COLUMNS.map(col => {
          const count = tasks.filter(t => t.status === col.id).length;
          const isActive = mobileActiveColumn === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setMobileActiveColumn(col.id)}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors active:scale-[0.97] ${
                isActive 
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-2xs font-semibold' 
                  : 'text-gray-500 dark:text-zinc-400'
              }`}
            >
              {col.icon}
              <span>{col.title}</span>
              <span className="text-[10px] opacity-60 tabular-nums">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 sm:gap-5 h-full items-start min-w-full">
            {COLUMNS.map(col => {
              let columnTasks = tasks.filter(t => t.status === col.id);
              if (sortByPriority) {
                columnTasks = columnTasks.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
              }

              // On mobile, only display the active column tab
              const isHiddenOnMobile = mobileActiveColumn !== col.id;

              return (
                <div 
                  key={col.id} 
                  className={`flex flex-col w-full md:w-80 shrink-0 h-full bg-gray-50/70 dark:bg-[#111113]/80 rounded-xl border border-gray-200 dark:border-[#262626] ${
                    isHiddenOnMobile ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  <div className="flex items-center justify-between p-3.5 border-b border-gray-200 dark:border-[#262626]">
                    <div className="flex items-center gap-2 font-medium text-xs text-gray-800 dark:text-zinc-200">
                      {col.icon} 
                      <span>{col.title}</span>
                      <span className="text-[10px] py-0.2 px-1.5 bg-gray-200 dark:bg-zinc-800 rounded-md text-gray-600 dark:text-zinc-400 tabular-nums">{columnTasks.length}</span>
                    </div>
                    <button 
                      onClick={() => handleCreateTask(col.id)} 
                      className="p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors active:scale-[0.95]"
                      title="Add Task"
                    >
                      <Plus size={15} strokeWidth={1.75} />
                    </button>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-2.5 space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-gray-100/50 dark:bg-zinc-800/20' : ''}`}
                      >
                        {columnTasks.length === 0 ? (
                          <div className="h-28 flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-zinc-800 rounded-lg text-gray-400 dark:text-zinc-600 text-xs font-normal">
                            No tasks
                          </div>
                        ) : (
                          columnTasks.map((task, index) => {
                            const completedSubtasks = task.subtasks?.filter(s => s.isCompleted).length || 0;
                            const totalSubtasks = task.subtasks?.length || 0;

                            return (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    onClick={() => setEditingTask(task)}
                                    className={`bg-white dark:bg-[#141416] p-3 rounded-lg border border-gray-200 dark:border-[#262626] shadow-2xs hover:border-gray-300 dark:hover:border-zinc-700 cursor-pointer transition-all active:scale-[0.98] ${
                                      dragSnapshot.isDragging ? 'shadow-lg ring-1 ring-zinc-400 dark:ring-zinc-600' : ''
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="font-medium text-xs text-gray-900 dark:text-zinc-100 leading-snug flex-1">
                                        {task.title}
                                      </span>
                                      <div {...dragProvided.dragHandleProps} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 p-0.5" title="Drag to reorder">
                                        <GripVertical size={13} />
                                      </div>
                                    </div>

                                    {task.description && (
                                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}

                                    {task.subtasks && task.subtasks.length > 0 && (
                                      <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-[#222] space-y-1">
                                        {task.subtasks.slice(0, 4).map((st) => (
                                          <div 
                                            key={st.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleSubtask(task.id, st.id);
                                            }}
                                            className="flex items-center gap-2 group/st py-0.5 px-1 rounded hover:bg-gray-100/70 dark:hover:bg-zinc-800/60 cursor-pointer"
                                            title="Click to toggle"
                                          >
                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                              st.isCompleted 
                                                ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900' 
                                                : 'border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                                            }`}>
                                              {st.isCompleted && <Check size={10} strokeWidth={2.5} />}
                                            </div>
                                            <span className={`text-[11px] leading-tight truncate flex-1 transition-all ${
                                              st.isCompleted 
                                                ? 'line-through text-gray-400 dark:text-zinc-600' 
                                                : 'text-gray-700 dark:text-zinc-300'
                                            }`}>
                                              {st.title}
                                            </span>
                                          </div>
                                        ))}
                                        {task.subtasks.length > 4 && (
                                          <p className="text-[10px] text-gray-400 dark:text-zinc-500 pl-1 pt-0.5">
                                            +{task.subtasks.length - 4} more subtasks
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-[#222]">
                                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority]}`}>
                                        {task.priority}
                                      </span>

                                      <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-zinc-500">
                                        {totalSubtasks > 0 && (
                                          <span className="flex items-center gap-1 tabular-nums">
                                            <CheckCircle2 size={11} strokeWidth={1.75} />
                                            {completedSubtasks}/{totalSubtasks}
                                          </span>
                                        )}
                                        {task.dueDate && (
                                          <span className="flex items-center gap-1 tabular-nums">
                                            <Clock size={11} strokeWidth={1.75} />
                                            {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })
                        )}
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

      {/* Slide-out Edit Panel (Responsive width, Rule 15 shorter exit) */}
      <AnimatePresence>
        {editingTask && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setEditingTask(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-2xs z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-0 right-0 bottom-0 w-full sm:w-96 max-w-full bg-white dark:bg-[#141416] border-l border-gray-200 dark:border-[#262626] shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-[#262626]">
                <h2 className="font-semibold text-sm text-gray-900 dark:text-white">Edit Task</h2>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setIsDeleteModalOpen(true)} 
                    className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md transition-colors active:scale-[0.95]"
                    title="Delete task"
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                  </button>
                  <button 
                    onClick={() => setEditingTask(null)} 
                    className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors active:scale-[0.95]"
                    title="Close"
                  >
                    <X size={15} strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div>
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => handleUpdateTask({ ...editingTask, title: e.target.value })}
                    className="w-full text-base sm:text-lg font-bold bg-transparent border-none focus:outline-none p-0 text-gray-900 dark:text-zinc-100 placeholder-gray-400 tracking-tight"
                    placeholder="Task Title"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Priority</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => handleUpdateTask({ ...editingTask, priority: p })}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase transition-colors border active:scale-[0.97] ${
                          editingTask.priority === p 
                            ? PRIORITY_COLORS[p] 
                            : 'border-gray-200 dark:border-[#262626] text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Due Date</label>
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
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-white focus:outline-none focus:border-zinc-400 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Description</label>
                  <textarea
                    value={editingTask.description}
                    onChange={(e) => handleUpdateTask({ ...editingTask, description: e.target.value })}
                    className="w-full h-28 bg-gray-50 dark:bg-[#111113] border border-gray-200 dark:border-[#262626] rounded-md p-2.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 resize-none leading-relaxed"
                    placeholder="Add task details..."
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#222]">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Subtasks</label>
                    <button 
                      onClick={() => handleUpdateTask({ ...editingTask, subtasks: [...editingTask.subtasks, { id: crypto.randomUUID(), title: '', isCompleted: false }] })}
                      className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 active:scale-[0.97]"
                    >
                      <Plus size={12} strokeWidth={1.75} /> 
                      <span>Add Subtask</span>
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    {editingTask.subtasks.map(subtask => (
                      <div key={subtask.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => handleUpdateTask({ ...editingTask, subtasks: editingTask.subtasks.map(s => s.id === subtask.id ? { ...s, isCompleted: !s.isCompleted } : s) })}
                          className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            subtask.isCompleted ? 'bg-zinc-900 dark:bg-white border-transparent text-white dark:text-zinc-900' : 'border-gray-300 dark:border-zinc-700 text-transparent'
                          }`}
                        >
                          <CheckCircle2 size={11} strokeWidth={2} />
                        </button>
                        <input
                          type="text"
                          value={subtask.title}
                          onChange={(e) => handleUpdateTask({ ...editingTask, subtasks: editingTask.subtasks.map(s => s.id === subtask.id ? { ...s, title: e.target.value } : s) })}
                          className={`flex-1 bg-transparent text-xs focus:outline-none ${subtask.isCompleted ? 'text-gray-400 dark:text-zinc-600 line-through' : 'text-gray-900 dark:text-zinc-100'}`}
                          placeholder="Subtask name..."
                        />
                        <button 
                          onClick={() => handleUpdateTask({ ...editingTask, subtasks: editingTask.subtasks.filter(s => s.id !== subtask.id) })}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 p-0.5 transition-all"
                          title="Remove subtask"
                        >
                          <X size={13} strokeWidth={1.75} />
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
