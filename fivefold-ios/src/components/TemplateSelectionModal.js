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
  ActivityIndicator,
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { hapticFeedback } from "../utils/haptics";
import WorkoutExercisePicker from "./WorkoutExercisePicker";
import AddExerciseModal from "./AddExerciseModal";
import WorkoutService from "../services/workoutService";
import ExercisesService from "../services/exercisesService";
import ScheduleWorkoutModal from "./ScheduleWorkoutModal";
import physiqueService from "../services/physiqueService";
import productionAiService from "../services/productionAiService";
import { MUSCLE_GROUPS } from "../data/exerciseMuscleMap";
import { LinearGradient } from "expo-linear-gradient";
import nutritionService from "../services/nutritionService";
import bodyCompositionService from "../services/bodyCompositionService";
import WorkoutSplitModal, { EQUIPMENT_FIELD_MAP } from "./WorkoutSplitModal";
import { useNavigation } from "@react-navigation/native";
import { summarizeTemplate, templateHistory, lastLiftFor, formatDuration } from "../utils/templateSummary";
import { scheduledOn } from "../utils/scheduleAgenda";
import { formatTime as fmtClock } from "../services/reminderService";

const TemplateSelectionModal = ({ visible, onClose, onStartEmptyWorkout, asScreen = false }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [templates, setTemplates] = useState([]);
  const [folders, setFolders] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateDetail, setShowTemplateDetail] = useState(false);

  useEffect(() => {
    if (!showTemplateDetail || !selectedTemplate) { setDetailInsights(null); return; }
    let alive = true;
    WorkoutService.getWorkoutHistory()
      .then((history) => { if (alive) setDetailInsights(templateHistory(history, selectedTemplate)); })
      .catch(() => { if (alive) setDetailInsights(null); });
    if (!exerciseLibraryRef.current) {
      ExercisesService.getExercises().then((list) => { exerciseLibraryRef.current = list; }).catch(() => {});
    }
    return () => { alive = false; };
  }, [showTemplateDetail, selectedTemplate?.id]);

  // "How to" on a template row: open the library entry (instructions +
  // images) for that exercise. The detail sheet is an RN modal, so it has
  // to close before the native-stack screen can present.
  const openExerciseHowTo = (exercise) => {
    hapticFeedback.light();
    const wanted = String(exercise?.name || '').toLowerCase();
    const lib = exerciseLibraryRef.current || [];
    const full = lib.find((e) => String(e?.name || '').toLowerCase() === wanted) || exercise;
    setShowTemplateDetail(false);
    setTimeout(() => navigation.navigate('ExerciseDetail', { exercise: full }), 280);
  };
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  // Detail sheet: history-backed insights (last done, last lifted per
  // exercise) and the exercise library for the How-to lookup.
  const [detailInsights, setDetailInsights] = useState(null);
  // Home screen: history for "last done" on every row, today's schedule.
  const [historyList, setHistoryList] = useState([]);
  const [todayPlan, setTodayPlan] = useState([]);
  const exerciseLibraryRef = useRef(null);
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
  const [showCreateExerciseInEditor, setShowCreateExerciseInEditor] = useState(false); // Custom exercise form
  const [editorBodyPartFilter, setEditorBodyPartFilter] = useState('All');
  const [editorNameFocused, setEditorNameFocused] = useState(false);
  const [editorExercisesList, setEditorExercisesList] = useState([]); // All exercises for picker
  const [editorSearchQuery, setEditorSearchQuery] = useState('');
  const [loadingExercises, setLoadingExercises] = useState(false);
  
  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [templateToSchedule, setTemplateToSchedule] = useState(null);

  // Smart workout state
  const [smartWorkout, setSmartWorkout] = useState(null);
  const [smartWorkoutLoading, setSmartWorkoutLoading] = useState(false);
  const smartWorkoutFadeAnim = useRef(new Animated.Value(0)).current;
  const [exerciseCountPref, setExerciseCountPref] = useState(null); // null = auto, or 3/4/5/6
  const exerciseCountPrefRef = useRef(null);
  const [trainingStyle, setTrainingStyle] = useState('balanced'); // 'balanced' or 'failure'
  const trainingStyleRef = useRef('balanced');

  // Split plan state
  const [splitPlan, setSplitPlan] = useState(null);
  const [todaySplit, setTodaySplit] = useState(null);
  const [showSplitModal, setShowSplitModal] = useState(false);


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

  // Load templates + split plan + generate smart workout when modal opens
  useEffect(() => {
    if (visible) {
      loadTemplates();
      loadFolders();
      loadSplitAndGenerate();
    }
  }, [visible]);

  const loadSplitAndGenerate = async () => {
    try {
      const plan = await WorkoutService.getSplitPlan();
      setSplitPlan(plan);
      const today = await WorkoutService.getTodaySplit();
      setTodaySplit(today);

      // If there's a split plan and today has a configured exercise count, use it;
      // otherwise load the user's saved preference
      if (today && today.active && today.exerciseCount) {
        setExerciseCountPref(today.exerciseCount);
        exerciseCountPrefRef.current = today.exerciseCount;
      } else {
        const savedCount = await WorkoutService.getExerciseCountPref();
        if (savedCount !== null) {
          setExerciseCountPref(savedCount);
          exerciseCountPrefRef.current = savedCount;
        }
      }

      // Load saved training style preference
      const savedStyle = await WorkoutService.getTrainingStyle();
      setTrainingStyle(savedStyle);
      trainingStyleRef.current = savedStyle;

      // Don't auto-generate — user taps to generate
    } catch (e) {
      console.warn('[TemplateSelection] Error loading split:', e);
    }
  };

  const handleSplitSave = (newPlan) => {
    setSplitPlan(newPlan);
    // Reload today's config and regenerate
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = days[new Date().getDay()];
    const todayConfig = newPlan[todayKey] || null;
    setTodaySplit(todayConfig);

    if (todayConfig && todayConfig.active && todayConfig.exerciseCount) {
      setExerciseCountPref(todayConfig.exerciseCount);
      exerciseCountPrefRef.current = todayConfig.exerciseCount;
    }

    // Regenerate workout with new split
    setSmartWorkout(null);
    setTimeout(() => generateSmartWorkout(), 100);
  };

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
      try { setHistoryList(await WorkoutService.getWorkoutHistory()); } catch (e) { /* keep old */ }
      try { setTodayPlan(scheduledOn(await WorkoutService.getScheduledWorkouts(), new Date())); } catch (e) { setTodayPlan([]); }
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

  // ─── Muscle-to-body-part mapping for exercise filtering ───
  const muscleToBodyParts = (muscleKey) => {
    const map = {
      upperChest: ['Chest'], midChest: ['Chest'], lowerChest: ['Chest'],
      frontDelts: ['Shoulders'], sideDelts: ['Shoulders'], rearDelts: ['Shoulders'],
      traps: ['Back', 'Shoulders'],
      lats: ['Back'], upperBack: ['Back'], lowerBack: ['Back', 'Core'],
      biceps: ['Arms'], triceps: ['Arms'], forearms: ['Arms'],
      abs: ['Core'], obliques: ['Core'],
      quads: ['Legs'], hamstrings: ['Legs'], glutes: ['Legs'], calves: ['Legs'],
    };
    return map[muscleKey] || [];
  };

  // ─── Smart Workout Generation ───
  const generateSmartWorkout = async () => {
    try {
      setSmartWorkoutLoading(true);
      smartWorkoutFadeAnim.setValue(0);

      // Check if today is a rest day in the split plan
      const currentTodaySplit = await WorkoutService.getTodaySplit();
      if (currentTodaySplit && currentTodaySplit.active === false) {
        // Rest day — set a special marker
        setSmartWorkout({ isRestDay: true });
        Animated.timing(smartWorkoutFadeAnim, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }).start();
        setSmartWorkoutLoading(false);
        return;
      }

      // 1. Load workout history and physique data
      const history = await WorkoutService.getWorkoutHistory();
      await physiqueService.recalculate(history);

      const overallScore = physiqueService.getOverallScore();
      const scores = physiqueService.getScores();

      const pushMuscles = ['upperChest', 'midChest', 'lowerChest', 'frontDelts', 'triceps'];
      const pullMuscles = ['lats', 'upperBack', 'biceps', 'rearDelts'];
      const legMuscles  = ['quads', 'hamstrings', 'glutes', 'calves'];
      const coreMuscles = ['abs', 'obliques', 'lowerBack'];

      const avg = (ids) => {
        const vals = ids.map(id => scores[id]?.score || 0);
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      };

      const weakest = physiqueService.getWeakestMuscles(4).map(m => ({
        name: MUSCLE_GROUPS[m.id]?.name || m.id,
        score: m.score,
      }));
      const strongest = physiqueService.getStrongestMuscles(3).map(m => ({
        name: MUSCLE_GROUPS[m.id]?.name || m.id,
        score: m.score,
      }));

      // 2. Load exercises — filter based on split plan muscles or fallback to weak muscles
      const allExercises = await ExercisesService.getExercises();
      let strengthExercises = allExercises.filter(ex => ex.category === 'Strength');

      // Filter by user's available equipment
      const userEquipment = await WorkoutService.getUserEquipment();
      if (userEquipment && userEquipment.length > 0) {
        const userEquipmentSet = new Set(userEquipment);
        strengthExercises = strengthExercises.filter(ex => {
          const eqField = (ex.equipment || '').toLowerCase().trim();
          const mappedKey = EQUIPMENT_FIELD_MAP[eqField];
          if (!mappedKey) return true; // unknown equipment type — keep it
          return userEquipmentSet.has(mappedKey);
        });
      }

      // Determine target muscles from split plan (if configured for today)
      const splitMuscles = (currentTodaySplit && currentTodaySplit.active && currentTodaySplit.muscles?.length > 0)
        ? currentTodaySplit.muscles
        : null;

      let exerciseNames;
      let targetMuscleNames = null;

      if (splitMuscles) {
        // Use split plan muscles to filter exercises
        const targetBodyParts = new Set();
        splitMuscles.forEach(m => {
          muscleToBodyParts(m).forEach(bp => targetBodyParts.add(bp));
        });

        const relevantExercises = strengthExercises.filter(ex => targetBodyParts.has(ex.bodyPart));
        // Add a few compound extras for variety
        const extras = strengthExercises
          .filter(ex => !targetBodyParts.has(ex.bodyPart))
          .slice(0, 10);
        const pool = [...relevantExercises, ...extras];
        exerciseNames = pool.slice(0, 60).map(ex => ex.name);

        // Build human-readable muscle names for the AI
        targetMuscleNames = splitMuscles.map(m => MUSCLE_GROUPS[m]?.name || m);
      } else {
        // Fallback: use weak muscles (original behavior)
        const weakBodyParts = new Set();
        weakest.forEach(m => {
          const name = m.name.toLowerCase();
          if (name.includes('chest') || name.includes('pec')) weakBodyParts.add('Chest');
          if (name.includes('delt') || name.includes('shoulder')) weakBodyParts.add('Shoulders');
          if (name.includes('lat') || name.includes('back') || name.includes('trap')) weakBodyParts.add('Back');
          if (name.includes('bicep') || name.includes('tricep') || name.includes('forearm')) weakBodyParts.add('Arms');
          if (name.includes('quad') || name.includes('ham') || name.includes('glute') || name.includes('calf') || name.includes('calves')) weakBodyParts.add('Legs');
          if (name.includes('ab') || name.includes('oblique') || name.includes('core')) weakBodyParts.add('Core');
        });

        const relevantExercises = strengthExercises.filter(ex => weakBodyParts.has(ex.bodyPart));
        const compoundExtras = strengthExercises
          .filter(ex => !weakBodyParts.has(ex.bodyPart))
          .slice(0, 15);
        const pool = [...relevantExercises, ...compoundExtras];
        exerciseNames = pool.slice(0, 60).map(ex => ex.name);
      }

      // 2b. Build per-exercise history from last 14 sessions for progressive overload
      const exerciseNameSet = new Set(exerciseNames.map(n => n.toLowerCase()));
      const recentSessions = history.slice(0, 14);
      const exerciseHistoryMap = {};

      for (const session of recentSessions) {
        if (!session.exercises) continue;
        for (const ex of session.exercises) {
          const key = ex.name?.toLowerCase();
          if (!key || !exerciseNameSet.has(key)) continue;
          const completedSets = (ex.sets || []).filter(s => s.completed && s.weight > 0);
          if (completedSets.length === 0) continue;
          const best = completedSets.reduce((a, b) => (Number(b.weight) > Number(a.weight) ? b : a));
          if (!exerciseHistoryMap[ex.name]) exerciseHistoryMap[ex.name] = [];
          exerciseHistoryMap[ex.name].push(`${best.weight}kg×${best.reps}`);
        }
      }

      const exerciseHistoryLines = Object.entries(exerciseHistoryMap)
        .map(([name, entries]) => `${name}: ${entries.join(', ')}`)
        .join('\n');

      // 2c. Load nutrition profile + body composition (optional)
      let nutritionParams = {};
      let userGender = null;
      let bodyCompData = null;
      try {
        const nutritionProfile = await nutritionService.getProfile();
        if (nutritionProfile) {
          const tdeeData = nutritionService.calculateTDEE(nutritionProfile);
          nutritionParams = {
            dailyCalories: tdeeData.dailyCalories,
            goal: nutritionProfile.goal,
            currentWeight: nutritionProfile.weightKg,
            targetWeight: nutritionProfile.targetWeightKg,
          };
          userGender = nutritionProfile.gender || null;
          if (nutritionProfile.age) nutritionParams.userAge = nutritionProfile.age;

          // Calculate body composition
          if (nutritionProfile.weightKg && nutritionProfile.heightCm) {
            try {
              bodyCompData = bodyCompositionService.calculate(nutritionProfile);
            } catch (_) {}
          }
        }
      } catch (e) {
        // Nutrition data is optional, continue without it
      }

      // 3. Call AI
      const workout = await productionAiService.generateSmartWorkout({
        overallScore,
        weakestMuscles: weakest,
        strongestMuscles: strongest,
        groupAverages: {
          push: avg(pushMuscles),
          pull: avg(pullMuscles),
          legs: avg(legMuscles),
          core: avg(coreMuscles),
        },
        totalWorkouts: history.length,
        exerciseNames,
        exerciseHistory: exerciseHistoryLines || '',
        exerciseCount: exerciseCountPrefRef.current,
        trainingStyle: trainingStyleRef.current,
        targetMuscles: targetMuscleNames,
        gender: userGender,
        bodyFatPercent: bodyCompData?.bodyFat || null,
        ...nutritionParams,
      });

      if (workout && workout.exercises.length > 0) {
        // Match AI exercise names back to full exercise objects for bodyPart/equipment
        const exerciseMap = {};
        allExercises.forEach(ex => { exerciseMap[ex.name.toLowerCase()] = ex; });

        workout.exercises = workout.exercises
          .map(aiEx => {
            const match = exerciseMap[aiEx.name.toLowerCase()];
            if (!match) return null; // Only allow exercises that exist in the app
            const w = aiEx.weight;
            const validWeight = (w && w !== '0' && w !== '0kg' && w !== 0) ? w : null;
            return {
              name: match.name,
              bodyPart: match.bodyPart || 'Full Body',
              equipment: match.equipment || 'Body Weight',
              target: match.target || '',
              sets: aiEx.sets || 3,
              reps: aiEx.reps || '10',
              weight: validWeight,
              restTime: 120,
            };
          })
          .filter(Boolean);

        setSmartWorkout(workout);
        Animated.timing(smartWorkoutFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.warn('[SmartWorkout] Error:', error.message);
    } finally {
      setSmartWorkoutLoading(false);
    }
  };

  const handleStartSmartWorkout = () => {
    if (!smartWorkout) return;
    hapticFeedback.heavy();

    // Build a template object from the AI workout
    const template = {
      id: 'smart_' + Date.now().toString(),
      name: smartWorkout.name,
      exercises: smartWorkout.exercises,
    };

    onClose();
    setTimeout(() => {
      DeviceEventEmitter.emit('openWorkoutModal', { template });
    }, 300);
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
    setEditorBodyPartFilter('All');
    setShowExercisePickerInEditor(true); // Show embedded picker instead of navigating
  };

  // Create a custom exercise straight from the picker, then drop it into the
  // template. Persists via the same service the Exercises library uses, so it
  // shows up everywhere afterwards.
  const handleCreateCustomExerciseInEditor = async (exercise) => {
    try {
      const created = await ExercisesService.addCustomExercise(exercise);
      setShowCreateExerciseInEditor(false);
      setEditorExercisesList((prev) => [created, ...prev]);
      hapticFeedback.success();
      handleExerciseSelectedForEditor(created);
    } catch (error) {
      console.error('Error creating custom exercise:', error);
      hapticFeedback.error();
      Alert.alert('Error', 'Could not create that exercise. Please try again.');
    }
  };

  const handleExerciseSelectedForEditor = (exercise) => {
    // Add exercise to editor with default values
    const newExercise = {
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      equipment: exercise.equipment || 'Machine',
      // Carried through so Physique scores the muscles this exercise declares
      // rather than re-guessing them from its name
      target: exercise.target,
      muscles: exercise.muscles,
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

  const hairlineColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  // One row per template: name, what is in it, when it was last done, and a
  // one-tap Start. Tapping the row opens the detail sheet.
  const renderTemplateRow = (template, inFolder = false) => {
    const summary = summarizeTemplate(template);
    const insights = templateHistory(historyList, template);
    const muscles = summary.muscleSplit.slice(0, 2).map((m) => m.bodyPart).join(', ');
    const meta = [
      `${summary.exerciseCount} ${summary.exerciseCount === 1 ? 'exercise' : 'exercises'}`,
      summary.estMinutes ? `about ${summary.estMinutes} min` : null,
      muscles || null,
    ].filter(Boolean).join('  ·  ');
    const last = insights.lastDoneLabel
      ? `Last done ${insights.lastDoneLabel}`
      : (template.lastPerformed ? `Last done ${template.lastPerformed}` : 'Not done yet');
    return (
      <TouchableOpacity
        key={template.id}
        style={[styles.templateRow, { borderBottomColor: hairlineColor, paddingLeft: inFolder ? 14 : 0 }]}
        activeOpacity={0.6}
        onPress={() => { hapticFeedback.light(); setSelectedTemplate(template); setShowTemplateDetail(true); }}
        accessibilityRole="button"
        accessibilityLabel={`${template.name}, ${meta}, ${last}`}
        accessibilityHint="Opens the template"
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={[styles.templateRowName, { color: theme.text }]}>{template.name}</Text>
          <Text style={[styles.templateRowMeta, { color: theme.textSecondary }]}>{meta}</Text>
          <Text style={[styles.templateRowLast, { color: insights.lastDoneLabel === 'today' ? theme.primary : theme.textSecondary }]}>{last}</Text>
        </View>
        {summary.exerciseCount > 0 ? (
          <TouchableOpacity
            onPress={() => { hapticFeedback.medium(); handleStartTemplateWorkout(template); }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={`Start ${template.name}`}
          >
            <Text style={[styles.rowStart, { color: theme.primary }]}>Start</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  const content = (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Back button, same tile as the Fuel header */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 20,
            zIndex: 10,
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          }}
          onPress={() => { hapticFeedback.light(); onClose(); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        >
          <View style={[styles.headerRow, { paddingHorizontal: 0, marginBottom: 18 }]}>
            <View style={{ width: 44, height: 44 }} />
            <Text style={[styles.title, { color: theme.text }]}>Start Workout</Text>
            <View style={{ width: 44, height: 44 }} />
          </View>

          <TouchableOpacity
            style={[styles.heroButton, { backgroundColor: theme.primary }]}
            activeOpacity={0.85}
            onPress={() => {
              hapticFeedback.heavy();
              setSelectedTemplate(null);
              onClose();
              setTimeout(() => { DeviceEventEmitter.emit("openWorkoutModal"); }, 300);
            }}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.14)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
            <Text style={styles.heroButtonText}>Start an empty workout</Text>
          </TouchableOpacity>

          {/* Today */}
          <View style={styles.todayBlock}>
            <Text style={[styles.kicker, { color: theme.textSecondary }]}>Today</Text>
            {todayPlan.length === 0 ? (
              <Text style={[styles.todayEmpty, { color: theme.textSecondary }]}>Nothing scheduled today. Pick a template below.</Text>
            ) : todayPlan.map((s) => {
              const tpl = templates.find((t) => String(t.id) === String(s.templateId)) || templates.find((t) => t.name === s.templateName) || null;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.todayRow}
                  activeOpacity={tpl ? 0.6 : 1}
                  onPress={() => { if (!tpl) return; hapticFeedback.light(); setSelectedTemplate(tpl); setShowTemplateDetail(true); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.templateName || 'Workout'} at ${fmtClock(s.time)}`}
                >
                  <Text style={[styles.todayName, { color: theme.text }]}>
                    {s.templateName || 'Workout'}
                    <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>{`  at ${fmtClock(s.time)}${s.duration ? `  ·  ${formatDuration(Number(s.duration) * 60)}` : ''}`}</Text>
                  </Text>
                  {tpl ? <Text style={[styles.rowStart, { color: theme.primary }]} onPress={() => { hapticFeedback.medium(); handleStartTemplateWorkout(tpl); }}>Start</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Suggested For You ── */}
          <Animated.View style={{ opacity: smartWorkout ? smartWorkoutFadeAnim : 1, marginTop: 4, marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Suggested for you</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {/* Edit Split button */}
                <TouchableOpacity
                  onPress={() => { hapticFeedback.light(); setShowSplitModal(true); }}
                  style={{ padding: 4 }}
                  activeOpacity={0.6}
                >
                  <MaterialIcons name={splitPlan ? 'tune' : 'calendar-month'} size={20} color={theme.textSecondary} />
                </TouchableOpacity>
                {/* Refresh button */}
                {!(smartWorkout && smartWorkout.isRestDay) && (
                  <TouchableOpacity
                    onPress={() => { if (!smartWorkoutLoading) { setSmartWorkout(null); generateSmartWorkout(); } }}
                    disabled={smartWorkoutLoading}
                    style={{ padding: 4, opacity: smartWorkoutLoading ? 0.4 : 1 }}
                    activeOpacity={0.6}
                  >
                    <MaterialIcons name="refresh" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Set up split (only when no plan exists) */}
            {!splitPlan && !smartWorkoutLoading && (
              <TouchableOpacity
                style={styles.splitRow}
                onPress={() => { hapticFeedback.light(); setShowSplitModal(true); }}
                activeOpacity={0.6}
                accessibilityRole="button"
              >
                <Text style={[styles.splitRowTitle, { color: theme.primary }]}>Set up your weekly split</Text>
                <Text style={[styles.splitRowSub, { color: theme.textSecondary }]}>Pick your training days and muscles so suggestions fit your week.</Text>
              </TouchableOpacity>
            )}

            {/* Exercise count preference pills (only when workout exists or loading, not rest day) */}
            {(smartWorkout || smartWorkoutLoading) && !(smartWorkout && smartWorkout.isRestDay) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginRight: 4 }}>Exercises:</Text>
                {[null, 3, 4, 5, 6].map(count => {
                  const isSelected = exerciseCountPref === count;
                  return (
                    <TouchableOpacity
                      key={count ?? 'auto'}
                      onPress={() => {
                        hapticFeedback.light();
                        setExerciseCountPref(count);
                        exerciseCountPrefRef.current = count;
                        WorkoutService.saveExerciseCountPref(count);
                        if (!smartWorkoutLoading) {
                          setSmartWorkout(null);
                          setTimeout(() => generateSmartWorkout(), 50);
                        }
                      }}
                      activeOpacity={0.7}
                      style={styles.pillTab}
                    >
                      <Text style={[styles.pillTabText, { color: isSelected ? theme.text : theme.textSecondary, fontWeight: isSelected ? '800' : '600' }]}>
                        {count === null ? 'Auto' : count}
                      </Text>
                      <View style={[styles.pillTabBar, { backgroundColor: isSelected ? theme.primary : 'transparent' }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Training style preference pills */}
            {(smartWorkout || smartWorkoutLoading) && !(smartWorkout && smartWorkout.isRestDay) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginRight: 4 }}>Style:</Text>
                {[{ key: 'balanced', label: 'Balanced' }, { key: 'failure', label: 'To Failure' }].map(opt => {
                  const isSelected = trainingStyle === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => {
                        hapticFeedback.light();
                        setTrainingStyle(opt.key);
                        trainingStyleRef.current = opt.key;
                        WorkoutService.saveTrainingStyle(opt.key);
                        if (!smartWorkoutLoading) {
                          setSmartWorkout(null);
                          setTimeout(() => generateSmartWorkout(), 50);
                        }
                      }}
                      activeOpacity={0.7}
                      style={styles.pillTab}
                    >
                      <Text style={[styles.pillTabText, { color: isSelected ? theme.text : theme.textSecondary, fontWeight: isSelected ? '800' : '600' }]}>
                        {opt.label}
                      </Text>
                      <View style={[styles.pillTabBar, { backgroundColor: isSelected ? theme.primary : 'transparent' }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {smartWorkout && smartWorkout.isRestDay ? (
              <View style={[styles.smartBlock, { borderTopColor: hairlineColor, borderBottomColor: hairlineColor }]}>
                <Text style={[styles.smartName, { color: theme.text }]}>Rest day</Text>
                <Text style={[styles.smartReason, { color: theme.textSecondary }]}>
                  Recovery is where growth happens. Take it easy today, stay hydrated, and come back stronger tomorrow.
                </Text>
              </View>
            ) : smartWorkoutLoading ? (
              <View style={[styles.smartBlock, { borderTopColor: hairlineColor, borderBottomColor: hairlineColor }]}>
                <Text style={[styles.smartReason, { color: theme.textSecondary }]}>
                  {splitPlan ? 'Building your workout...' : 'Looking at your training history...'}
                </Text>
              </View>
            ) : smartWorkout && !smartWorkout.isRestDay ? (
              <View style={[styles.smartBlock, { borderTopColor: hairlineColor, borderBottomColor: hairlineColor }]}>
                <View style={styles.smartHead}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={[styles.smartName, { color: theme.text }]}>{smartWorkout.name}</Text>
                    <Text style={[styles.smartReason, { color: theme.textSecondary }]}>{smartWorkout.reason}</Text>
                  </View>
                  <TouchableOpacity onPress={handleStartSmartWorkout} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={`Start ${smartWorkout.name}`}>
                    <Text style={[styles.rowStart, { color: theme.primary }]}>Start</Text>
                  </TouchableOpacity>
                </View>
                {smartWorkout.exercises.map((ex, i) => (
                  <View key={i} style={styles.smartExLine}>
                    <Text style={[styles.smartExIndex, { color: theme.primary }]}>{String(i + 1).padStart(2, '0')}</Text>
                    <Text style={[styles.smartExName, { color: theme.text }]}>
                      {ex.name}
                      <Text style={{ color: theme.textSecondary, fontWeight: '500' }}>{`  ${ex.sets} × ${ex.reps}${ex.weight && ex.weight !== '0' ? ` · ${ex.weight} kg` : ''}`}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => { hapticFeedback.light(); generateSmartWorkout(); }}
                style={styles.suggestRow}
                accessibilityRole="button"
              >
                <MaterialIcons name="auto-awesome" size={18} color={theme.primary} />
                <Text style={[styles.suggestRowText, { color: theme.primary }]}>Suggest a workout for today</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Templates */}
          <View style={styles.templatesHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>My templates</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={() => { hapticFeedback.light(); setShowCreateFolderModal(true); }} hitSlop={{ top: 8, bottom: 8 }} accessibilityRole="button">
                <Text style={[styles.headerLink, { color: theme.primary }]}>New folder</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { hapticFeedback.light(); setShowCreateModal(true); }} hitSlop={{ top: 8, bottom: 8 }} accessibilityRole="button">
                <Text style={[styles.headerLink, { color: theme.primary }]}>New template</Text>
              </TouchableOpacity>
            </View>
          </View>

          {templates.filter((t) => !t.folderId).length > 0 && (
            <View style={[styles.rowList, { borderTopColor: hairlineColor }]}>
              {templates.filter((t) => !t.folderId).map((template) => renderTemplateRow(template))}
            </View>
          )}

          {folders.map((folder) => {
            const folderTemplates = templates.filter((t) => t.folderId === folder.id);
            const isExpanded = expandedFolders[folder.id];
            return (
              <View key={folder.id} style={styles.folderBlock}>
                <TouchableOpacity
                  style={[styles.folderRow, { borderTopColor: hairlineColor }]}
                  onPress={() => toggleFolder(folder.id)}
                  onLongPress={() => { hapticFeedback.medium(); setSelectedFolderForMenu(folder); }}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: !!isExpanded }}
                  accessibilityLabel={`${folder.name} folder, ${folderTemplates.length} templates`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.folderRowName, { color: theme.text }]}>{folder.name}</Text>
                    <Text style={[styles.folderRowSub, { color: theme.textSecondary }]}>
                      {folderTemplates.length} {folderTemplates.length === 1 ? 'template' : 'templates'}{isExpanded ? '' : '  ·  tap to open'}
                    </Text>
                  </View>
                  <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={24} color={theme.textSecondary} />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.folderInner}>
                    {folderTemplates.length === 0 ? (
                      <Text style={[styles.folderEmpty, { color: theme.textSecondary }]}>No templates in here yet. Long press the folder to rename or delete it.</Text>
                    ) : folderTemplates.map((template) => renderTemplateRow(template, true))}
                  </View>
                )}
              </View>
            );
          })}

          {/* Empty State */}
          {templates.length === 0 && folders.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: theme.text }]}>No templates yet</Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                A template is a workout you can start again and again. Tap New template to build your first one.
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 11, color: theme.textTertiary, textAlign: 'center', paddingHorizontal: 20, marginBottom: 16, lineHeight: 16 }}>
            Workout plans are auto-generated and may not suit all fitness levels. Consult a fitness professional if you have any health concerns.
          </Text>

          <View style={{ height: 120 }} />
        </ScrollView>


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
                  paddingBottom: Math.max(insets.bottom, 14),
                  transform: [{ translateY: slideAnim }]
                },
              ]}
            >
              {(() => {
                const summary = summarizeTemplate(selectedTemplate);
                const hairline = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
                const segmentOpacity = [1, 0.62, 0.42, 0.3, 0.22, 0.16];
                return (
                  <>
                    {/* Top bar */}
                    <View style={styles.detailModalHeader}>
                      <TouchableOpacity
                        onPress={() => setShowTemplateDetail(false)}
                        style={styles.detailCloseButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                      >
                        <MaterialIcons name="close" size={22} color={theme.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          hapticFeedback.light();
                          setEditorTemplate(selectedTemplate);
                          setEditorExercises([...selectedTemplate.exercises]);
                          setShowTemplateDetail(false);
                          setShowTemplateEditor(true);
                        }}
                        style={styles.detailEditButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.detailEditText, { color: theme.primary }]}>Edit</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Title block */}
                    <Text style={[styles.detailModalTitle, { color: theme.text }]}>
                      {selectedTemplate?.name}
                    </Text>
                    <Text style={[styles.detailStats, { color: theme.textSecondary }]}>
                      {summary.exerciseCount} {summary.exerciseCount === 1 ? 'exercise' : 'exercises'}
                      {'  ·  '}{summary.totalSets} {summary.totalSets === 1 ? 'set' : 'sets'}
                      {summary.estMinutes ? `  ·  about ${summary.estMinutes} min` : ''}
                    </Text>
                    {detailInsights?.lastDoneLabel ? (
                      <Text style={[styles.detailLastDone, { color: theme.textSecondary }]}>
                        Last done <Text style={{ color: theme.text, fontWeight: '700' }}>{detailInsights.lastDoneLabel}</Text>
                        {detailInsights.lastDurationSec ? ` in ${formatDuration(detailInsights.lastDurationSec)}` : ''}
                        {detailInsights.timesDone > 1 ? `  ·  done ${detailInsights.timesDone} times` : ''}
                      </Text>
                    ) : (
                      <Text style={[styles.detailLastDone, { color: theme.textSecondary }]}>Not done yet</Text>
                    )}

                    {/* Muscle split */}
                    {summary.muscleSplit.length > 0 && (
                      <View style={styles.detailSplit}>
                        <View style={[styles.detailSplitBar, { backgroundColor: hairline }]}>
                          {summary.muscleSplit.map((m, i) => (
                            <View
                              key={m.bodyPart}
                              style={{
                                flex: m.share,
                                backgroundColor: theme.primary,
                                opacity: segmentOpacity[Math.min(i, segmentOpacity.length - 1)],
                                marginRight: i < summary.muscleSplit.length - 1 ? 2 : 0,
                              }}
                            />
                          ))}
                        </View>
                        <View style={styles.detailSplitLegend}>
                          {summary.muscleSplit.map((m, i) => (
                            <Text
                              key={m.bodyPart}
                              style={[styles.detailSplitLabel, { color: i === 0 ? theme.text : theme.textSecondary }]}
                            >
                              {m.bodyPart} <Text style={{ color: theme.primary }}>{Math.round(m.share * 100)}%</Text>
                            </Text>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Exercises */}
                    <ScrollView style={styles.detailExerciseList} showsVerticalScrollIndicator={false}>
                      {selectedTemplate?.exercises.map((exercise, index) => {
                        const sets = Number(exercise.sets) || 0;
                        const reps = exercise.reps ? String(exercise.reps).trim() : '';
                        const weight = exercise.weight && exercise.weight !== '0' && exercise.weight !== '' ? `${exercise.weight} kg` : '';
                        const last = lastLiftFor(detailInsights, exercise.name);
                        const scheme = [sets ? `${sets} × ${reps || '?'}` : reps, weight, exercise.bodyPart].filter(Boolean).join('  ·  ');
                        return (
                          <View
                            key={`${exercise.name}-${index}`}
                            style={[
                              styles.detailExerciseItem,
                              { borderTopColor: hairline, borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth },
                            ]}
                          >
                            <Text style={[styles.detailExerciseIndex, { color: theme.primary }]}>
                              {String(index + 1).padStart(2, '0')}
                            </Text>
                            <View style={styles.detailExerciseInfo}>
                              <Text style={[styles.detailExerciseName, { color: theme.text }]}>{exercise.name}</Text>
                              <Text style={[styles.detailExerciseMeta, { color: theme.textSecondary }]}>
                                {scheme}
                                {last ? (
                                  <Text style={{ color: theme.primary }}>{`  ·  last ${last.weight} kg × ${last.reps}`}</Text>
                                ) : null}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.detailExerciseHelp}
                              onPress={() => openExerciseHowTo(exercise)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityRole="button"
                              accessibilityLabel={`How to do ${exercise.name}`}
                            >
                              <Text style={[styles.detailExerciseHelpText, { color: theme.primary }]}>How to</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.detailActionButtons}>
                      <TouchableOpacity
                        style={[styles.detailScheduleButton, { borderColor: theme.primary }]}
                        onPress={() => {
                          hapticFeedback.medium();
                          const templateToSched = selectedTemplate;
                          setShowTemplateDetail(false);
                          // Open the native pull-to-dismiss Schedule Workout modal screen.
                          setTimeout(() => {
                            navigation.navigate('ScheduleWorkout', { template: templateToSched });
                          }, 300);
                        }}
                        accessibilityRole="button"
                      >
                        <MaterialIcons name="event" size={19} color={theme.primary} />
                        <Text style={[styles.detailScheduleButtonText, { color: theme.primary }]}>Schedule</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.detailStartButton, { backgroundColor: theme.primary }]}
                        onPress={() => handleStartTemplateWorkout(selectedTemplate)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                      >
                        <LinearGradient
                          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.14)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                        <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
                        <Text style={styles.detailStartButtonText}>Start Now</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.detailDeleteButton}
                      onPress={() => handleDeleteTemplate(selectedTemplate?.id)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.detailDeleteButtonText}>Delete Template</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
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
          <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            {/* Header */}
            <View style={[styles.editorHeader, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={handleCancelEditor} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={[styles.editorCancel, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <Text style={[styles.editorHeaderTitle, { color: theme.text }]} numberOfLines={1}>
                {editorTemplate?.exercises?.length > 0 ? "Edit Template" : "Create Template"}
              </Text>

              <TouchableOpacity
                onPress={handleSaveTemplate}
                activeOpacity={0.85}
                style={[
                  styles.editorSavePill,
                  {
                    backgroundColor:
                      editorTemplate?.name?.trim() && editorExercises.length > 0
                        ? theme.primary
                        : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.editorSavePillText,
                    {
                      color:
                        editorTemplate?.name?.trim() && editorExercises.length > 0
                          ? "#FFFFFF"
                          : theme.textSecondary,
                    },
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.editorContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={styles.editorContentContainer}
            >
              {!showExercisePickerInEditor && (
                <>
                  {/* Template name */}
                  <View style={styles.editorBlock}>
                    <Text style={[styles.editorOverline, { color: theme.textSecondary }]}>TEMPLATE NAME</Text>
                    <TextInput
                      style={[
                        styles.editorNameInput,
                        { color: theme.text, borderBottomColor: editorNameFocused ? theme.primary : theme.border },
                      ]}
                      value={editorTemplate?.name || ""}
                      onChangeText={(text) => setEditorTemplate({ ...editorTemplate, name: text })}
                      onFocus={() => setEditorNameFocused(true)}
                      onBlur={() => setEditorNameFocused(false)}
                      placeholder="Push Day"
                      placeholderTextColor={isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)"}
                      returnKeyType="done"
                    />
                  </View>

                  {/* Exercises */}
                  <View style={styles.editorBlock}>
                    <View style={styles.editorSectionRow}>
                      <View style={styles.editorSectionTitleWrap}>
                        <Text style={[styles.editorSectionTitle, { color: theme.text }]}>Exercises</Text>
                        {editorExercises.length > 0 && (
                          <View style={[styles.editorCountPill, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
                            <Text style={[styles.editorCountPillText, { color: theme.textSecondary }]}>{editorExercises.length}</Text>
                          </View>
                        )}
                      </View>

                      <TouchableOpacity
                        onPress={handleAddExerciseToEditor}
                        activeOpacity={0.85}
                        style={[styles.editorAddPill, { backgroundColor: theme.primary }]}
                      >
                        <MaterialIcons name="add" size={18} color="#FFFFFF" />
                        <Text style={styles.editorAddPillText}>Add Exercise</Text>
                      </TouchableOpacity>
                    </View>

                    {editorExercises.map((exercise, index) => {
                      const setCount = Number(exercise.sets) || 0;
                      const summary = [
                        `${setCount} ${setCount === 1 ? "set" : "sets"}`,
                        exercise.reps ? `${exercise.reps} reps` : null,
                        exercise.weight ? `${exercise.weight} kg` : null,
                      ]
                        .filter(Boolean)
                        .join("  ·  ");

                      return (
                        <View
                          key={index}
                          style={[
                            styles.exCard,
                            {
                              backgroundColor: isDark ? "rgba(255,255,255,0.045)" : "#FFFFFF",
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <View style={styles.exCardTop}>
                            <Text style={[styles.exIndex, { color: theme.primary }]}>
                              {String(index + 1).padStart(2, "0")}
                            </Text>

                            <View style={styles.exTitleWrap}>
                              <Text style={[styles.exName, { color: theme.text }]}>{exercise.name}</Text>
                              <Text style={[styles.exMeta, { color: theme.textSecondary }]}>
                                {[exercise.bodyPart, exercise.equipment].filter(Boolean).join("  ·  ")}
                              </Text>
                            </View>

                            <TouchableOpacity
                              onPress={() => handleRemoveExerciseFromEditor(index)}
                              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                              <MaterialIcons name="close" size={20} color={theme.error || "#FF3B30"} />
                            </TouchableOpacity>
                          </View>

                          <Text style={[styles.exSummary, { color: theme.textSecondary }]}>{summary}</Text>

                          <Text style={[styles.exMicroLabel, { color: theme.textSecondary }]}>SETS</Text>
                          <View style={styles.exSetsRow}>
                            {[1, 2, 3, 4, 5, 6].map((num) => {
                              const active = setCount === num;
                              return (
                                <TouchableOpacity
                                  key={num}
                                  onPress={() => {
                                    hapticFeedback.selection();
                                    handleUpdateExerciseInEditor(index, "sets", num);
                                  }}
                                  activeOpacity={0.8}
                                  style={[
                                    styles.exSetChip,
                                    {
                                      backgroundColor: active
                                        ? theme.primary
                                        : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                      borderColor: active ? theme.primary : theme.border,
                                    },
                                  ]}
                                >
                                  <Text style={[styles.exSetChipText, { color: active ? "#FFFFFF" : theme.text }]}>
                                    {num}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <View style={styles.exFieldRow}>
                            <View style={styles.exField}>
                              <Text style={[styles.exMicroLabel, { color: theme.textSecondary }]}>WEIGHT</Text>
                              <View
                                style={[
                                  styles.exInputWrap,
                                  {
                                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                    borderColor: theme.border,
                                  },
                                ]}
                              >
                                <TextInput
                                  style={[styles.exInput, { color: theme.text }]}
                                  value={exercise.weight}
                                  onChangeText={(text) => handleUpdateExerciseInEditor(index, "weight", text)}
                                  placeholder="0"
                                  placeholderTextColor={isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)"}
                                  keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                                />
                                <Text style={[styles.exUnit, { color: theme.textSecondary }]}>kg</Text>
                              </View>
                            </View>

                            <View style={styles.exField}>
                              <Text style={[styles.exMicroLabel, { color: theme.textSecondary }]}>REPS</Text>
                              <View
                                style={[
                                  styles.exInputWrap,
                                  {
                                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                    borderColor: theme.border,
                                  },
                                ]}
                              >
                                <TextInput
                                  style={[styles.exInput, { color: theme.text }]}
                                  value={exercise.reps}
                                  onChangeText={(text) => handleUpdateExerciseInEditor(index, "reps", text)}
                                  placeholder="0"
                                  placeholderTextColor={isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)"}
                                  keyboardType="number-pad"
                                />
                                <Text style={[styles.exUnit, { color: theme.textSecondary }]}>reps</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}

                    {editorExercises.length === 0 && (
                      <View style={styles.exEmpty}>
                        <MaterialIcons name="fitness-center" size={40} color={theme.textSecondary} style={{ opacity: 0.35 }} />
                        <Text style={[styles.exEmptyTitle, { color: theme.text }]}>No exercises yet</Text>
                        <Text style={[styles.exEmptySub, { color: theme.textSecondary }]}>
                          Add your first exercise to build this template.
                        </Text>
                        <TouchableOpacity
                          onPress={handleAddExerciseToEditor}
                          activeOpacity={0.85}
                          style={[styles.exEmptyBtn, { backgroundColor: theme.primary }]}
                        >
                          <MaterialIcons name="add" size={18} color="#FFFFFF" />
                          <Text style={styles.exEmptyBtnText}>Add Exercise</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* Embedded exercise picker */}
              {showExercisePickerInEditor && (() => {
                const q = editorSearchQuery.trim().toLowerCase();
                const bodyParts = ["All", ...Array.from(new Set(editorExercisesList.map((e) => e.bodyPart).filter(Boolean)))];
                const filtered = editorExercisesList.filter((ex) => {
                  const matchesQuery =
                    !q ||
                    ex.name.toLowerCase().includes(q) ||
                    (ex.bodyPart || "").toLowerCase().includes(q);
                  const matchesPart = editorBodyPartFilter === "All" || ex.bodyPart === editorBodyPartFilter;
                  return matchesQuery && matchesPart;
                });

                return (
                  <View style={styles.pickerWrap}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowExercisePickerInEditor(false);
                          setEditorSearchQuery("");
                        }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <MaterialIcons name="arrow-back" size={24} color={theme.text} />
                      </TouchableOpacity>
                      <Text style={[styles.pickerTitle, { color: theme.text }]}>Add Exercise</Text>
                      <View style={{ width: 24 }} />
                    </View>

                    <View
                      style={[
                        styles.pickerSearch,
                        {
                          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <MaterialIcons name="search" size={20} color={theme.textSecondary} />
                      <TextInput
                        style={[styles.pickerSearchInput, { color: theme.text }]}
                        placeholder="Search exercises"
                        placeholderTextColor={theme.textSecondary}
                        value={editorSearchQuery}
                        onChangeText={setEditorSearchQuery}
                        autoCorrect={false}
                      />
                      {editorSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setEditorSearchQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <MaterialIcons name="close" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {bodyParts.length > 1 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.pickerChipsRow}
                        keyboardShouldPersistTaps="handled"
                      >
                        {bodyParts.map((part) => {
                          const active = editorBodyPartFilter === part;
                          return (
                            <TouchableOpacity
                              key={part}
                              onPress={() => {
                                hapticFeedback.selection();
                                setEditorBodyPartFilter(part);
                              }}
                              activeOpacity={0.8}
                              style={[
                                styles.pickerChip,
                                {
                                  backgroundColor: active ? theme.primary : "transparent",
                                  borderColor: active ? theme.primary : theme.border,
                                },
                              ]}
                            >
                              <Text style={[styles.pickerChipText, { color: active ? "#FFFFFF" : theme.textSecondary }]}>
                                {part}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}

                    <TouchableOpacity
                      onPress={() => {
                        hapticFeedback.light();
                        setShowCreateExerciseInEditor(true);
                      }}
                      activeOpacity={0.8}
                      style={[styles.pickerCreateRow, { borderColor: theme.primary }]}
                    >
                      <MaterialIcons name="add" size={20} color={theme.primary} />
                      <Text style={[styles.pickerCreateText, { color: theme.primary }]}>
                        {editorSearchQuery.trim()
                          ? `Create "${editorSearchQuery.trim()}"`
                          : "Create custom exercise"}
                      </Text>
                    </TouchableOpacity>

                    {loadingExercises ? (
                      <View style={styles.pickerLoading}>
                        <ActivityIndicator color={theme.primary} />
                        <Text style={[styles.pickerLoadingText, { color: theme.textSecondary }]}>Loading exercises</Text>
                      </View>
                    ) : filtered.length === 0 ? (
                      <View style={styles.pickerEmpty}>
                        <Text style={[styles.pickerEmptyTitle, { color: theme.text }]}>No matches</Text>
                        <Text style={[styles.pickerEmptySub, { color: theme.textSecondary }]}>
                          Nothing here by that name. Create it as a custom exercise above.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.pickerList}>
                        {filtered.map((exercise, index) => (
                          <TouchableOpacity
                            key={exercise.id || index}
                            style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                            onPress={() => handleExerciseSelectedForEditor(exercise)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.pickerItemInfo}>
                              <View style={styles.pickerItemNameRow}>
                                <Text style={[styles.pickerItemName, { color: theme.text }]}>{exercise.name}</Text>
                                {exercise.isCustom && (
                                  <View style={[styles.pickerCustomTag, { borderColor: theme.primary }]}>
                                    <Text style={[styles.pickerCustomTagText, { color: theme.primary }]}>Custom</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.pickerItemMeta, { color: theme.textSecondary }]}>
                                {[exercise.bodyPart, exercise.equipment].filter(Boolean).join("  ·  ")}
                              </Text>
                            </View>
                            <MaterialIcons name="add" size={22} color={theme.primary} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()}

              <View style={{ height: 100 }} />
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Create a custom exercise without leaving the template editor. Saves via
              ExercisesService, then drops straight into the template. */}
          <AddExerciseModal
            visible={showCreateExerciseInEditor}
            onClose={() => setShowCreateExerciseInEditor(false)}
            onAdd={handleCreateCustomExerciseInEditor}
            initialName={editorSearchQuery.trim()}
          />
        </Modal>

        {/* Mini Workout Player removed — it overlapped template cards and duplicated
           the active workout display. Users resume workouts from the Gym tab. */}

        {/* Schedule Workout is now a native modal screen (navigation.navigate). */}

        {/* Workout Split Modal */}
        <WorkoutSplitModal
          visible={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          onSave={handleSplitSave}
        />

        {/* Coach Chat Button - Fixed at bottom */}
        {!showTemplateEditor && !showSplitModal && !showTemplateDetail && !showCreateModal && !showCreateFolderModal && (
          <View style={[styles.coachButtonContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.coachButton, { borderColor: hairlineColor }]}
              activeOpacity={0.7}
              onPress={() => {
                hapticFeedback.medium();
                navigation.navigate('CoachChat');
              }}
              accessibilityRole="button"
              accessibilityLabel="Ask the coach anything"
            >
              <View style={styles.coachButtonContent}>
                <MaterialIcons name="directions-run" size={20} color={theme.primary} />
                <Text style={[styles.coachButtonText, { color: theme.textSecondary }]}>Ask me anything...</Text>
                <MaterialIcons name="arrow-forward" size={18} color={theme.primary} />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
  );

  if (asScreen) {
    return content;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {content}
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
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 120 : 90,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  kicker: { fontSize: 13, fontWeight: "600" },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 54,
    borderRadius: 16,
    overflow: "hidden",
  },
  heroButtonText: { color: "#FFFFFF", fontSize: 16.5, fontWeight: "800", letterSpacing: -0.2 },
  todayBlock: { marginTop: 22, marginBottom: 26 },
  todayEmpty: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  todayRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  todayName: { flex: 1, fontSize: 17, fontWeight: "800", letterSpacing: -0.2, lineHeight: 23 },
  rowStart: { fontSize: 15, fontWeight: "800" },
  headerLink: { fontSize: 14, fontWeight: "700", marginLeft: 18 },
  rowList: { borderTopWidth: StyleSheet.hairlineWidth },
  templateRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  templateRowName: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3, lineHeight: 23 },
  templateRowMeta: { fontSize: 13.5, fontWeight: "500", marginTop: 3, lineHeight: 18 },
  templateRowLast: { fontSize: 12.5, fontWeight: "600", marginTop: 3 },
  folderBlock: { marginTop: 8 },
  folderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  folderRowName: { fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  folderRowSub: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  folderInner: { paddingBottom: 6 },
  folderEmpty: { fontSize: 13.5, lineHeight: 19, paddingLeft: 14, paddingBottom: 10 },
  splitRow: { paddingVertical: 6, marginBottom: 10 },
  splitRowTitle: { fontSize: 15, fontWeight: "800" },
  splitRowSub: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  pillTab: { paddingTop: 2, marginRight: 14 },
  pillTabText: { fontSize: 13 },
  pillTabBar: { height: 2, borderRadius: 1, marginTop: 4 },
  smartBlock: { paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  smartHead: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  smartName: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  smartReason: { fontSize: 13.5, lineHeight: 19, marginTop: 3 },
  smartExLine: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 5 },
  smartExIndex: { width: 28, fontSize: 12.5, fontWeight: "800", lineHeight: 20, fontVariant: ["tabular-nums"] },
  smartExName: { flex: 1, fontSize: 15, fontWeight: "700", lineHeight: 20 },
  suggestRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  suggestRowText: { fontSize: 15, fontWeight: "800" },
  emptyWorkoutButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 4,
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
    marginTop: 26,
    marginBottom: 10,
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
    marginBottom: 6,
  },
  detailCloseButton: {
    padding: 6,
    marginLeft: -6,
  },
  detailEditButton: {
    paddingVertical: 6,
    paddingLeft: 10,
  },
  detailEditText: {
    fontSize: 16,
    fontWeight: "700",
  },
  detailModalTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  detailStats: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
    fontVariant: ["tabular-nums"],
  },
  detailLastDone: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  detailSplit: {
    marginTop: 14,
    marginBottom: 6,
  },
  detailSplitBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  detailSplitLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    columnGap: 14,
    rowGap: 2,
  },
  detailSplitLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  detailExerciseList: {
    maxHeight: "52%",
    marginTop: 8,
    marginBottom: 14,
  },
  detailExerciseItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
  },
  detailExerciseIndex: {
    width: 30,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 21,
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"],
  },
  detailExerciseInfo: {
    flex: 1,
    paddingRight: 10,
  },
  detailExerciseName: {
    fontSize: 16.5,
    fontWeight: "700",
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  detailExerciseMeta: {
    fontSize: 13.5,
    fontWeight: "500",
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },
  detailExerciseHelp: {
    paddingVertical: 2,
    paddingLeft: 6,
  },
  detailExerciseHelpText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 21,
  },
  detailActionButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  detailScheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 54,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  detailScheduleButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  detailStartButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 54,
    borderRadius: 16,
    overflow: "hidden",
  },
  detailStartButtonText: {
    color: "#FFFFFF",
    fontSize: 16.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  detailDeleteButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  detailDeleteButtonText: {
    color: "#FF453A",
    fontSize: 14,
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
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editorCancel: {
    fontSize: 16,
    fontWeight: "500",
    minWidth: 62,
  },
  editorHeaderButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  editorHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    flex: 1,
    textAlign: "center",
  },
  editorSavePill: {
    minWidth: 62,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  editorSavePillText: {
    fontSize: 15,
    fontWeight: "700",
  },
  editorContent: {
    flex: 1,
  },
  editorContentContainer: {
    paddingBottom: Platform.OS === "ios" ? 40 : 60, // Minimal inset so keyboard does not leave a gap
  },

  // ── Redesigned editor ────────────────────────────────────────────────
  editorBlock: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  editorOverline: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  editorNameInput: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 2,
  },
  editorSectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  editorSectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  editorSectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  editorCountPill: {
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: "center",
  },
  editorCountPillText: {
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  editorAddPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
  },
  editorAddPillText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  exCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  exCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  exIndex: {
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    marginTop: 3,
  },
  exTitleWrap: {
    flex: 1,
  },
  exName: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  exMeta: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  exSummary: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
    fontVariant: ["tabular-nums"],
  },
  exMicroLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 8,
  },
  exSetsRow: {
    flexDirection: "row",
    gap: 8,
  },
  exSetChip: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  exSetChipText: {
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  exFieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  exField: {
    flex: 1,
  },
  exInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  exInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    padding: 0,
  },
  exUnit: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },

  exEmpty: {
    alignItems: "center",
    paddingVertical: 44,
    gap: 8,
  },
  exEmptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 6,
  },
  exEmptySub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  exEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    marginTop: 10,
  },
  exEmptyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Embedded exercise picker ─────────────────────────────────────────
  pickerWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  pickerSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    padding: 0,
  },
  pickerChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 14,
    paddingRight: 4,
  },
  pickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  pickerChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pickerCreateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  pickerCreateText: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  pickerLoading: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 40,
  },
  pickerLoadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  pickerEmpty: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 40,
  },
  pickerEmptyTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  pickerEmptySub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  pickerList: {
    marginTop: 4,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemInfo: {
    flex: 1,
  },
  pickerItemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  pickerItemName: {
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  pickerCustomTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pickerCustomTagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  pickerItemMeta: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
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

  // ── Generate Button ──
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },

  // ── Split Banner ──
  splitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  splitBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  splitBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },

  // ── Smart Workout Card ──
  smartCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  smartCardShimmer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
  },
  smartCardShimmerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  smartCardAccent: {
    height: 4,
    width: '100%',
  },
  smartCardContent: {
    padding: 16,
  },
  smartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  smartCardIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartCardName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  smartCardReason: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  smartCardStartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  smartCardStartText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  smartCardExercises: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  smartCardExPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  smartCardExName: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 120,
  },
  smartCardExDetail: {
    fontSize: 11,
    fontWeight: '500',
  },
  coachButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
  },
  coachButton: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  coachButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachButtonText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
  },
});

export default TemplateSelectionModal;
