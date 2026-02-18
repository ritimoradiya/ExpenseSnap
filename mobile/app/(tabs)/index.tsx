import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../../services/socketService';
import BudgetAlertBanner from '../../components/BudgetAlertBanner';

const API_URL = 'http://192.168.12.195:5000/api';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [budgetAlert, setBudgetAlert] = useState(null);
  const [activeBudgetPeriod, setActiveBudgetPeriod] = useState(null);
  const [periodSpent, setPeriodSpent] = useState(0);
  const [quickStats, setQuickStats] = useState({ today: 0, week: 0, avgDaily: 0 });

  useEffect(() => {
    if (!user) return; // Don't fetch if not logged in
    fetchData();
    loadProfileImage();
    setupBudgetAlertListener();
    return () => {
      socketService.offBudgetAlert();
    };
  }, [user]); // Re-run when user changes

  useFocusEffect(
    React.useCallback(() => {
      if (!user) return; // Don't fetch if not logged in
      fetchData();
      loadProfileImage();
    }, [user])
  );

  const setupBudgetAlertListener = () => {
    console.log('🔔 Setting up budget alert listener...');
    socketService.onBudgetAlert((alert) => {
      console.log('📢 Budget alert received:', JSON.stringify(alert, null, 2));
      setBudgetAlert(alert);
      fetchActiveBudgetPeriod();
    });
    console.log('✅ Budget alert listener setup complete');
  };

  const fetchData = async () => {
    try {
      const transactionsResponse = await api.get('/transactions?limit=5');
      setRecentTransactions(transactionsResponse.data.data || []);
      await fetchActiveBudgetPeriod();
      await calculateQuickStats();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchActiveBudgetPeriod = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/budget-periods/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.budgetPeriod) {
          setActiveBudgetPeriod(data.budgetPeriod);
          const { start_date, end_date } = data.budgetPeriod;
          const transactionsResponse = await api.get(
            `/transactions?start_date=${start_date}&end_date=${end_date}`
          );
          const transactions = transactionsResponse.data.data || [];
          const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
          setPeriodSpent(totalSpent);
        } else {
          setActiveBudgetPeriod(null);
          setPeriodSpent(0);
        }
      }
    } catch (error) {
      console.error('Error fetching active budget period:', error);
      setActiveBudgetPeriod(null);
      setPeriodSpent(0);
    }
  };

  const calculateQuickStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [todayRes, weekRes, monthRes] = await Promise.all([
        api.get(`/transactions?start_date=${today}&end_date=${today}`),
        api.get(`/transactions?start_date=${weekAgo}&end_date=${today}`),
        api.get(`/transactions?start_date=${monthAgo}&end_date=${today}`),
      ]);

      const sum = (arr) => arr.reduce((s, t) => s + parseFloat(t.amount || 0), 0);

      setQuickStats({
        today: sum(todayRes.data.data || []),
        week: sum(weekRes.data.data || []),
        avgDaily: sum(monthRes.data.data || []) / 30,
      });
    } catch (error) {
      console.error('Error calculating quick stats:', error);
      setQuickStats({ today: 0, week: 0, avgDaily: 0 });
    }
  };

  const loadProfileImage = async () => {
    try {
      const image = await AsyncStorage.getItem('profileImage');
      if (image) setProfileImage(image);
    } catch (error) {
      console.error('Error loading profile image:', error);
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
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/transactions/${selectedTransaction.id}`);
              fetchData();
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
    await fetchData();
    await loadProfileImage();
    setRefreshing(false);
  };

  const formatPeriodDates = () => {
    if (!activeBudgetPeriod) return 'No active budget';
    const startDate = new Date(activeBudgetPeriod.start_date);
    const endDate = new Date(activeBudgetPeriod.end_date);
    const startDay = startDate.getDate();
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endDay = endDate.getDate();
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const endYear = endDate.getFullYear();
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`;
  };

  const getRemaining = () => {
    if (!activeBudgetPeriod) return 0;
    return parseFloat(activeBudgetPeriod.amount) - periodSpent;
  };

  const getBudgetAmount = () => {
    if (!activeBudgetPeriod) return 0;
    return parseFloat(activeBudgetPeriod.amount);
  };

  const getPercentSpent = () => {
    if (!activeBudgetPeriod || getBudgetAmount() === 0) return 0;
    return (periodSpent / getBudgetAmount()) * 100;
  };

  return (
    <View style={styles.container}>
      <BudgetAlertBanner alert={budgetAlert} onDismiss={() => setBudgetAlert(null)} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <Ionicons name="person-circle" size={40} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Budget Limit Card */}
        <View style={styles.budgetLimitCard}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetTitle}>Budget Limit</Text>
            <TouchableOpacity style={styles.viewReportButton} onPress={() => router.push('/budget')}>
              <Text style={styles.viewReportText}>View Details</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.budgetSubtitle}>{formatPeriodDates()}</Text>
          <View style={styles.budgetDivider} />
          <Text style={styles.remainingLabel}>Remaining</Text>
          <View style={styles.remainingAmountContainer}>
            <Text style={[styles.remainingAmount, { color: '#FFFFFF' }]}>
              {getRemaining() < 0 ? '-' : ''}${Math.abs(getRemaining()).toFixed(2)}
            </Text>
            <Text style={styles.remainingTotal}>of ${getBudgetAmount().toFixed(2)}</Text>
          </View>
          <View style={styles.bubbleContainer}>
            {[...Array(10)].map((_, index) => {
              const percentSpent = getPercentSpent();
              const bubbleThreshold = (index + 1) * 10;
              let bubbleColor = 'rgba(203, 213, 224, 0.3)';
              if (percentSpent >= 100) {
                bubbleColor = '#EF4444';
              } else if (percentSpent >= 80) {
                if (percentSpent >= bubbleThreshold) bubbleColor = '#F59E0B';
                else if (percentSpent > bubbleThreshold - 10) {
                  const p = (percentSpent - (bubbleThreshold - 10)) / 10;
                  bubbleColor = `rgba(245, 158, 11, ${0.3 + p * 0.7})`;
                }
              } else {
                if (percentSpent >= bubbleThreshold) bubbleColor = '#10B981';
                else if (percentSpent > bubbleThreshold - 10) {
                  const p = (percentSpent - (bubbleThreshold - 10)) / 10;
                  bubbleColor = `rgba(16, 185, 129, ${0.3 + p * 0.7})`;
                }
              }
              return <View key={index} style={[styles.bubble, { backgroundColor: bubbleColor }]} />;
            })}
          </View>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="today-outline" size={22} color="#FFFFFF" />
            <Text style={styles.statValue}>${quickStats.today.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={22} color="#FFFFFF" />
            <Text style={styles.statValue}>${quickStats.week.toFixed(0)}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="analytics-outline" size={22} color="#FFFFFF" />
            <Text style={styles.statValue}>${quickStats.avgDaily.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Avg Daily</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/camera-scan')}>
            <LinearGradient colors={['#628ECB', '#395886']} style={styles.actionGradient}>
              <Ionicons name="camera" size={28} color="#FFF" />
              <Text style={styles.actionText}>Scan Receipt</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/add-expense')}>
            <LinearGradient colors={['#8AAEE0', '#628ECB']} style={styles.actionGradient}>
              <Ionicons name="create-outline" size={28} color="#FFF" />
              <Text style={styles.actionText}>Manual Entry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/transactions')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={48} color="#FFFFFF" />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Start tracking by adding your first expense</Text>
            </View>
          ) : (
            recentTransactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionCard}
                onLongPress={() => handleLongPress(transaction)}
                delayLongPress={500}
              >
                <View style={styles.transactionContent}>
                  <View style={styles.transactionLeft}>
                    <View style={styles.iconCircle}>
                      <Text style={styles.categoryEmoji}>{transaction.category_icon || '📦'}</Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.merchantName}>{transaction.merchant_name || 'Unknown'}</Text>
                      <Text style={styles.transactionDate}>
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.transactionAmount}>
                    -{transaction.currency === 'USD' ? '$' : transaction.currency}
                    {parseFloat(transaction.amount).toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

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
            <TouchableOpacity style={styles.menuButton} onPress={handleEdit}>
              <Ionicons name="pencil" size={24} color="#395886" />
              <Text style={styles.menuButtonText}>Edit Transaction</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuButton} onPress={handleDelete}>
              <Ionicons name="trash" size={24} color="#EF4444" />
              <Text style={[styles.menuButtonText, { color: '#EF4444' }]}>Delete Transaction</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuButton} onPress={() => setShowActionModal(false)}>
              <Ionicons name="close-circle" size={24} color="#628ECB" />
              <Text style={styles.menuButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(177, 201, 239, 0.35)' },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  profileButton: { padding: 0 },
  profileImage: { width: 40, height: 40, borderRadius: 20 },
  greeting: { fontSize: 18, color: '#E8F0FF', fontWeight: '400' },
  userName: { fontSize: 22, color: '#FFFFFF', fontWeight: '700', marginTop: 4 },
  budgetLimitCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(138, 174, 224, 0.5)',
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.4)',
  },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  budgetTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  viewReportButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  viewReportText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  budgetSubtitle: { fontSize: 13, color: '#E8F0FF', marginBottom: 14 },
  budgetDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.3)', marginBottom: 16 },
  remainingLabel: { fontSize: 14, color: '#E8F0FF', marginBottom: 10 },
  remainingAmountContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 },
  remainingAmount: { fontSize: 30, fontWeight: '700', marginRight: 6 },
  remainingTotal: { fontSize: 16, color: '#E8F0FF' },
  bubbleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bubble: { width: 16, height: 16, borderRadius: 9, marginHorizontal: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(138, 174, 224, 0.35)',
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.35)',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginVertical: 8 },
  statLabel: { fontSize: 11, color: '#E8F0FF', textAlign: 'center' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  actionButton: { flex: 1, marginHorizontal: 6 },
  actionGradient: { borderRadius: 16, padding: 20, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 8 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  seeAll: { fontSize: 14, color: '#E8F0FF', fontWeight: '600' },
  emptyCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(138, 174, 224, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.3)',
  },
  emptyText: { fontSize: 18, color: '#FFFFFF', fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#E8F0FF', marginTop: 8, textAlign: 'center' },
  transactionCard: {
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(138, 174, 224, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.35)',
  },
  transactionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryEmoji: { fontSize: 24 },
  transactionInfo: { flex: 1 },
  merchantName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  transactionDate: { fontSize: 12, color: '#E8F0FF' },
  transactionAmount: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' },
  actionMenu: { backgroundColor: '#FFF', borderRadius: 16, width: '80%', overflow: 'hidden' },
  menuButton: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12 },
  menuButtonText: { fontSize: 16, fontWeight: '600', color: '#395886' },
  divider: { height: 1, backgroundColor: 'rgba(138, 174, 224, 0.2)' },
});