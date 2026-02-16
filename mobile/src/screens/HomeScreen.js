import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [totalSpending, setTotalSpending] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch this month's spending
      const statsResponse = await api.get('/transactions/stats');
      setTotalSpending(statsResponse.data.total || 0);

      // Fetch recent 5 transactions
      const transactionsResponse = await api.get('/transactions?limit=5');
      setRecentTransactions(transactionsResponse.data.transactions || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#395886', '#2A4065', '#1E2F4D']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header with User Name */}
          <View style={styles.header}>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>

          {/* Total Spending Card with Glassmorphism */}
          <BlurView intensity={80} tint="light" style={styles.spendingCard}>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Total Spending This Month</Text>
              <Text style={styles.spendingAmount}>
                ${totalSpending.toFixed(2)}
              </Text>
              <Text style={styles.cardSubtext}>
                {recentTransactions.length} transactions
              </Text>
            </View>
          </BlurView>

          {/* Quick Action Buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AddExpense')}
            >
              <LinearGradient
                colors={['#628ECB', '#395886']}
                style={styles.actionGradient}
              >
                <Ionicons name="camera" size={28} color="#FFF" />
                <Text style={styles.actionText}>Scan Receipt</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AddExpense')}
            >
              <LinearGradient
                colors={['#8AAEE0', '#628ECB']}
                style={styles.actionGradient}
              >
                <Ionicons name="create-outline" size={28} color="#FFF" />
                <Text style={styles.actionText}>Manual Entry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {recentTransactions.length === 0 ? (
              <BlurView intensity={60} tint="light" style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={48} color="#8AAEE0" />
                <Text style={styles.emptyText}>No transactions yet</Text>
                <Text style={styles.emptySubtext}>
                  Start tracking by adding your first expense
                </Text>
              </BlurView>
            ) : (
              recentTransactions.map((transaction) => (
                <BlurView
                  key={transaction.id}
                  intensity={60}
                  tint="light"
                  style={styles.transactionCard}
                >
                  <View style={styles.transactionContent}>
                    <View style={styles.transactionLeft}>
                      <View style={styles.iconCircle}>
                        <Ionicons
                          name="fast-food"
                          size={24}
                          color="#395886"
                        />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.merchantName}>
                          {transaction.merchant_name || 'Unknown'}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.transactionAmount}>
                      -${parseFloat(transaction.amount).toFixed(2)}
                    </Text>
                  </View>
                </BlurView>
              ))
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E2F4D',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 20,
    color: '#B1C9EF',
    fontWeight: '400',
  },
  userName: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 4,
  },
  spendingCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardContent: {
    padding: 24,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 14,
    color: '#395886',
    fontWeight: '600',
    marginBottom: 8,
  },
  spendingAmount: {
    fontSize: 48,
    color: '#395886',
    fontWeight: '700',
    marginBottom: 8,
  },
  cardSubtext: {
    fontSize: 14,
    color: '#628ECB',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
  },
  actionGradient: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  seeAll: {
    fontSize: 14,
    color: '#8AAEE0',
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  emptyText: {
    fontSize: 18,
    color: '#395886',
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#628ECB',
    marginTop: 8,
    textAlign: 'center',
  },
  transactionCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    backgroundColor: 'rgba(138, 174, 224, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#395886',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#628ECB',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#395886',
  },
});