import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';

// Currency options
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [currency, setCurrency] = useState('USD');
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Pre-fill form from OCR data OR edit mode
  useEffect(() => {
    // EDIT MODE - Pre-fill from existing transaction
    if (params.fromEdit === 'true') {
      if (params.merchant) {
        setMerchant(params.merchant as string);
      }
      if (params.amount) {
        setAmount(params.amount as string);
      }
      if (params.description) {
        setDescription(params.description as string);
      }
      if (params.date) {
        try {
          const dateStr = params.date as string;
          const parsedDate = dateStr.includes('T') 
            ? new Date(dateStr) 
            : new Date(dateStr + 'T12:00:00');
          
          if (!isNaN(parsedDate.getTime())) {
            setTransactionDate(parsedDate);
          }
        } catch (e) {
          console.log('Could not parse date:', e);
        }
      }
      // Set category if provided
      if (params.category && categories.length > 0) {
        const matchedCategory = categories.find((cat: any) => 
          cat.name.toLowerCase() === (params.category as string).toLowerCase()
        );
        if (matchedCategory) {
          setCategoryId(matchedCategory.id.toString());
          setSelectedCategory(matchedCategory);
        }
      }
    }
    // SCAN MODE - Pre-fill from OCR
    else if (params.fromScan === 'true') {
      if (params.merchant) {
        setMerchant(params.merchant as string);
      }
      if (params.amount) {
        setAmount(params.amount as string);
      }
      if (params.date) {
        try {
          const dateStr = params.date as string;
          const parsedDate = dateStr.includes('T') 
            ? new Date(dateStr) 
            : new Date(dateStr + 'T12:00:00');
          
          if (!isNaN(parsedDate.getTime())) {
            setTransactionDate(parsedDate);
          }
        } catch (e) {
          console.log('Could not parse date');
        }
      }
      // Set currency if detected
      if (params.currency) {
        const detectedCurr = CURRENCIES.find(c => c.code === params.currency);
        if (detectedCurr) {
          setCurrency(detectedCurr.code);
          setSelectedCurrency(detectedCurr);
        }
      }
      // Set category if provided
      if (params.category && categories.length > 0) {
        const matchedCategory = categories.find((cat: any) => 
          cat.name.toLowerCase() === (params.category as string).toLowerCase()
        );
        if (matchedCategory) {
          setCategoryId(matchedCategory.id.toString());
          setSelectedCategory(matchedCategory);
        }
      }
    }
  }, [params.fromEdit, params.fromScan, params.merchant, params.amount, params.date, params.category, params.currency, params.description, categories]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      
      if (response.data && response.data.data) {
        setCategories(response.data.data);
        if (response.data.data.length > 0 && !categoryId) {
          setCategoryId(response.data.data[0].id.toString());
          setSelectedCategory(response.data.data[0]);
        }
      } else {
        setCategories([]);
        Alert.alert('Error', 'No categories found. Please try again.');
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      setCategories([]);
      Alert.alert('Error', 'Failed to load categories. Please check your connection.');
    }
  };

  const handleCategorySelect = (category: any) => {
    setCategoryId(category.id.toString());
    setSelectedCategory(category);
    setShowCategoryModal(false);
  };

  const handleCurrencySelect = (curr: any) => {
    setCurrency(curr.code);
    setSelectedCurrency(curr);
    setShowCurrencyModal(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTransactionDate(selectedDate);
    }
  };

  const handleBack = () => {
    if (params.fromScan === 'true') {
      router.push('/camera-scan');
    } else if (params.fromEdit === 'true') {
      router.push('/transactions');
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return;
    }
    if (!merchant.trim()) {
      Alert.alert('Validation Error', 'Please enter merchant name');
      return;
    }
    if (!categoryId) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }

    setLoading(true);

    try {
      const transactionData = {
        amount: parseFloat(amount),
        merchant_name: merchant.trim(),
        description: description.trim(),
        category_id: parseInt(categoryId),
        transaction_date: transactionDate.toISOString().split('T')[0],
        currency: currency
      };

      // EDIT MODE - Update existing transaction
      if (params.fromEdit === 'true' && params.transactionId) {
        await api.put(`/transactions/${params.transactionId}`, transactionData);
        Alert.alert('Success', 'Transaction updated successfully!', [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/transactions');
            }
          }
        ]);
      }
      // CREATE MODE - Add new transaction
      else {
        await api.post('/transactions', transactionData);
        Alert.alert('Success', 'Expense added successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setAmount('');
              setMerchant('');
              setDescription('');
              setTransactionDate(new Date());
              setCurrency('USD');
              setSelectedCurrency(CURRENCIES[0]);
              router.replace('/(tabs)');
            }
          }
        ]);
      }
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={28} color="#395886" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {params.fromEdit === 'true' ? 'Edit Expense' : 'Add New Expense'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Amount Input with Currency */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount *</Text>
          <View style={styles.amountRow}>
            <TouchableOpacity 
              style={styles.currencyButton}
              onPress={() => setShowCurrencyModal(true)}
            >
              <Text style={styles.currencySymbol}>{selectedCurrency.symbol}</Text>
              <Ionicons name="chevron-down" size={16} color="#628ECB" />
            </TouchableOpacity>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#8AAEE0"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {/* Currency Modal */}
        <Modal
          visible={showCurrencyModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCurrencyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Currency</Text>
                <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.categoryList}>
                {CURRENCIES.map((curr) => (
                  <TouchableOpacity
                    key={curr.code}
                    style={[
                      styles.categoryItem,
                      currency === curr.code && styles.categoryItemSelected
                    ]}
                    onPress={() => handleCurrencySelect(curr)}
                  >
                    <Text style={styles.currencySymbolLarge}>{curr.symbol}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.categoryName}>{curr.code}</Text>
                      <Text style={styles.currencyName}>{curr.name}</Text>
                    </View>
                    {currency === curr.code && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Merchant Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Merchant *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Starbucks, Target"
            placeholderTextColor="#8AAEE0"
            value={merchant}
            onChangeText={setMerchant}
          />
        </View>

        {/* Category Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.dropdownText}>
              {selectedCategory 
                ? `${selectedCategory.icon} ${selectedCategory.name}`
                : 'Select a category...'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Category Modal */}
        <Modal
          visible={showCategoryModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.categoryList}>
                {categories.map((category: any) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      categoryId === category.id.toString() && styles.categoryItemSelected
                    ]}
                    onPress={() => handleCategorySelect(category)}
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {categoryId === category.id.toString() && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Date Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {transactionDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={transactionDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add notes..."
            placeholderTextColor="#8AAEE0"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading 
              ? (params.fromEdit === 'true' ? 'Updating...' : 'Adding...') 
              : (params.fromEdit === 'true' ? 'Update Expense' : 'Add Expense')
            }
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D5DEEF'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: '#D5DEEF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#395886',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#395886',
    marginBottom: 8
  },
  amountRow: {
    flexDirection: 'row',
    gap: 10,
  },
  currencyButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(138, 174, 224, 0.5)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#395886',
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(138, 174, 224, 0.5)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#395886'
  },
  currencySymbolLarge: {
    fontSize: 28,
    marginRight: 12,
    width: 40,
    textAlign: 'center',
  },
  currencyName: {
    fontSize: 12,
    color: '#628ECB',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(138, 174, 224, 0.5)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#395886'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  dropdown: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(138, 174, 224, 0.5)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dropdownText: {
    fontSize: 16,
    color: '#395886'
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#628ECB'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#395886'
  },
  modalClose: {
    fontSize: 24,
    color: '#628ECB'
  },
  categoryList: {
    padding: 10
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  categoryItemSelected: {
    backgroundColor: 'rgba(138, 174, 224, 0.2)'
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12
  },
  categoryName: {
    fontSize: 16,
    color: '#395886',
    flex: 1
  },
  checkmark: {
    fontSize: 20,
    color: '#395886',
    fontWeight: 'bold'
  },
  dateButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(138, 174, 224, 0.5)',
    borderRadius: 12,
    padding: 14
  },
  dateText: {
    fontSize: 16,
    color: '#395886'
  },
  submitButton: {
    backgroundColor: '#395886',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20
  },
  submitButtonDisabled: {
    backgroundColor: '#8AAEE0'
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});