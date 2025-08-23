import React, { useState } from 'react';
import { FaPlus, FaCheck, FaStar, FaBolt, FaMountain, FaRocket } from 'react-icons/fa';
import { scoreTodo } from '../utils/todoScorer';
import './TodoList.css';

const TodoList = ({ todos, onComplete, onAdd }) => {
  const [newTodo, setNewTodo] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const getDifficultyIcon = (difficulty) => {
    if (difficulty < 0.2) return <FaStar style={{ color: '#4CAF50' }} />;
    if (difficulty < 0.4) return <FaBolt style={{ color: '#2196F3' }} />;
    if (difficulty < 0.65) return <FaMountain style={{ color: '#FF9800' }} />;
    if (difficulty < 0.85) return <FaRocket style={{ color: '#f44336' }} />;
    return <FaRocket style={{ color: '#9C27B0' }} />;
  };

  const getDifficultyLabel = (difficulty) => {
    if (difficulty < 0.2) return 'Tiny';
    if (difficulty < 0.4) return 'Small';
    if (difficulty < 0.65) return 'Medium';
    if (difficulty < 0.85) return 'Big';
    return 'Epic';
  };

  const handleAddTodo = async () => {
    if (newTodo.trim()) {
      const scored = await scoreTodo(newTodo);
      const todo = {
        id: Date.now().toString(),
        text: newTodo,
        difficulty: scored.difficulty,
        points: scored.points,
        completed: false,
        createdAt: new Date().toISOString()
      };
      onAdd(todo);
      setNewTodo('');
      setIsAdding(false);
    }
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="todo-list">
      {!isAdding ? (
        <button className="add-todo-btn" onClick={() => setIsAdding(true)}>
          <FaPlus /> Add Task
        </button>
      ) : (
        <div className="add-todo-form">
          <input
            type="text"
            placeholder="What do you need to do?"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
            autoFocus
          />
          <div className="add-todo-actions">
            <button onClick={handleAddTodo} className="save-btn">Save</button>
            <button onClick={() => { setIsAdding(false); setNewTodo(''); }} className="cancel-btn">Cancel</button>
          </div>
        </div>
      )}

      <div className="todos-container">
        {activeTodos.length === 0 && !isAdding && (
          <div className="empty-state">
            <p>No tasks yet! Add one to get started.</p>
          </div>
        )}

        {activeTodos.map(todo => (
          <div key={todo.id} className="todo-item">
            <button 
              className="todo-checkbox"
              onClick={() => onComplete(todo)}
            >
              <FaCheck />
            </button>
            <div className="todo-content">
              <span className="todo-text">{todo.text}</span>
              <div className="todo-meta">
                <span className="todo-difficulty">
                  {getDifficultyIcon(todo.difficulty)}
                  {getDifficultyLabel(todo.difficulty)}
                </span>
                <span className="todo-points">+{todo.points} pts</span>
              </div>
            </div>
          </div>
        ))}

        {completedTodos.length > 0 && (
          <>
            <h4 className="completed-header">Completed ({completedTodos.length})</h4>
            {completedTodos.map(todo => (
              <div key={todo.id} className="todo-item completed">
                <div className="todo-checkbox checked">
                  <FaCheck />
                </div>
                <div className="todo-content">
                  <span className="todo-text">{todo.text}</span>
                  <div className="todo-meta">
                    <span className="todo-points">+{todo.points} pts earned</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default TodoList;
