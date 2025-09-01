import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import completeBibleService from '../services/completeBibleService';
import { useTheme } from '../contexts/ThemeContext';

const BibleVersionTester = ({ onClose }) => {
  const { theme } = useTheme();
  const [testing, setTesting] = useState(true);
  const [results, setResults] = useState(null);
  const [currentTest, setCurrentTest] = useState('');

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    const testResults = {
      versions: {},
      summary: { passed: 0, failed: 0 }
    };

    const versions = ['kjv', 'niv', 'nkjv', 'esv', 'nlt', 'msg'];
    const testChapters = [
      { id: 'genesis_1', name: 'Genesis 1', expectedVerses: 31 },
      { id: 'exodus_20', name: 'Exodus 20', expectedVerses: 26 },
      { id: 'psalms_23', name: 'Psalm 23', expectedVerses: 6 },
      { id: 'isaiah_53', name: 'Isaiah 53', expectedVerses: 12 },
      { id: 'matthew_5', name: 'Matthew 5', expectedVerses: 48 },
      { id: 'john_3', name: 'John 3', expectedVerses: 36 },
      { id: 'romans_8', name: 'Romans 8', expectedVerses: 39 },
      { id: 'revelation_22', name: 'Revelation 22', expectedVerses: 21 }
    ];

    for (const version of versions) {
      setCurrentTest(`Testing ${version.toUpperCase()}...`);
      testResults.versions[version] = {
        chapters: {},
        passed: 0,
        failed: 0,
        sample: ''
      };

      for (const chapter of testChapters) {
        try {
          const verses = await completeBibleService.getVerses(chapter.id, version);
          
          if (verses && verses.length > 0) {
            const status = verses.length >= chapter.expectedVerses * 0.8 ? 'passed' : 'partial';
            testResults.versions[version].chapters[chapter.name] = {
              status,
              verseCount: verses.length,
              expected: chapter.expectedVerses,
              firstVerse: verses[0].content.substring(0, 50) + '...'
            };
            
            if (status === 'passed') {
              testResults.versions[version].passed++;
              testResults.summary.passed++;
            } else {
              testResults.versions[version].failed++;
              testResults.summary.failed++;
            }
            
            // Save sample for John 3:16
            if (chapter.id === 'john_3' && verses[15]) {
              testResults.versions[version].sample = verses[15].content;
            }
          } else {
            testResults.versions[version].chapters[chapter.name] = {
              status: 'failed',
              verseCount: 0,
              expected: chapter.expectedVerses
            };
            testResults.versions[version].failed++;
            testResults.summary.failed++;
          }
        } catch (error) {
          testResults.versions[version].chapters[chapter.name] = {
            status: 'error',
            error: error.message
          };
          testResults.versions[version].failed++;
          testResults.summary.failed++;
        }
      }
    }

    // Check if versions are different
    const samples = Object.values(testResults.versions).map(v => v.sample).filter(s => s);
    const uniqueSamples = new Set(samples);
    testResults.versionsAreDifferent = uniqueSamples.size > 1;

    setResults(testResults);
    setTesting(false);
  };

  if (testing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.testingText, { color: theme.text }]}>{currentTest}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Bible Version Test Results</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.closeButton, { color: theme.primary }]}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.summaryTitle, { color: theme.text }]}>Overall Results</Text>
        <Text style={[styles.summaryText, { color: theme.text }]}>
          ✅ Passed: {results.summary.passed}
        </Text>
        <Text style={[styles.summaryText, { color: theme.text }]}>
          ❌ Failed: {results.summary.failed}
        </Text>
        <Text style={[styles.summaryText, { color: theme.text }]}>
          {results.versionsAreDifferent ? 
            '✅ Versions show different text' : 
            '❌ WARNING: All versions showing same text!'}
        </Text>
      </View>

      {Object.entries(results.versions).map(([version, data]) => (
        <View key={version} style={[styles.versionCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.versionTitle, { color: theme.text }]}>
            {version.toUpperCase()} - {data.passed}/{data.passed + data.failed} Passed
          </Text>
          
          {Object.entries(data.chapters).map(([chapter, info]) => (
            <View key={chapter} style={styles.chapterRow}>
              <Text style={[styles.chapterName, { color: theme.text }]}>{chapter}</Text>
              {info.status === 'passed' && (
                <Text style={styles.passedText}>✅ {info.verseCount} verses</Text>
              )}
              {info.status === 'partial' && (
                <Text style={styles.warningText}>⚠️ {info.verseCount}/{info.expected}</Text>
              )}
              {info.status === 'failed' && (
                <Text style={styles.failedText}>❌ No verses</Text>
              )}
              {info.status === 'error' && (
                <Text style={styles.failedText}>❌ Error</Text>
              )}
            </View>
          ))}
          
          {data.sample && (
            <View style={styles.sampleBox}>
              <Text style={[styles.sampleLabel, { color: theme.textSecondary }]}>John 3:16:</Text>
              <Text style={[styles.sampleText, { color: theme.text }]} numberOfLines={2}>
                "{data.sample}"
              </Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 16,
  },
  testingText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  summaryCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 16,
    marginVertical: 2,
  },
  versionCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  versionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  chapterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  chapterName: {
    fontSize: 14,
  },
  passedText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  warningText: {
    color: '#FF9800',
    fontSize: 14,
  },
  failedText: {
    color: '#F44336',
    fontSize: 14,
  },
  sampleBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 5,
  },
  sampleLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  sampleText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});

export default BibleVersionTester;
