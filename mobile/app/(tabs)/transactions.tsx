import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../src/services/api';

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const availableYears = [2024, 2025, 2026, 2027, 2028]; // Adjust as needed

  useEffect(() => {
    fetchTransactions();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchTransactions();
    }, [])
  );

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions?limit=100');
      const data = response.data.data || [];
      setTransactions(data);
      groupTransactionsByDate(data, currentMonth, currentYear);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const groupTransactionsByDate = (data: any[], month: Date, year: number) => {
    const grouped: any = {};
    
    // Filter transactions for selected month AND year
    const monthFiltered = data.filter((transaction) => {
      const txDate = new Date(transaction.transaction_date);
      return txDate.getMonth() === month.getMonth() && 
             txDate.getFullYear() === year;
    });
    
    monthFiltered.forEach((transaction) => {
      const date = new Date(transaction.transaction_date);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          transactions: [],
          total: 0,
          displayDate: formatDateHeader(date),
        };
      }
      
      grouped[dateKey].transactions.push(transaction);
      grouped[dateKey].total += parseFloat(transaction.amount);
    });
    
    setGroupedTransactions(grouped);
  };

  const formatDateHeader = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateStr = date.toDateString();
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateDisplay = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
    
    if (dateStr === todayStr) {
      return `Today, ${dayName}`;
    } else if (dateStr === yesterdayStr) {
      return `Yesterday, ${dayName}`;
    } else {
      return `${dayName}, ${dateDisplay}`;
    }
  };

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
    groupTransactionsByDate(transactions, newMonth, currentYear);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
    groupTransactionsByDate(transactions, newMonth, currentYear);
  };

  const handleYearChange = (year: number) => {
    setCurrentYear(year);
    setShowYearModal(false);
    groupTransactionsByDate(transactions, currentMonth, year);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      groupTransactionsByDate(transactions, currentMonth, currentYear);
    } else {
      const filtered = transactions.filter((t: any) =>
        t.merchant_name.toLowerCase().includes(query.toLowerCase())
      );
      groupTransactionsByDate(filtered, currentMonth, currentYear);
    }
  };

  const handleLongPress = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowActionModal(true);
  };

  const handleEdit = () => {
    setShowActionModal(false);
    router.push({
      pathname: '/add-expense',
      params: {
        transactionId: selectedTransaction.id,
        merchant: selectedTransaction.merchant_name,
        amount: selectedTransaction.amount,
        date: selectedTransaction.transaction_date,
        category: selectedTransaction.category_name,
        description: selectedTransaction.description || '',
        fromEdit: 'true',
      },
    });
  };

  const handleDelete = () => {
    setShowActionModal(false);
    Alert.alert(
      'Delete Transaction',
      `Delete ${selectedTransaction.merchant_name} for $${parseFloat(selectedTransaction.amount).toFixed(2)}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/transactions/${selectedTransaction.id}`);
              fetchTransactions();
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Transactions</Text>
      </View>

      {/* Month Selector with Pills + Year Dropdown */}
      <View style={styles.selectorRow}>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.monthPills}>
            {[-1, 0, 1].map((offset) => {
              const month = new Date(currentMonth);
              month.setMonth(month.getMonth() + offset);
              const monthName = month.toLocaleDateString('en-US', { month: 'short' });
              const isSelected = offset === 0;
              
              return (
                <TouchableOpacity
                  key={offset}
                  style={[styles.monthPill, isSelected && styles.monthPillSelected]}
                  onPress={() => {
                    if (offset !== 0) {
                      const newMonth = new Date(currentMonth);
                      newMonth.setMonth(newMonth.getMonth() + offset);
                      setCurrentMonth(newMonth);
                      groupTransactionsByDate(transactions, newMonth, currentYear);
                    }
                  }}
                >
                  <Text style={[styles.monthPillText, isSelected && styles.monthPillTextSelected]}>
                    {monthName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Year Dropdown */}
        <TouchableOpacity 
          style={styles.yearButton}
          onPress={() => setShowYearModal(true)}
        >
          <Text style={styles.yearButtonText}>{currentYear}</Text>
          <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#FFFFFF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor="#B1C9EF"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Grouped Transactions List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {sortedDates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No transactions found' : `No transactions in ${currentMonth.toLocaleDateString('en-US', { month: 'long' })} ${currentYear}`}
            </Text>
          </View>
        ) : (
          sortedDates.map((dateKey) => {
            const group = groupedTransactions[dateKey];
            return (
              <View key={dateKey} style={styles.dateGroup}>
                {/* Date Header with Day Name and Daily Total */}
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderText}>{group.displayDate}</Text>
                  <Text style={styles.dailyTotal}>-${group.total.toFixed(2)}</Text>
                </View>

                {/* Transactions for this date */}
                {group.transactions.map((transaction: any) => (
                  <TouchableOpacity
                    key={transaction.id}
                    style={styles.transactionCard}
                    onLongPress={() => handleLongPress(transaction)}
                    delayLongPress={500}
                  >
                    <View style={styles.transactionContent}>
                      <View style={styles.transactionLeft}>
                        <View style={styles.iconCircle}>
                          <Text style={styles.categoryEmoji}>
                            {transaction.category_icon || '📦'}
                          </Text>
                        </View>
                        <View style={styles.transactionInfo}>
                          <Text style={styles.merchantName}>
                            {transaction.merchant_name}
                          </Text>
                          <Text style={styles.categoryName}>
                            {transaction.category_name || 'Uncategorized'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.transactionAmount}>
                        -{transaction.currency === 'USD' ? '$' : transaction.currency}
                        {parseFloat(transaction.amount).toFixed(2)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Year Selection Modal */}
      <Modal
        visible={showYearModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowYearModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowYearModal(false)}
        >
          <View style={styles.yearModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Year</Text>
              <TouchableOpacity onPress={() => setShowYearModal(false)}>
                <Ionicons name="close" size={24} color="#395886" />
              </TouchableOpacity>
            </View>
            {availableYears.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearOption,
                  year === currentYear && styles.yearOptionSelected
                ]}
                onPress={() => handleYearChange(year)}
              >
                <Text style={[
                  styles.yearOptionText,
                  year === currentYear && styles.yearOptionTextSelected
                ]}>
                  {year}
                </Text>
                {year === currentYear && (
                  <Ionicons name="checkmark" size={20} color="#628ECB" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <View style={styles.actionMenu}>
            <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
              <Ionicons name="pencil" size={24} color="#395886" />
              <Text style={styles.actionButtonText}>Edit Transaction</Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Ionicons name="trash" size={24} color="#EF4444" />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete Transaction</Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => setShowActionModal(false)}
            >
              <Ionicons name="close-circle" size={24} color="#628ECB" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(177, 201, 239, 0.35)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Selector Row (Month + Year)
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 15,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  monthArrow: {
    padding: 4,
  },
  monthPills: {
    flexDirection: 'row',
    gap: 8,
  },
  monthPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(138, 174, 224, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.3)',
  },
  monthPillSelected: {
    backgroundColor: '#628ECB',
    borderColor: '#628ECB',
  },
  monthPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E8F0FF',
  },
  monthPillTextSelected: {
    color: '#FFFFFF',
  },
  yearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(138, 174, 224, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.3)',
    marginLeft: 8,
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(138, 174, 224, 0.3)',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.3)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 150,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
  },
  // Date Grouping
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dailyTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8F0FF',
  },
  transactionCard: {
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(138, 174, 224, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.35)',
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  transactionInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 12,
    color: '#E8F0FF',
    marginBottom: 2,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Year Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  yearModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#395886',
  },
  yearOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  yearOptionSelected: {
    backgroundColor: '#F5F9FC',
  },
  yearOptionText: {
    fontSize: 16,
    color: '#395886',
    fontWeight: '500',
  },
  yearOptionTextSelected: {
    fontWeight: '700',
    color: '#628ECB',
  },
  // Action Modal
  actionMenu: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 40,
    marginBottom: 100,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#395886',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(138, 174, 224, 0.2)',
  },
});