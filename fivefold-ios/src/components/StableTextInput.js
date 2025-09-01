import React, { useState, useRef, useEffect, memo } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';

const StableTextInput = memo(({ 
  value, 
  onChangeText, 
  placeholder, 
  placeholderTextColor,
  style,
  onSubmitEditing,
  ...props 
}) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const inputRef = useRef(null);
  const lastValue = useRef(value || '');

  // Only update internal value if external value actually changed
  useEffect(() => {
    if (value !== lastValue.current) {
      setInternalValue(value || '');
      lastValue.current = value || '';
    }
  }, [value]);

  const handleTextChange = (text) => {
    console.log('🎯 StableTextInput: Text changed to:', text);
    setInternalValue(text);
    lastValue.current = text;
    if (onChangeText) {
      onChangeText(text);
    }
  };

  const handleSubmit = () => {
    console.log('🎯 StableTextInput: Submit pressed');
    if (onSubmitEditing) {
      onSubmitEditing();
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
        maxLength={30}
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus={false}
        returnKeyType="done"
        blurOnSubmit={false}
        keyboardType="default"
        textContentType="name"
        enablesReturnKeyAutomatically={false}
        onFocus={() => {
          console.log('🎯 StableTextInput: FOCUSED');
        }}
        onBlur={() => {
          console.log('🎯 StableTextInput: BLURRED');
        }}
        {...props}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    // Empty stable container
  },
});

StableTextInput.displayName = 'StableTextInput';

export default StableTextInput;

