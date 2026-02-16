import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://192.168.12.195:5000/api';

interface BudgetPeriod {
  id: number;
  amount: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export default function BudgetScreen() {
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBudgetPeriods();
  }, []);

  const fetchBudgetPeriods = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/budget-periods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPeriods(data.budgetPeriods || []);
    } catch (error) {
      console.error('Error fetching budget periods:', error);
    }
  };

  const createBudgetPeriod = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (startDate >= endDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/budget-periods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Budget period created!');
        setAmount('');
        setStartDate(new Date());
        setEndDate(new Date());
        fetchBudgetPeriods();
      } else {
        Alert.alert('Error', 'Failed to create budget period');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const setActivePeriod = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/budget-periods/${id}/activate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        Alert.alert('Success', 'Budget period activated!');
        fetchBudgetPeriods();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to activate period');
    }
  };

  const deletePeriod = async (id: number) => {
    Alert.alert(
      'Delete Budget Period',
      'Are you sure you want to delete this period?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await fetch(`${API_URL}/budget-periods/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              fetchBudgetPeriods();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete period');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.title}>Budget</Text>

      {/* Create Budget Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create New Budget Period</Text>

        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter budget amount"
          placeholderTextColor="#8AAEE0"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Start Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartPicker(true)}
        >
          <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
          <Ionicons name="calendar-outline" size={20} color="#628ECB" />
        </TouchableOpacity>

        {showStartPicker && (
          <View>
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                if (Platform.OS === 'android') {
                  setShowStartPicker(false);
                }
                if (date) setStartDate(date);
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowStartPicker(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.label}>End Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndPicker(true)}
        >
          <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
          <Ionicons name="calendar-outline" size={20} color="#628ECB" />
        </TouchableOpacity>

        {showEndPicker && (
          <View>
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                if (Platform.OS === 'android') {
                  setShowEndPicker(false);
                }
                if (date) setEndDate(date);
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowEndPicker(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={createBudgetPeriod}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating...' : 'Create Budget Period'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List of Budget Periods */}
      <Text style={styles.sectionTitle}>Your Budget Periods</Text>
      {periods.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={48} color="#8AAEE0" />
          <Text style={styles.emptyText}>No budget periods yet</Text>
          <Text style={styles.emptySubtext}>Create one above to get started</Text>
        </View>
      ) : (
        periods.map((period) => (
          <View
            key={period.id}
            style={[styles.periodCard, period.is_active && styles.activePeriodCard]}
          >
            <View style={styles.periodHeader}>
              <Text style={styles.periodAmount}>${parseFloat(period.amount).toFixed(2)}</Text>
              {period.is_active && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              )}
            </View>
            <Text style={styles.periodDates}>
              {formatDate(period.start_date)} - {formatDate(period.end_date)}
            </Text>

            <View style={styles.periodActions}>
              {!period.is_active && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setActivePeriod(period.id)}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#628ECB" />
                  <Text style={styles.actionButtonText}>Set Active</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => deletePeriod(period.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(177, 201, 239, 0.35)',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    marginTop: 50,
  },
  card: {
    backgroundColor: 'rgba(57, 88, 134, 0.20)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.2)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#B1C9EF',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(98, 142, 203, 0.1)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.3)',
  },
  dateButton: {
    backgroundColor: 'rgba(98, 142, 203, 0.1)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.3)',
  },
  dateText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  doneButton: {
    backgroundColor: '#628ECB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#628ECB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#B1C9EF',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8AAEE0',
    marginTop: 5,
  },
  periodCard: {
    backgroundColor: 'rgba(57, 88, 134, 0.15)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.2)',
  },
  activePeriodCard: {
    borderColor: '#628ECB',
    borderWidth: 2,
    backgroundColor: 'rgba(98, 142, 203, 0.2)',
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  periodAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  activeBadge: {
    backgroundColor: '#628ECB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  periodDates: {
    fontSize: 14,
    color: '#B1C9EF',
    marginBottom: 15,
  },
  periodActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(98, 142, 203, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#628ECB',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  deleteButtonText: {
    color: '#FF6B6B',
  },
});