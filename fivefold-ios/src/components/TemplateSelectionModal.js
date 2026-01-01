import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  Alert,
  Animated,
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTheme } from "../contexts/ThemeContext";
import { hapticFeedback } from "../utils/haptics";
import WorkoutExercisePicker from "./WorkoutExercisePicker";
import MiniWorkoutPlayer from "./MiniWorkoutPlayer";
import WorkoutService from "../services/workoutService";
import ExercisesService from "../services/exercisesService";

const TemplateSelectionModal = ({ visible, onClose, onStartEmptyWorkout }) => {
  const { theme, isDark } = useTheme();
  const [templates, setTemplates] = useState([]);
  const [folders, setFolders] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateDetail, setShowTemplateDetail] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showSetsModal, setShowSetsModal] = useState(false);
  const [pendingExercise, setPendingExercise] = useState(null);
  const [selectedSets, setSelectedSets] = useState(3);
  const [selectedFolderId, setSelectedFolderId] = useState(null); // For template creation
  
  // Folder management
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedFolderForMenu, setSelectedFolderForMenu] = useState(null); // For folder menu
  
  // NEW: Full template editor state
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editorTemplate, setEditorTemplate] = useState(null); // Template being created/edited
  const [editorExercises, setEditorExercises] = useState([]); // Exercises in editor
  const [showExercisePickerInEditor, setShowExercisePickerInEditor] = useState(false); // Embedded picker
  const [editorExercisesList, setEditorExercisesList] = useState([]); // All exercises for picker
  const [editorSearchQuery, setEditorSearchQuery] = useState('');
  const [loadingExercises, setLoadingExercises] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(1000)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate modal when showTemplateDetail changes
  useEffect(() => {
    if (showTemplateDetail) {
      // Reset values
      slideAnim.setValue(1000);
      fadeAnim.setValue(0);
      
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1000,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showTemplateDetail]);

  // Load templates when modal opens
  useEffect(() => {
    if (visible) {
      loadTemplates();
      loadFolders();
    }
  }, [visible]);

  // Load exercises when template editor opens
  useEffect(() => {
    const loadExercises = async () => {
      if (showTemplateEditor && editorExercisesList.length === 0) {
        try {
          setLoadingExercises(true);
          const exercises = await ExercisesService.getExercises();
          setEditorExercisesList(exercises);
        } catch (error) {
          console.error('Error loading exercises:', error);
        } finally {
          setLoadingExercises(false);
        }
      }
    };
    loadExercises();
  }, [showTemplateEditor]);

  const loadTemplates = async () => {
    try {
      const loadedTemplates = await WorkoutService.getTemplates();
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const loadFolders = async () => {
    try {
      const loadedFolders = await WorkoutService.getFolders();
      setFolders(loadedFolders);
      // Expand all folders by default
      const expanded = {};
      loadedFolders.forEach(folder => {
        expanded[folder.id] = true;
      });
      setExpandedFolders(expanded);
    } catch (error) {
      console.error("Error loading folders:", error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert("Missing Name", "Please enter a folder name");
      return;
    }

    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      await WorkoutService.addFolder(newFolder);
      setFolders([...folders, newFolder]);
      setExpandedFolders({ ...expandedFolders, [newFolder.id]: true });
      setNewFolderName("");
      setShowCreateFolderModal(false);
      hapticFeedback.success();
    } catch (error) {
      Alert.alert("Error", "Failed to create folder");
    }
  };

  const handleDeleteFolder = async (folderId) => {
    // Check if folder has templates
    const folderTemplates = templates.filter(t => t.folderId === folderId);
    if (folderTemplates.length > 0) {
      Alert.alert(
        "Folder Not Empty",
        `This folder contains ${folderTemplates.length} template(s). Please move or delete them first.`,
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Delete Folder",
      "Are you sure you want to delete this folder?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await WorkoutService.deleteFolder(folderId);
              setFolders(folders.filter(f => f.id !== folderId));
              hapticFeedback.success();
            } catch (error) {
              Alert.alert("Error", "Failed to delete folder");
            }
          },
        },
      ]
    );
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders({
      ...expandedFolders,
      [folderId]: !expandedFolders[folderId],
    });
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      Alert.alert("Missing Name", "Please enter a template name");
      return;
    }

    const newTemplate = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      exercises: [],
      lastPerformed: null,
      folderId: selectedFolderId, // Assign to selected folder (null = My Templates)
    };

    // Set up editor for new template
    Keyboard.dismiss();
    setEditorTemplate(newTemplate);
    setEditorExercises([]);
    setNewTemplateName("");
    setSelectedFolderId(null);
    setShowCreateModal(false);
    hapticFeedback.success();
    // Open the full editor after a short delay to let the create modal fully close
    setTimeout(() => {
      setShowTemplateEditor(true);
    }, 150);
  };

  const handleAddExerciseToTemplate = (exercise) => {
    if (editingTemplate) {
      // Store the exercise and show sets modal
      setPendingExercise(exercise);
      setShowExercisePicker(false);
      setShowSetsModal(true);
    }
  };

  const handleConfirmSets = async () => {
    if (pendingExercise && editingTemplate) {
      const updatedExercise = {
        name: pendingExercise.name,
        bodyPart: pendingExercise.bodyPart,
        sets: selectedSets,
      };

      const updatedTemplate = {
        ...editingTemplate,
        exercises: [...editingTemplate.exercises, updatedExercise],
      };

      try {
        await WorkoutService.updateTemplate(
          editingTemplate.id,
          updatedTemplate,
        );
        setTemplates(
          templates.map((t) =>
            t.id === editingTemplate.id ? updatedTemplate : t,
          ),
        );
        setEditingTemplate(updatedTemplate);
        setShowSetsModal(false);
        setPendingExercise(null);
        setSelectedSets(3); // Reset to default
        setShowExercisePicker(true); // Go back to picker to add more exercises
        hapticFeedback.success();
      } catch (error) {
        Alert.alert("Error", "Failed to update template");
      }
    }
  };

  const handleStartTemplateWorkout = (template) => {
    hapticFeedback.heavy(); // Strong haptic for starting workout
    setSelectedTemplate(template);
    setShowTemplateDetail(false); // This starts a 200ms animation
    
    // Wait for detail modal animation to complete (200ms) before closing parent modal
    setTimeout(() => {
      onClose(); // Close template modal after detail modal has animated out
      
      // Wait a bit more for template modal to fully close, then open workout modal
      setTimeout(() => {
        DeviceEventEmitter.emit("openWorkoutModal", { template });
      }, 300); // Additional 300ms for template modal to close
    }, 250); // 250ms to ensure detail animation is complete
  };

  const handleDeleteTemplate = async (templateId) => {
    Alert.alert(
      "Delete Template",
      "Are you sure you want to delete this template?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await WorkoutService.deleteTemplate(templateId);
              setTemplates(templates.filter((t) => t.id !== templateId));
              setShowTemplateDetail(false);
              hapticFeedback.success();
            } catch (error) {
              Alert.alert("Error", "Failed to delete template");
            }
          },
        },
      ],
    );
  };

  // NEW TEMPLATE EDITOR FUNCTIONS
  const handleAddExerciseToEditor = () => {
    hapticFeedback.light();
    setShowExercisePickerInEditor(true); // Show embedded picker instead of navigating
  };

  const handleExerciseSelectedForEditor = (exercise) => {
    // Add exercise to editor with default values
    const newExercise = {
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      equipment: exercise.equipment || 'Machine',
      sets: 3,
      reps: '',
      weight: '',
    };
    setEditorExercises([...editorExercises, newExercise]);
    setShowExercisePickerInEditor(false); // Close embedded picker
    setEditorSearchQuery(''); // Reset search
    hapticFeedback.success();
  };

  const handleRemoveExerciseFromEditor = (index) => {
    const updated = editorExercises.filter((_, i) => i !== index);
    setEditorExercises(updated);
    hapticFeedback.light();
  };

  const handleUpdateExerciseInEditor = (index, field, value) => {
    const updated = [...editorExercises];
    updated[index] = { ...updated[index], [field]: value };
    setEditorExercises(updated);
  };

  const handleSaveTemplate = async () => {
    if (!editorTemplate?.name || !editorTemplate.name.trim()) {
      Alert.alert("Missing Name", "Please enter a template name");
      return;
    }

    if (editorExercises.length === 0) {
      Alert.alert("No Exercises", "Please add at least one exercise to the template");
      return;
    }

    const finalTemplate = {
      ...editorTemplate,
      exercises: editorExercises,
    };

    try {
      // Check if this is a new template or updating existing
      const existingIndex = templates.findIndex(t => t.id === editorTemplate.id);
      
      if (existingIndex >= 0) {
        // Update existing template
        await WorkoutService.updateTemplate(editorTemplate.id, finalTemplate);
        const updatedTemplates = [...templates];
        updatedTemplates[existingIndex] = finalTemplate;
        setTemplates(updatedTemplates);
      } else {
        // Add new template
        await WorkoutService.addTemplate(finalTemplate);
        setTemplates([...templates, finalTemplate]);
      }

      setShowTemplateEditor(false);
      setEditorTemplate(null);
      setEditorExercises([]);
      hapticFeedback.success();
    } catch (error) {
      Alert.alert("Error", "Failed to save template");
    }
  };

  const handleCancelEditor = () => {
    Alert.alert(
      "Discard Changes?",
      "Are you sure you want to discard your changes?",
      [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setShowTemplateEditor(false);
            setEditorTemplate(null);
            setEditorExercises([]);
            hapticFeedback.light();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Quick Start Section */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Quick Start
          </Text>

          <TouchableOpacity
            style={[
              styles.emptyWorkoutButton,
              { backgroundColor: theme.primary },
            ]}
            onPress={() => {
              hapticFeedback.heavy(); // Strong haptic for starting workout
              setSelectedTemplate(null); // Clear any previously selected template
              onClose(); // Close the template modal
              
              // Wait for template modal to close, then open workout modal
              setTimeout(() => {
                DeviceEventEmitter.emit("openWorkoutModal");
              }, 300); // 300ms for template modal to close
            }}
          >
            <Text style={styles.emptyWorkoutButtonText}>
              Start an Empty Workout
            </Text>
          </TouchableOpacity>

          {/* Templates Section */}
          <View style={styles.templatesHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              My Templates
            </Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.createButton, { marginRight: 12 }]}
                onPress={() => {
                  hapticFeedback.light();
                  setShowCreateFolderModal(true);
                }}
              >
                <MaterialIcons name="create-new-folder" size={20} color={theme.primary} />
                <Text style={[styles.createButtonText, { color: theme.primary }]}>
                  Folder
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => {
                  hapticFeedback.light();
                  setShowCreateModal(true);
                }}
              >
                <MaterialIcons name="add" size={20} color={theme.primary} />
                <Text style={[styles.createButtonText, { color: theme.primary }]}>
                  Template
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* My Templates (no folder) */}
          {templates.filter(t => !t.folderId).length > 0 && (
            <View style={styles.folderSection}>
              {templates
                .filter(t => !t.folderId)
                .map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.templateCard,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                    onPress={() => {
                      hapticFeedback.light();
                      setSelectedTemplate(template);
                      setShowTemplateDetail(true);
                    }}
                  >
                    <View style={styles.templateCardHeader}>
                      <Text style={[styles.templateName, { color: theme.text }]}>
                        {template.name}
                      </Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={theme.textSecondary}
                      />
                    </View>

                    <Text
                      style={[styles.templateCount, { color: theme.textSecondary }]}
                    >
                      {template.exercises?.length || 0}{" "}
                      {(template.exercises?.length || 0) === 1 ? "exercise" : "exercises"}
                    </Text>

                    {template.lastPerformed && (
                      <View style={styles.templateFooter}>
                        <MaterialIcons
                          name="access-time"
                          size={14}
                          color={theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.templateDate,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {template.lastPerformed}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              }
            </View>
          )}

          {/* Folders with Templates */}
          {folders.map((folder) => {
            const folderTemplates = templates.filter(t => t.folderId === folder.id);
            const isExpanded = expandedFolders[folder.id];
            
            return (
              <View key={folder.id} style={styles.folderSection}>
                <TouchableOpacity
                  style={[styles.folderHeader, { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  }]}
                  onPress={() => toggleFolder(folder.id)}
                  onLongPress={() => {
                    hapticFeedback.medium();
                    setSelectedFolderForMenu(folder);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.folderHeaderContent}>
                    <View style={[styles.folderIconContainer, { backgroundColor: theme.primary + '20' }]}>
                      <MaterialIcons 
                        name={isExpanded ? "folder-open" : "folder"} 
                        size={22} 
                        color={theme.primary} 
                      />
                    </View>
                    <View style={styles.folderInfo}>
                      <Text style={[styles.folderName, { color: theme.text }]}>
                        {folder.name}
                      </Text>
                      <Text style={[styles.folderSubtext, { color: theme.textSecondary }]}>
                        {folderTemplates.length} {folderTemplates.length === 1 ? 'template' : 'templates'}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons 
                    name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color={theme.textSecondary} 
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.folderContent}>
                    {folderTemplates.length === 0 ? (
                      <View style={styles.emptyFolderState}>
                        <MaterialIcons name="fitness-center" size={32} color={theme.textSecondary} opacity={0.3} />
                        <Text style={[styles.emptyFolderText, { color: theme.textSecondary }]}>
                          No templates yet
                        </Text>
                      </View>
                    ) : (
                      folderTemplates.map((template) => (
                        <TouchableOpacity
                          key={template.id}
                          style={[
                            styles.templateCard,
                            styles.templateCardInFolder,
                            {
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.02)",
                            },
                          ]}
                          onPress={() => {
                            hapticFeedback.light();
                            setSelectedTemplate(template);
                            setShowTemplateDetail(true);
                          }}
                        >
                          <View style={styles.templateCardHeader}>
                            <Text style={[styles.templateName, { color: theme.text }]}>
                              {template.name}
                            </Text>
                            <MaterialIcons
                              name="chevron-right"
                              size={24}
                              color={theme.textSecondary}
                            />
                          </View>

                          <Text
                            style={[styles.templateCount, { color: theme.textSecondary }]}
                          >
                            {template.exercises?.length || 0}{" "}
                            {(template.exercises?.length || 0) === 1 ? "exercise" : "exercises"}
                          </Text>

                          {template.lastPerformed && (
                            <View style={styles.templateFooter}>
                              <MaterialIcons
                                name="access-time"
                                size={14}
                                color={theme.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.templateDate,
                                  { color: theme.textSecondary },
                                ]}
                              >
                                {template.lastPerformed}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Empty State */}
          {templates.length === 0 && folders.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="folder-open" size={64} color={theme.textSecondary} opacity={0.3} />
              <Text style={[styles.emptyStateText, { color: theme.text }]}>
                No Templates Yet
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                Create a template or folder to get started
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Transparent Blurred Header */}
        <BlurView
          intensity={20}
          tint={isDark ? "dark" : "light"}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: "transparent",
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            overflow: "hidden",
          }}
          pointerEvents="box-none"
        >
          <View
            style={{
              height: Platform.OS === "ios" ? 60 : 30,
              backgroundColor: "transparent",
            }}
            pointerEvents="box-none"
          />
          <View
            style={[
              styles.headerRow,
              {
                backgroundColor: "transparent",
                paddingTop: 8,
                paddingBottom: 12,
              },
            ]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                onClose();
              }}
              style={[
                styles.backButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.08)",
                },
              ]}
            >
              <Text style={[styles.backButtonText, { color: theme.primary }]}>
                Back
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>
              Start Workout
            </Text>
            <View style={{ width: 60 }} />
          </View>
        </BlurView>

        {/* Create Template Modal */}
        <Modal
          visible={showCreateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.createModalOverlay}>
            <TouchableOpacity
              style={styles.createModalBackdrop}
              activeOpacity={0.7}
              onPress={() => setShowCreateModal(false)}
            />
            <View
              style={[
                styles.createModalContainer,
                { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
              ]}
            >
              <Text style={[styles.createModalTitle, { color: theme.text }]}>
                Create Template
              </Text>
              
              <TextInput
                style={[
                  styles.createModalInput,
                  {
                    color: theme.text,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Template name (e.g., Monday Workout)"
                placeholderTextColor={theme.textSecondary}
                value={newTemplateName}
                onChangeText={setNewTemplateName}
                autoFocus
              />

              {/* Folder Selection */}
              {folders.length > 0 && (
                <View style={styles.folderSelectionContainer}>
                  <Text style={[styles.folderSelectionLabel, { color: theme.textSecondary }]}>
                    Folder (Optional)
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.folderSelectionScroll}
                  >
                    <TouchableOpacity
                      style={[
                        styles.folderChip,
                        {
                          backgroundColor: !selectedFolderId
                            ? theme.primary
                            : isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.05)",
                        },
                      ]}
                      onPress={() => setSelectedFolderId(null)}
                    >
                      <Text
                        style={[
                          styles.folderChipText,
                          { color: !selectedFolderId ? "#FFFFFF" : theme.text },
                        ]}
                      >
                        My Templates
                      </Text>
                    </TouchableOpacity>
                    {folders.map((folder) => (
                      <TouchableOpacity
                        key={folder.id}
                        style={[
                          styles.folderChip,
                          {
                            backgroundColor: selectedFolderId === folder.id
                              ? theme.primary
                              : isDark
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.05)",
                          },
                        ]}
                        onPress={() => setSelectedFolderId(folder.id)}
                      >
                        <MaterialIcons 
                          name="folder" 
                          size={16} 
                          color={selectedFolderId === folder.id ? "#FFFFFF" : theme.textSecondary} 
                        />
                        <Text
                          style={[
                            styles.folderChipText,
                            { color: selectedFolderId === folder.id ? "#FFFFFF" : theme.text },
                          ]}
                        >
                          {folder.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.createModalButtons}>
                <TouchableOpacity
                  style={[
                    styles.createModalButton,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                  onPress={() => {
                    setShowCreateModal(false);
                    setSelectedFolderId(null);
                  }}
                >
                  <Text
                    style={[
                      styles.createModalButtonText,
                      { color: theme.text },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createModalButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleCreateTemplate}
                >
                  <Text
                    style={[styles.createModalButtonText, { color: "#FFFFFF" }]}
                  >
                    Create
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Create Folder Modal */}
        <Modal
          visible={showCreateFolderModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCreateFolderModal(false)}
        >
          <View style={styles.createModalOverlay}>
            <TouchableOpacity
              style={styles.createModalBackdrop}
              activeOpacity={0.7}
              onPress={() => setShowCreateFolderModal(false)}
            />
            <View
              style={[
                styles.createModalContainer,
                { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
              ]}
            >
              <Text style={[styles.createModalTitle, { color: theme.text }]}>
                Create Folder
              </Text>
              <TextInput
                style={[
                  styles.createModalInput,
                  {
                    color: theme.text,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Folder name (e.g., Push Day)"
                placeholderTextColor={theme.textSecondary}
                value={newFolderName}
                onChangeText={setNewFolderName}
                autoFocus
              />
              <View style={styles.createModalButtons}>
                <TouchableOpacity
                  style={[
                    styles.createModalButton,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                  onPress={() => setShowCreateFolderModal(false)}
                >
                  <Text
                    style={[
                      styles.createModalButtonText,
                      { color: theme.text },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createModalButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleCreateFolder}
                >
                  <Text
                    style={[styles.createModalButtonText, { color: "#FFFFFF" }]}
                  >
                    Create
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Folder Menu Modal (Long Press) */}
        <Modal
          visible={!!selectedFolderForMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedFolderForMenu(null)}
        >
          <View style={styles.menuModalOverlay}>
            <TouchableOpacity
              style={styles.menuModalBackdrop}
              activeOpacity={0.7}
              onPress={() => setSelectedFolderForMenu(null)}
            />
            <View
              style={[
                styles.menuModalContainer,
                { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
              ]}
            >
              <View style={styles.menuModalHeader}>
                <MaterialIcons name="folder" size={24} color={theme.primary} />
                <Text style={[styles.menuModalTitle, { color: theme.text }]}>
                  {selectedFolderForMenu?.name}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.menuItem, { borderTopColor: theme.border }]}
                onPress={() => {
                  handleDeleteFolder(selectedFolderForMenu.id);
                  setSelectedFolderForMenu(null);
                }}
              >
                <MaterialIcons name="delete-outline" size={24} color="#FF3B30" />
                <Text style={[styles.menuItemText, { color: "#FF3B30" }]}>
                  Delete Folder
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { borderTopColor: theme.border }]}
                onPress={() => setSelectedFolderForMenu(null)}
              >
                <MaterialIcons name="close" size={24} color={theme.text} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Template Detail Modal */}
        <Modal
          visible={showTemplateDetail}
          transparent
          animationType="none"
          presentationStyle="overFullScreen"
          onRequestClose={() => setShowTemplateDetail(false)}
        >
          <Animated.View style={[styles.detailModalOverlay, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={styles.detailModalBackdrop}
              activeOpacity={0.7}
              onPress={() => setShowTemplateDetail(false)}
            />
            <Animated.View
              style={[
                styles.detailModalContainer,
                { 
                  backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
                  transform: [{ translateY: slideAnim }]
                },
              ]}
            >
              {/* Header */}
              <View style={styles.detailModalHeader}>
                <TouchableOpacity
                  onPress={() => setShowTemplateDetail(false)}
                  style={styles.detailCloseButton}
                >
                  <MaterialIcons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.detailModalTitle, { color: theme.text }]}>
                  {selectedTemplate?.name}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    // Open template editor with existing template
                    hapticFeedback.light();
                    setEditorTemplate(selectedTemplate);
                    setEditorExercises([...selectedTemplate.exercises]);
                    setShowTemplateDetail(false);
                    setShowTemplateEditor(true);
                  }}
                >
                  <Text
                    style={[styles.detailEditButton, { color: theme.primary }]}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedTemplate?.lastPerformed && (
                <Text
                  style={[
                    styles.detailLastPerformed,
                    { color: theme.textSecondary },
                  ]}
                >
                  Last Performed: {selectedTemplate.lastPerformed}
                </Text>
              )}

              {/* Exercise List */}
              <ScrollView style={styles.detailExerciseList}>
                {selectedTemplate?.exercises.map((exercise, index) => (
                  <View
                    key={index}
                    style={[
                      styles.detailExerciseItem,
                      { borderBottomColor: theme.border },
                    ]}
                  >
                    <View style={styles.detailExerciseIcon}>
                      <MaterialIcons
                        name="fitness-center"
                        size={32}
                        color={theme.primary}
                      />
                    </View>
                    <View style={styles.detailExerciseInfo}>
                      <Text
                        style={[
                          styles.detailExerciseName,
                          { color: theme.text },
                        ]}
                      >
                        {exercise.sets} × {exercise.name}
                      </Text>
                      <Text
                        style={[
                          styles.detailExerciseTarget,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {exercise.bodyPart}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.detailExerciseHelp}>
                      <MaterialIcons
                        name="help-outline"
                        size={24}
                        color={theme.primary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* Start Workout Button */}
              <TouchableOpacity
                style={[
                  styles.detailStartButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={() => handleStartTemplateWorkout(selectedTemplate)}
              >
                <Text style={styles.detailStartButtonText}>Start Workout</Text>
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.detailDeleteButton}
                onPress={() => handleDeleteTemplate(selectedTemplate?.id)}
              >
                <Text style={styles.detailDeleteButtonText}>
                  Delete Template
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Modal>

        {/* Exercise Picker for Adding to Template */}
        <WorkoutExercisePicker
          visible={showExercisePicker}
          onClose={() => {
            setShowExercisePicker(false);
            if (editorTemplate) {
              // If we're in the editor, go back to editor
              setShowTemplateEditor(true);
            } else {
              setEditingTemplate(null);
            }
          }}
          onSelectExercise={editorTemplate ? handleExerciseSelectedForEditor : handleAddExerciseToTemplate}
        />

        {/* Sets Selection Modal */}
        <Modal
          visible={showSetsModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowSetsModal(false);
            setPendingExercise(null);
            setShowExercisePicker(true);
          }}
        >
          <View style={styles.setsModalOverlay}>
            <TouchableOpacity
              style={styles.setsModalBackdrop}
              activeOpacity={0.7}
              onPress={() => {
                setShowSetsModal(false);
                setPendingExercise(null);
                setShowExercisePicker(true);
              }}
            />
            <View
              style={[
                styles.setsModalContainer,
                { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
              ]}
            >
              <Text style={[styles.setsModalTitle, { color: theme.text }]}>
                {pendingExercise?.name}
              </Text>
              <Text
                style={[
                  styles.setsModalSubtitle,
                  { color: theme.textSecondary },
                ]}
              >
                How many sets?
              </Text>

              {/* Sets Options */}
              <View style={styles.setsOptions}>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.setsOption,
                      {
                        backgroundColor:
                          selectedSets === num
                            ? theme.primary
                            : isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.05)",
                      },
                    ]}
                    onPress={() => {
                      setSelectedSets(num);
                      hapticFeedback.light();
                    }}
                  >
                    <Text
                      style={[
                        styles.setsOptionText,
                        {
                          color: selectedSets === num ? "#FFFFFF" : theme.text,
                        },
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.setsModalButtons}>
                <TouchableOpacity
                  style={[
                    styles.setsModalButton,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                  onPress={() => {
                    setShowSetsModal(false);
                    setPendingExercise(null);
                    setShowExercisePicker(true);
                  }}
                >
                  <Text
                    style={[styles.setsModalButtonText, { color: theme.text }]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.setsModalButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleConfirmSets}
                >
                  <Text
                    style={[styles.setsModalButtonText, { color: "#FFFFFF" }]}
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Template Editor Modal - Full Featured */}
        <Modal
          visible={showTemplateEditor}
          animationType="slide"
          transparent={false}
          presentationStyle="fullScreen"
          onRequestClose={handleCancelEditor}
        >
          <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.editorHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={handleCancelEditor}>
                <Text style={[styles.editorHeaderButton, { color: theme.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.editorHeaderTitle, { color: theme.text }]}>
                {editorTemplate?.exercises?.length > 0 ? 'Edit Template' : 'Create Template'}
              </Text>
              <TouchableOpacity onPress={handleSaveTemplate}>
                <Text style={[styles.editorHeaderButton, { color: theme.primary, fontWeight: '700' }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.editorContent} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.editorContentContainer}
            >
              {/* Template Name */}
              <View style={styles.editorSection}>
                <Text style={[styles.editorLabel, { color: theme.textSecondary }]}>Template Name</Text>
                <TextInput
                  style={[styles.editorNameInput, { 
                    color: theme.text, 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    borderColor: theme.border 
                  }]}
                  value={editorTemplate?.name || ''}
                  onChangeText={(text) => setEditorTemplate({ ...editorTemplate, name: text })}
                  placeholder="e.g., Monday Workout"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              {/* Exercises List - Show when NOT in picker mode */}
              {!showExercisePickerInEditor && (
                <View style={styles.editorSection}>
                  <View style={styles.editorExercisesHeader}>
                    <Text style={[styles.editorLabel, { color: theme.textSecondary }]}>
                      Exercises ({editorExercises.length})
                    </Text>
                    <TouchableOpacity 
                      onPress={handleAddExerciseToEditor}
                      style={[styles.addExerciseButton, { backgroundColor: theme.primary }]}
                    >
                      <MaterialIcons name="add" size={20} color="#FFFFFF" />
                      <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
                    </TouchableOpacity>
                  </View>

                  {editorExercises.map((exercise, index) => (
                    <View key={index} style={[styles.exerciseEditorCard, { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                      borderColor: theme.border 
                    }]}>
                      {/* Exercise Header */}
                      <View style={styles.exerciseEditorHeader}>
                        <View style={styles.exerciseEditorInfo}>
                          <Text style={[styles.exerciseEditorName, { color: theme.text }]}>{exercise.name}</Text>
                          <Text style={[styles.exerciseEditorBodyPart, { color: theme.textSecondary }]}>
                            {exercise.bodyPart}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleRemoveExerciseFromEditor(index)}
                          style={styles.removeExerciseButton}
                        >
                          <MaterialIcons name="close" size={22} color={theme.error || '#FF3B30'} />
                        </TouchableOpacity>
                      </View>

                      {/* Exercise Fields */}
                      <View style={styles.exerciseFields}>
                        {/* Sets */}
                        <View style={styles.exerciseField}>
                          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Sets</Text>
                          <View style={styles.setsSelector}>
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                              <TouchableOpacity
                                key={num}
                                style={[
                                  styles.setsSelectorButton,
                                  {
                                    backgroundColor: exercise.sets === num
                                      ? theme.primary
                                      : isDark
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'rgba(0,0,0,0.05)',
                                  },
                                ]}
                                onPress={() => handleUpdateExerciseInEditor(index, 'sets', num)}
                              >
                                <Text
                                  style={[
                                    styles.setsSelectorText,
                                    { color: exercise.sets === num ? '#FFFFFF' : theme.text },
                                  ]}
                                >
                                  {num}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>

                        {/* Weight and Reps */}
                        <View style={styles.exerciseFieldsRow}>
                          <View style={[styles.exerciseField, { flex: 1 }]}>
                            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Weight (kg)</Text>
                            <TextInput
                              style={[styles.fieldInput, { 
                                color: theme.text, 
                                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                borderColor: theme.border 
                              }]}
                              value={exercise.weight}
                              onChangeText={(text) => handleUpdateExerciseInEditor(index, 'weight', text)}
                              placeholder="0"
                              placeholderTextColor={theme.textSecondary}
                              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                            />
                          </View>

                          <View style={[styles.exerciseField, { flex: 1 }]}>
                            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Reps</Text>
                            <TextInput
                              style={[styles.fieldInput, { 
                                color: theme.text, 
                                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                borderColor: theme.border 
                              }]}
                              value={exercise.reps}
                              onChangeText={(text) => handleUpdateExerciseInEditor(index, 'reps', text)}
                              placeholder="0"
                              placeholderTextColor={theme.textSecondary}
                              keyboardType="number-pad"
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}

                  {editorExercises.length === 0 && (
                    <View style={styles.emptyExercisesState}>
                      <MaterialIcons name="fitness-center" size={48} color={theme.textSecondary} opacity={0.5} />
                      <Text style={[styles.emptyExercisesText, { color: theme.textSecondary }]}>
                        No exercises yet
                      </Text>
                      <Text style={[styles.emptyExercisesSubtext, { color: theme.textSecondary }]}>
                        Tap "Add Exercise" to get started
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Embedded Exercise Picker - Show when in picker mode */}
              {showExercisePickerInEditor && (
                <View style={styles.embeddedPicker}>
                  <View style={styles.embeddedPickerHeader}>
                    <TouchableOpacity 
                      onPress={() => {
                        setShowExercisePickerInEditor(false);
                        setEditorSearchQuery('');
                      }}
                      style={styles.embeddedPickerBack}
                    >
                      <MaterialIcons name="arrow-back" size={24} color={theme.text} />
                      <Text style={[styles.embeddedPickerBackText, { color: theme.text }]}>Back</Text>
                    </TouchableOpacity>
                    <Text style={[styles.embeddedPickerTitle, { color: theme.text }]}>Select Exercise</Text>
                    <View style={{ width: 80 }} />
                  </View>

                  {/* Search Bar */}
                  <View style={[styles.embeddedSearchContainer, { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' 
                  }]}>
                    <MaterialIcons name="search" size={20} color={theme.textSecondary} />
                    <TextInput
                      style={[styles.embeddedSearchInput, { color: theme.text }]}
                      placeholder="Search exercises..."
                      placeholderTextColor={theme.textSecondary}
                      value={editorSearchQuery}
                      onChangeText={setEditorSearchQuery}
                    />
                  </View>

                  {/* Exercise List */}
                  {loadingExercises ? (
                    <View style={styles.loadingContainer}>
                      <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading exercises...</Text>
                    </View>
                  ) : (
                    <ScrollView style={styles.embeddedExerciseList} showsVerticalScrollIndicator={false}>
                      {editorExercisesList
                        .filter(ex => 
                          ex.name.toLowerCase().includes(editorSearchQuery.toLowerCase()) ||
                          ex.bodyPart.toLowerCase().includes(editorSearchQuery.toLowerCase())
                        )
                        .map((exercise, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[styles.embeddedExerciseItem, { borderBottomColor: theme.border }]}
                            onPress={() => handleExerciseSelectedForEditor(exercise)}
                          >
                            <View style={styles.embeddedExerciseInfo}>
                              <Text style={[styles.embeddedExerciseName, { color: theme.text }]}>
                                {exercise.name}
                              </Text>
                              <Text style={[styles.embeddedExerciseBodyPart, { color: theme.textSecondary }]}>
                                {exercise.bodyPart}
                              </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
                          </TouchableOpacity>
                        ))
                      }
                    </ScrollView>
                  )}
                </View>
              )}

              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        </Modal>

        {/* Mini Workout Player - Shows in template selection screen */}
        <MiniWorkoutPlayer onPress={() => {
          onClose(); // Close the template modal
          DeviceEventEmitter.emit("openWorkoutModal");
        }} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 120 : 90,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  emptyWorkoutButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 32,
  },
  emptyWorkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  templatesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  templateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  iconButton: {
    padding: 4,
  },
  // Folder Styles
  folderSection: {
    marginBottom: 16,
  },
  folderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  folderHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  folderIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  folderSubtext: {
    fontSize: 13,
    fontWeight: "500",
  },
  folderCount: {
    fontSize: 14,
    fontWeight: "500",
  },
  folderHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  folderDeleteButton: {
    padding: 4,
  },
  folderContent: {
    paddingLeft: 4,
    gap: 8,
  },
  templateCardInFolder: {
    marginLeft: 8,
  },
  emptyFolderState: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  emptyFolderText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptyStateSubtext: {
    fontSize: 14,
  },
  // Folder Selection in Create Modal
  folderSelectionContainer: {
    marginBottom: 20,
  },
  folderSelectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  folderSelectionScroll: {
    flexDirection: "row",
  },
  folderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  folderChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  templateFolder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  folderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  folderTitle: {
    fontSize: 17,
    fontWeight: "500",
  },
  folderMenuButton: {
    padding: 4,
  },
  templateCards: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  templateCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  templateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  templateName: {
    fontSize: 18,
    fontWeight: "600",
  },
  templateCount: {
    fontSize: 14,
    marginBottom: 8,
  },
  templateFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  templateDate: {
    fontSize: 12,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Create Modal Styles
  createModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  createModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  createModalContainer: {
    width: "85%",
    borderRadius: 20,
    padding: 24,
  },
  createModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  createModalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  createModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  createModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  createModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Detail Modal Styles
  detailModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  detailModalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  detailModalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "85%",
  },
  detailModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailCloseButton: {
    padding: 8,
  },
  detailModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  detailEditButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailLastPerformed: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  detailExerciseList: {
    maxHeight: "60%",
    marginBottom: 16,
  },
  detailExerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  detailExerciseIcon: {
    marginRight: 12,
  },
  detailExerciseInfo: {
    flex: 1,
  },
  detailExerciseName: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  detailExerciseTarget: {
    fontSize: 14,
  },
  detailExerciseHelp: {
    padding: 8,
  },
  detailStartButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  detailStartButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  detailDeleteButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  detailDeleteButtonText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },
  // Sets Modal Styles
  setsModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  setsModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  setsModalContainer: {
    width: "85%",
    borderRadius: 20,
    padding: 24,
  },
  setsModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  setsModalSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  setsOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
    justifyContent: "center",
  },
  setsOption: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  setsOptionText: {
    fontSize: 24,
    fontWeight: "700",
  },
  setsModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  setsModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  setsModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Template Editor Styles
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  editorHeaderButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  editorHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  editorContent: {
    flex: 1,
  },
  editorContentContainer: {
    paddingBottom: Platform.OS === "ios" ? 40 : 60, // Minimal inset so keyboard does not leave a gap
  },
  editorSection: {
    padding: 20,
  },
  editorLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editorNameInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    fontWeight: "500",
  },
  editorExercisesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editorKeyboardAvoider: {
    flex: 1,
  },
  addExerciseButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  exerciseEditorCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  exerciseEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  exerciseEditorInfo: {
    flex: 1,
  },
  exerciseEditorName: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  exerciseEditorBodyPart: {
    fontSize: 14,
    fontWeight: "500",
  },
  removeExerciseButton: {
    padding: 4,
  },
  exerciseFields: {
    gap: 16,
  },
  exerciseField: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  setsSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  setsSelectorButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  setsSelectorText: {
    fontSize: 17,
    fontWeight: "700",
  },
  exerciseFieldsRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyExercisesState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyExercisesText: {
    fontSize: 17,
    fontWeight: "600",
  },
  emptyExercisesSubtext: {
    fontSize: 14,
  },
  // Embedded Exercise Picker Styles
  embeddedPicker: {
    flex: 1,
    paddingHorizontal: 20,
  },
  embeddedPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  embeddedPickerBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  embeddedPickerBackText: {
    fontSize: 16,
    fontWeight: "600",
  },
  embeddedPickerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  embeddedSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  embeddedSearchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  embeddedExerciseList: {
    flex: 1,
  },
  embeddedExerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  embeddedExerciseInfo: {
    flex: 1,
  },
  embeddedExerciseName: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  embeddedExerciseBodyPart: {
    fontSize: 14,
    fontWeight: "500",
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  // Folder Menu Modal Styles
  menuModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  menuModalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  menuModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 20,
    borderBottomWidth: 0,
  },
  menuModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderTopWidth: 1,
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: "600",
  },
});

export default TemplateSelectionModal;
