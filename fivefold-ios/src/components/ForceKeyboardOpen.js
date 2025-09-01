import React, { useRef, useEffect, useState } from 'react';
import { TextInput, View, StyleSheet, Keyboard, Platform } from 'react-native';

const ForceKeyboardOpen = ({ 
  value, 
  onChangeText, 
  placeholder, 
  placeholderTextColor,
  style,
  onSubmitEditing,
  ...props 
}) => {
  const inputRef = useRef(null);
  const [internalValue, setInternalValue] = useState(value || '');
  const [isDone, setIsDone] = useState(false);
  const focusInterval = useRef(null);
  const forceRefocusCount = useRef(0);

  // NUCLEAR OPTION: Force focus every 100ms until done
  useEffect(() => {
    const startAggressiveFocus = () => {
      if (focusInterval.current) {
        clearInterval(focusInterval.current);
      }

      focusInterval.current = setInterval(() => {
        if (!isDone && inputRef.current) {
          const isFocused = inputRef.current.isFocused();
          if (!isFocused) {
            console.log('🚨 NUCLEAR: Force refocusing keyboard!', forceRefocusCount.current++);
            inputRef.current.focus();
          }
        }
      }, 100); // Check every 100ms
    };

    // Start aggressive focusing
    startAggressiveFocus();

    return () => {
      if (focusInterval.current) {
        clearInterval(focusInterval.current);
      }
    };
  }, [isDone]);

  // Focus immediately when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current && !isDone) {
        console.log('🚨 NUCLEAR: Initial focus');
        inputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleTextChange = (text) => {
    console.log('🚨 NUCLEAR: Text changing to:', text);
    setInternalValue(text);
    if (onChangeText) {
      onChangeText(text);
    }
  };

  const handleSubmit = () => {
    console.log('🚨 NUCLEAR: DONE pressed - allowing keyboard to close');
    setIsDone(true);
    if (focusInterval.current) {
      clearInterval(focusInterval.current);
    }
    if (onSubmitEditing) {
      onSubmitEditing();
    }
  };

  const handleFocus = () => {
    console.log('🚨 NUCLEAR: Keyboard opened');
  };

  const handleBlur = () => {
    console.log('🚨 NUCLEAR: Blur detected - will force refocus unless done');
    if (!isDone) {
      // Immediate refocus
      setTimeout(() => {
        if (inputRef.current && !isDone) {
          console.log('🚨 NUCLEAR: Emergency refocus!');
          inputRef.current.focus();
        }
      }, 1);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={style}
        value={internalValue}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        onSubmitEditing={handleSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
        
        // Most aggressive keyboard settings possible
        maxLength={30}
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus={true} // Force auto focus
        returnKeyType="done"
        blurOnSubmit={false} // NEVER blur except on submit
        keyboardType="default"
        textContentType="name"
        enablesReturnKeyAutomatically={false}
        clearButtonMode="never"
        selectTextOnFocus={false}
        
        // Disable all possible dismissal triggers
        onEndEditing={() => {}} // Block end editing
        onSelectionChange={() => {}} // Block selection changes
        
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Stable container
  },
});

export default ForceKeyboardOpen;

