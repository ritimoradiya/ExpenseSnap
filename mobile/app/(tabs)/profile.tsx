import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Alert, Modal, TextInput, ActivityIndicator, Share,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileImage, setProfileImage] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);

  const [newName, setNewName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    loadProfileImage();
  }, []);

  const loadProfileImage = async () => {
    try {
      const image = await AsyncStorage.getItem('profileImage');
      if (image) setProfileImage(image);
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const saveProfileImage = async (uri) => {
    try {
      await AsyncStorage.setItem('profileImage', uri);
      setProfileImage(uri);
    } catch (error) {
      console.error('Error saving profile image:', error);
    }
  };

  const removeProfileImage = async () => {
    try {
      await AsyncStorage.removeItem('profileImage');
      setProfileImage(null);
    } catch (error) {
      console.error('Error removing profile image:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) saveProfileImage(result.assets[0].uri);
  };

  const handleProfileImagePress = () => {
    if (profileImage) {
      Alert.alert('Profile Photo', 'What would you like to do?', [
        { text: 'Change Photo', onPress: pickImage },
        { text: 'Remove Photo', onPress: removeProfileImage, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      pickImage();
    }
  };

  const handleSaveProfile = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    if (newPassword && newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setEditLoading(true);
    try {
      const payload: any = { name: newName.trim() };
      if (newPassword && currentPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      await api.put('/auth/profile', payload);
      Alert.alert('Success', 'Profile updated successfully!');
      setShowEditModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: '💰 Check out ExpenseSnap! The easiest way to track your expenses and manage your budget.',
        title: 'ExpenseSnap - Expense Tracker',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleClearCache = async () => {
    try {
      await AsyncStorage.removeItem('profileImage');
      setProfileImage(null);
      Alert.alert('Done', 'Cache cleared successfully!');
      setShowStorageModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to clear cache');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your transactions, budgets and data will be gone forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything', style: 'destructive',
                  onPress: async () => {
                    try {
                      await api.delete('/auth/account');
                      await logout();
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => await logout() },
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleProfileImagePress} activeOpacity={0.7}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={48} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setNewName(user?.name || ''); setShowEditModal(true); }}>
            <Ionicons name="person-outline" size={24} color="#8AAEE0" />
            <Text style={styles.menuText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color="#628ECB" />
          </TouchableOpacity>
        </View>

        {/* General */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowStorageModal(true)}>
            <Ionicons name="server-outline" size={24} color="#8AAEE0" />
            <Text style={styles.menuText}>Data & Storage</Text>
            <Ionicons name="chevron-forward" size={20} color="#628ECB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleShareApp}>
            <Ionicons name="share-social-outline" size={24} color="#8AAEE0" />
            <Text style={styles.menuText}>Share App</Text>
            <Ionicons name="chevron-forward" size={20} color="#628ECB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowAboutModal(true)}>
            <Ionicons name="information-circle-outline" size={24} color="#8AAEE0" />
            <Text style={styles.menuText}>About</Text>
            <Ionicons name="chevron-forward" size={20} color="#628ECB" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput style={styles.modalInput} value={newName} onChangeText={setNewName} placeholderTextColor="rgba(255,255,255,0.4)" color="#FFFFFF" />
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput style={styles.modalInput} placeholder="Enter current password" placeholderTextColor="rgba(255,255,255,0.4)" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry color="#FFFFFF" />
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput style={styles.modalInput} placeholder="Leave blank to keep current" placeholderTextColor="rgba(255,255,255,0.4)" value={newPassword} onChangeText={setNewPassword} secureTextEntry color="#FFFFFF" />
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput style={styles.modalInput} placeholder="Confirm new password" placeholderTextColor="rgba(255,255,255,0.4)" value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry color="#FFFFFF" />
            <TouchableOpacity style={[styles.saveButton, editLoading && { opacity: 0.6 }]} onPress={handleSaveProfile} disabled={editLoading}>
              {editLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Data & Storage Modal */}
      <Modal visible={showStorageModal} transparent animationType="slide" onRequestClose={() => setShowStorageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Data & Storage</Text>
              <TouchableOpacity onPress={() => setShowStorageModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.storageRow}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#8AAEE0" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.storageTitle}>Your Data</Text>
                <Text style={styles.storageSubtitle}>Transactions & budgets stored securely on our server</Text>
              </View>
            </View>
            <View style={styles.storageDivider} />
            <View style={styles.storageRow}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.storageTitle}>Clear App Cache</Text>
                <Text style={styles.storageSubtitle}>Removes locally stored profile photo</Text>
              </View>
              <TouchableOpacity style={styles.clearButton} onPress={handleClearCache}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.saveButton, { marginTop: 24 }]} onPress={() => setShowStorageModal(false)}>
              <Text style={styles.saveButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={showAboutModal} transparent animationType="slide" onRequestClose={() => setShowAboutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About</Text>
              <TouchableOpacity onPress={() => setShowAboutModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.aboutLogoContainer}>
              <Ionicons name="wallet" size={48} color="#628ECB" />
              <Text style={styles.aboutAppName}>ExpenseSnap</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            </View>
            <View style={styles.aboutRow}><Text style={styles.aboutLabel}>Developer</Text><Text style={styles.aboutValue}>Riti Moradiya</Text></View>
            <View style={styles.aboutDivider} />
            <View style={styles.aboutRow}><Text style={styles.aboutLabel}>Platform</Text><Text style={styles.aboutValue}>iOS / Android</Text></View>
            <View style={styles.aboutDivider} />
            <View style={styles.aboutRow}><Text style={styles.aboutLabel}>Backend</Text><Text style={styles.aboutValue}>Node.js + PostgreSQL</Text></View>
            <View style={styles.aboutDivider} />
            <View style={styles.aboutRow}><Text style={styles.aboutLabel}>Built with</Text><Text style={styles.aboutValue}>React Native + Expo</Text></View>
            <TouchableOpacity style={[styles.saveButton, { marginTop: 24 }]} onPress={() => setShowAboutModal(false)}>
              <Text style={styles.saveButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(177, 201, 239, 0.35)' },
  backButton: {
    position: 'absolute', top: 50, right: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 120 },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatarCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(138,174,224,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImage: { width: 110, height: 110, borderRadius: 55 },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#8AAEE0', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(177,201,239,0.35)',
  },
  userName: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  userEmail: { fontSize: 16, color: '#B1C9EF' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#B1C9EF', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(98,142,203,0.2)',
    padding: 16, borderRadius: 12, marginBottom: 10,
  },
  menuText: { flex: 1, fontSize: 16, color: '#FFFFFF', marginLeft: 12 },
  logoutButton: { backgroundColor: '#EF4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  deleteButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)' },
  deleteText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#2D3F55', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  inputLabel: { fontSize: 13, color: '#B1C9EF', marginBottom: 6, marginTop: 12 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  saveButton: { backgroundColor: '#628ECB', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  storageRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  storageTitle: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  storageSubtitle: { fontSize: 12, color: '#B1C9EF', marginTop: 2 },
  storageDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  clearButton: { backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  clearButtonText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  aboutLogoContainer: { alignItems: 'center', paddingVertical: 20 },
  aboutAppName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginTop: 12 },
  aboutVersion: { fontSize: 14, color: '#B1C9EF', marginTop: 4 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  aboutLabel: { fontSize: 15, color: '#B1C9EF' },
  aboutValue: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  aboutDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
});