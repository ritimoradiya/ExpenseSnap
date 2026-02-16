import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../src/services/api';

export default function CameraScanScreen() {
  const router = useRouter();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reset image when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Cleanup when leaving screen
        setImage(null);
        setLoading(false);
      };
    }, [])
  );

  const takePhoto = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to scan receipts');
      return;
    }

    // Launch camera - NO EDITING, FULL QUALITY
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,  // CHANGED: No cropping - capture full receipt
      quality: 1.0,          // CHANGED: Maximum quality for better OCR
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
      await processReceipt(result.assets[0]);
    }
  };

  const pickFromGallery = async () => {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery permission is required to upload receipts');
      return;
    }

    // Launch gallery - NO EDITING, FULL QUALITY
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,  // CHANGED: No cropping
      quality: 1.0,          // CHANGED: Maximum quality
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
      await processReceipt(result.assets[0]);
    }
  };

  const processReceipt = async (imageData) => {
    setLoading(true);
    try {
      // Create FormData for image upload
      const formData = new FormData();
      formData.append('image', {
        uri: imageData.uri,
        type: 'image/jpeg',
        name: 'receipt.jpg',
      });

      // Send to OCR backend
      const response = await api.post('/receipts/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Clear image before navigating
      setImage(null);

      // Navigate to add-expense with extracted data
      router.push({
        pathname: '/add-expense',
        params: {
          merchant: response.data.merchant_name || '',
          amount: response.data.total || '',
          date: response.data.date || new Date().toISOString(),
          category: response.data.category || '',
          currency: response.data.currency || 'USD',
          fromScan: 'true',
        },
      });

    } catch (error) {
      console.error('OCR Error:', error);
      Alert.alert('Scan Failed', 'Could not process receipt. Please try again or enter manually.');
      setImage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#395886" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan Receipt</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#395886" />
            <Text style={styles.loadingText}>Processing receipt...</Text>
            <Text style={styles.loadingSubtext}>This may take a few seconds...</Text>
          </View>
        ) : image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image.uri }} style={styles.previewImage} />
            <Text style={styles.successText}>Receipt captured!</Text>
          </View>
        ) : (
          <View style={styles.instructionsContainer}>
            <Ionicons name="camera-outline" size={80} color="#628ECB" />
            <Text style={styles.instructionsTitle}>Ready to Scan</Text>
            <Text style={styles.instructionsText}>
              For best results:{'\n'}
              • Lay receipt flat on a surface{'\n'}
              • Ensure good lighting{'\n'}
              • Capture entire receipt in frame{'\n'}
              • Avoid shadows and glare
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {!loading && !image && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <Ionicons name="camera" size={28} color="#FFF" />
            <Text style={styles.actionButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={pickFromGallery}>
            <Ionicons name="images" size={28} color="#FFF" />
            <Text style={styles.actionButtonText}>Upload from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D5DEEF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#395886',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instructionsContainer: {
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#395886',
    marginTop: 24,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 15,
    color: '#628ECB',
    textAlign: 'left',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#395886',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#628ECB',
    marginTop: 8,
  },
  imageContainer: {
    alignItems: 'center',
  },
  previewImage: {
    width: 300,
    height: 400,
    borderRadius: 16,
    marginBottom: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#395886',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#395886',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});