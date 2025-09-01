import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const TodoList = ({ todos, onAdd, onComplete }) => {
  const [newTodo, setNewTodo] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;
    
    // Simple todo for now without AI
    const todo = {
      id: Date.now().toString(),
      text: newTodo,
      points: 50,
      tier: 'mid',
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    onAdd(todo);
    setNewTodo('');
    setIsAdding(false);
  };

  const activeTodos = todos.filter(t => !t.completed);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>📝 Tasks</Text>
      
      {!isAdding ? (
        <TouchableOpacity style={styles.addButton} onPress={() => setIsAdding(true)}>
          <MaterialIcons name="add" size={24} color="#667eea" />
          <Text style={styles.addButtonText}>Add Task</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.addForm}>
          <TextInput
            style={styles.textInput}
            placeholder="What do you need to do?"
            value={newTodo}
            onChangeText={setNewTodo}
            autoFocus
          />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.saveButton} onPress={handleAddTodo}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => { setIsAdding(false); setNewTodo(''); }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeTodos.map(todo => (
        <View key={todo.id} style={styles.todoItem}>
          <TouchableOpacity style={styles.checkButton} onPress={() => onComplete(todo.id)}>
            <MaterialIcons name="check" size={20} color="#4CAF50" />
          </TouchableOpacity>
          <View style={styles.todoContent}>
            <Text style={styles.todoText}>{todo.text}</Text>
            <Text style={styles.pointsText}>+{todo.points} pts</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9ff',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    color: '#667eea',
    marginLeft: 8,
    fontWeight: '600',
  },
  addForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e7ff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  todoItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  checkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  todoContent: {
    flex: 1,
  },
  todoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  pointsText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
});

export default TodoList;