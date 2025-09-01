import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TextInput, View, StyleSheet, Keyboard } from 'react-native';

const BulletproofTextInput = forwardRef(({ 
  value, 
  onChangeText, 
  placeholder, 
  placeholderTextColor,
  style,
  onSubmitEditing,
  ...props 
}, ref) => {
  const inputRef = useRef(null);
  const isIntentionalBlur = useRef(false);
  const lastValue = useRef(value || '');

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => {
      isIntentionalBlur.current = true;
      inputRef.current?.blur();
    },
    isFocused: () => inputRef.current?.isFocused(),
  }));

  const handleTextChange = (text) => {
    console.log('🎯 BulletproofTextInput: Text changing from', lastValue.current, 'to', text);
    lastValue.current = text;
    if (onChangeText) {
      onChangeText(text);
    }
  };

  const handleSubmit = () => {
    console.log('🎯 BulletproofTextInput: DONE button pressed - allowing blur');
    isIntentionalBlur.current = true;
    if (onSubmitEditing) {
      onSubmitEditing();
    }
    // Allow keyboard to dismiss naturally
  };

  const handleFocus = () => {
    console.log('🎯 BulletproofTextInput: FOCUSED - keyboard opened');
    isIntentionalBlur.current = false;
  };

  const handleBlur = () => {
    console.log('🎯 BulletproofTextInput: BLUR attempted - intentional?', isIntentionalBlur.current);
    
    if (!isIntentionalBlur.current) {
      console.log('🚫 BulletproofTextInput: Preventing unintentional blur - refocusing!');
      // Immediately refocus if this wasn't intentional
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);
    } else {
      console.log('✅ BulletproofTextInput: Allowing intentional blur');
      isIntentionalBlur.current = false; // Reset for next time
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={style}
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        onSubmitEditing={handleSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
        
        // Ultra-stable keyboard settings
        maxLength={30}
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus={false}
        returnKeyType="done"
        blurOnSubmit={true} // Allow blur ONLY on submit
        keyboardType="default"
        textContentType="name"
        enablesReturnKeyAutomatically={false}
        
        // Prevent any accidental dismissal
        clearButtonMode="never"
        selectTextOnFocus={false}
        
        {...props}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    // Stable container
  },
});

BulletproofTextInput.displayName = 'BulletproofTextInput';

export default BulletproofTextInput;

