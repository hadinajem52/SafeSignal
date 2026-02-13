import React from 'react';
import { View } from 'react-native';
import { CategoryFilter } from '../../components';
import styles from './mapStyles';

const CategoryFilterBar = ({ categoryDisplay, selectedCategory, onSelectCategory }) => {
  return (
    <View style={styles.filterRow}>
      <CategoryFilter
        categoryDisplay={categoryDisplay}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
      />
    </View>
  );
};

export default CategoryFilterBar;
