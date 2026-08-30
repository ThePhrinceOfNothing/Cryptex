import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import { CheckCircle2, Circle, Trash2, Plus } from 'lucide-react';

export const TodoList: React.FC = () => {
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
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
        <CheckCircle2 className="text-accent w-5 h-5" />
        Tasks
      </h2>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new securely encrypted task..."
          className="flex-1 bg-white border border-gray-200 rounded-md px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-shadow shadow-sm"
        />
        <button
          type="submit"
          disabled={!newTask.trim()}
          className="bg-accent hover:bg-blue-600 disabled:bg-gray-100 disabled:text-gray-400 text-white p-2 rounded-md transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      <div className="space-y-2 flex-1 overflow-y-auto pr-2">
        {todos.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-sm">No tasks yet.</p>
        ) : (
          todos.map(todo => (
            <div 
              key={todo.id} 
              className={`flex items-center justify-between p-3 rounded-md border transition-colors shadow-sm ${
                todo.completed ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
              }`}
            >
              <div 
                className="flex items-center gap-3 cursor-pointer flex-1"
                onClick={() => toggleTodo(todo.id)}
              >
                {todo.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 shrink-0 hover:text-accent transition-colors" />
                )}
                <span className={`transition-all ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  {todo.text}
                </span>
              </div>
              
              <button 
                onClick={() => deleteTodo(todo.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
