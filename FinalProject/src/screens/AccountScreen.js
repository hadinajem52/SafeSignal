import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components';

const AccountScreen = () => {
  const { logout, user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      
      <Card style={styles.infoContainer}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email || 'User'}</Text>
      </Card>
      
      {/* Add more user details here */}
      
      <View style={styles.buttonContainer}>
        <Button title="Sign Out" onPress={logout} style={styles.signOutButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    marginTop: 20,
    textAlign: 'center',
  },
  infoContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 20,
  },
  signOutButton: {
    backgroundColor: '#d9534f',
  },
});

export default AccountScreen;
