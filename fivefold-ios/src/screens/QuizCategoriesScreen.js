import React from 'react';
import QuizGames from '../components/QuizGames';

const QuizCategoriesScreen = ({ navigation }) => (
  <QuizGames visible={true} onClose={() => navigation.goBack()} asScreen={true} />
);

export default QuizCategoriesScreen;
