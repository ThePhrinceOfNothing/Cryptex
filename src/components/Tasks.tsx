import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import { Check, Plus, Trash2, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from './EmptyState';

export const Tasks: React.FC = () => {
  const { vaultData, updateVaultData } = useVault();
  const [newTask, setNewTask] = useState('');
  
  const todos = vaultData?.todos || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const newTodo = {
      id: crypto.randomUUID(),
      text: newTask.trim(),
      completed: false
    };

    await updateVaultData({ todos: [...todos, newTodo] });
    setNewTask('');
  };

  const toggleTodo = async (id: string) => {
    const updatedTodos = todos.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    await updateVaultData({ todos: updatedTodos });
  };

  const deleteTodo = async (id: string) => {
    const updatedTodos = todos.filter(t => t.id !== id);
    await updateVaultData({ todos: updatedTodos });
  };

  return (
    <div className="max-w-3xl mx-auto p-8 h-full bg-white flex flex-col">
      <div className="mb-8 shrink-0">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
          <CheckSquare className="text-accent w-6 h-6" />
          Tasks
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage your secure to-dos.</p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-3 mb-8 shrink-0">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 bg-white border border-gray-200 rounded-md px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-shadow shadow-sm text-sm"
        />
        <motion.button
          type="submit"
          disabled={!newTask.trim()}
          whileHover={{ scale: newTask.trim() ? 1.02 : 1 }}
          whileTap={{ scale: newTask.trim() ? 0.97 : 1 }}
          className="bg-accent hover:bg-blue-600 disabled:bg-gray-100 disabled:text-gray-400 text-white px-5 py-3 rounded-md transition-colors shadow-sm flex items-center gap-2 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </motion.button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-0">
        {todos.length === 0 ? (
          <EmptyState 
            icon={CheckSquare}
            title="No tasks yet"
            subtitle="Your secure task list is completely empty. Start tracking your important to-dos by adding one above."
            actionLabel="Create First Task"
            onAction={() => document.querySelector('input')?.focus()}
          />
        ) : (
          <motion.div layout className="flex flex-col">
            <AnimatePresence initial={false}>
              {todos.map(todo => (
                <motion.div 
                  key={todo.id} 
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ opacity: { duration: 0.2 }, height: { duration: 0.2 } }}
                  className="group flex items-center justify-between border-b border-gray-100 transition-colors"
                >
                  <div className="py-4 flex-1 flex items-center justify-between">
                    <div 
                      className="flex items-center gap-4 cursor-pointer flex-1"
                      onClick={() => toggleTodo(todo.id)}
                    >
                      {/* Custom Neo-Minimalist Checkbox */}
                      <div className={`w-5 h-5 rounded-sm flex items-center justify-center border transition-colors shrink-0 ${
                        todo.completed 
                          ? 'bg-accent border-accent' 
                          : 'bg-white border-gray-300 group-hover:border-accent'
                      }`}>
                        {todo.completed && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>

                      <div className="relative flex items-center">
                        <motion.span 
                          animate={{ color: todo.completed ? '#9ca3af' : '#1f2937' }}
                          className="text-sm font-medium transition-colors"
                        >
                          {todo.text}
                        </motion.span>
                        {/* Expanding Strikethrough Line */}
                        <motion.div
                          initial={false}
                          animate={{ width: todo.completed ? '100%' : '0%' }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="absolute left-0 top-[50%] h-[1.5px] bg-gray-400 origin-left"
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => deleteTodo(todo.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};
