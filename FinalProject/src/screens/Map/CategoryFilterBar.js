import React from 'react';
import { View } from 'react-native';
import { CategoryFilter } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './mapStyles';

const CategoryFilterBar = ({ categoryDisplay, selectedCategory, onSelectCategory }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.filterRow, { backgroundColor: `${theme.card}dd`, borderColor: theme.border }]}> 
      <CategoryFilter
        categoryDisplay={categoryDisplay}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
      />
    </View>
  );
};

export default CategoryFilterBar;
