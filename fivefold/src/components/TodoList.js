import React, { useState, memo } from 'react';
import { FaPlus, FaCheck } from 'react-icons/fa';
import { scoreTodo } from '../utils/todoScorer';
import './TodoList.css';

const TodoList = ({ todos, onComplete, onAdd }) => {
  const [newTodo, setNewTodo] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const getTierDisplay = (todo) => {
    // ALWAYS use AI result if available - trust the AI!
    if (todo.source === 'ai' && todo.tier) {
      // AI said low/mid/high - use exactly what AI said
      if (todo.tier === 'low') {
        return { icon: '🟢', label: 'Low Tier', color: '#4CAF50', description: 'Quick & simple' };
      } else if (todo.tier === 'mid') {
        return { icon: '🟡', label: 'Mid Tier', color: '#FF9800', description: 'Moderate effort' };
      } else if (todo.tier === 'high') {
        return { icon: '🔴', label: 'High Tier', color: '#f44336', description: 'Complex & intensive' };
      }
    }
    
    // Handle tierData format if available
    if (todo.tier && todo.tierData) {
      return {
        icon: todo.tierData.icon,
        label: todo.tierData.name,
        color: todo.tierData.color,
        description: todo.tierData.description
      };
    }
    
    // Fallback for old todos
    const difficulty = todo.difficulty || 0.3;
    if (difficulty <= 0.33) {
      return { icon: '🟢', label: 'Low Tier', color: '#4CAF50', description: 'Quick & simple' };
    } else if (difficulty <= 0.66) {
      return { icon: '🟡', label: 'Mid Tier', color: '#FF9800', description: 'Moderate effort' };
    } else {
      return { icon: '🔴', label: 'High Tier', color: '#f44336', description: 'Complex & intensive' };
    }
  };

  const handleAddTodo = async () => {
    if (newTodo.trim()) {
      setIsAdding(false); // Show loading by hiding form
      
      try {
        const scored = await scoreTodo(newTodo);
        const todo = {
          id: Date.now().toString(),
          text: newTodo,
          // Legacy format for compatibility
          difficulty: scored.difficulty,
          points: scored.points,
          // New 3-tier system data
          tier: scored.tier,
          tierData: scored.tierData,
          complexity: scored.complexity,
          rationale: scored.rationale,
          // AI-specific data
          aiEnabled: scored.aiEnabled,
          confidence: scored.confidence,
          timeEstimate: scored.timeEstimate,
          reasoning: scored.reasoning,
          source: scored.source,
          completed: false,
          createdAt: new Date().toISOString()
        };
        
        onAdd(todo);
        setNewTodo('');
      } catch (error) {
        console.error('Error adding todo:', error);
        if (error.message.includes('Please enable AI in Settings')) {
          alert('🤖 ' + error.message);
        } else {
          alert('Failed to score task. Please check your AI setup and try again.');
        }
        setIsAdding(true); // Re-show form on error
      }
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
              onClick={() => onComplete(todo.id)}
            >
              <FaCheck />
            </button>
            <div className="todo-content">
              <span className="todo-text">{todo.text}</span>
              <div className="todo-meta">
                <span className="todo-tier" style={{ color: getTierDisplay(todo).color }}>
                  {getTierDisplay(todo).icon} {getTierDisplay(todo).label}
                </span>
                <span className="todo-points">+{todo.points} pts</span>
              </div>
              {todo.rationale && (
                <div className="todo-rationale" title={todo.rationale}>
                  {todo.aiEnabled && todo.source === 'ai' ? (
                    <span className="ai-analyzed">
                      🤖 AI: {todo.reasoning || getTierDisplay(todo).description}
                      {todo.timeEstimate && ` (~${todo.timeEstimate})`}
                      {todo.confidence && ` (${todo.confidence}% confident)`}
                    </span>
                  ) : (
                    <span className="local-analyzed">
                      {getTierDisplay(todo).description}
                      {todo.source === 'local_fallback' && ' (AI unavailable)'}
                    </span>
                  )}
                </div>
              )}
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

export default memo(TodoList);
