import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import api from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API_URL = 'http://192.168.12.195:5000/api';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(false);
  const [categoryData, setCategoryData] = useState([]);
  const [spendingOverTime, setSpendingOverTime] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('2M');
  
  // Active Budget Period
  const [activeBudgetPeriod, setActiveBudgetPeriod] = useState(null);
  const [periodSpent, setPeriodSpent] = useState(0);

  const periods = ['2M', '4M', '6M', '1Y', '2Y'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch active budget period
      await fetchActiveBudgetPeriod();
      
      // Fetch spending over time
      const timeRes = await api.get('/analytics/spending-over-time');
      const timeData = (timeRes.data.data || []).map(item => ({
        amount: parseFloat(item.total_amount || 0),
        period: item.period,
      }));
      setSpendingOverTime(timeData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
          
          // Fetch transactions for this period
          const startDate = data.budgetPeriod.start_date.split('T')[0];
          const endDate = data.budgetPeriod.end_date.split('T')[0];
          
          const transactionsResponse = await api.get(
            `/transactions?start_date=${startDate}&end_date=${endDate}`
          );
          const transactions = transactionsResponse.data.data || [];
          const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
          setPeriodSpent(totalSpent);
          
          // Group by category
          const categoryMap = {};
          transactions.forEach(t => {
            const catName = t.category_name || 'Uncategorized';
            if (!categoryMap[catName]) {
              categoryMap[catName] = {
                name: catName,
                amount: 0,
                icon: t.category_icon || '📦',
                color: getCategoryColor(catName),
              };
            }
            categoryMap[catName].amount += parseFloat(t.amount || 0);
          });
          
          setCategoryData(Object.values(categoryMap));
        } else {
          setActiveBudgetPeriod(null);
          setPeriodSpent(0);
          setCategoryData([]);
        }
      }
    } catch (error) {
      console.error('Error fetching active budget period:', error);
      setActiveBudgetPeriod(null);
      setPeriodSpent(0);
      setCategoryData([]);
    }
  };

  const getCategoryColor = (categoryName) => {
    const colors = {
      'Food & Dining': '#EF4444',
      'Transportation': '#3B82F6',
      'Shopping': '#8B5CF6',
      'Entertainment': '#EC4899',
      'Groceries': '#10B981',
      'Utilities': '#F59E0B',
      'Healthcare': '#06B6D4',
      'Other': '#6B7280',
    };
    return colors[categoryName] || '#628ECB';
  };

  const formatPeriodDates = () => {
    if (!activeBudgetPeriod) return 'No Active Budget';
    
    const startDate = new Date(activeBudgetPeriod.start_date);
    const endDate = new Date(activeBudgetPeriod.end_date);
    
    const startDay = startDate.getDate();
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endDay = endDate.getDate();
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const endYear = endDate.getFullYear();
    
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`;
  };

  const getMonthName = (period) => {
    if (!period) return '';
    const monthNum = parseInt(period.substring(5, 7)) - 1;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthNum] || '';
  };

  const getBudgetAmount = () => {
    if (!activeBudgetPeriod) return 0;
    return parseFloat(activeBudgetPeriod.amount);
  };

  const getBudgetRemaining = () => {
    return getBudgetAmount() - periodSpent;
  };

  const getBudgetPercentage = () => {
    const budget = getBudgetAmount();
    if (budget === 0) return 0;
    return (periodSpent / budget) * 100;
  };

  // Big Budget Ring
  const BigBudgetRing = ({ percentage, size = 200, strokeWidth = 20 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = ((100 - percentage) / 100) * circumference;

    return (
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            stroke="rgba(255, 255, 255, 0.3)"
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <Circle
            stroke={percentage > 90 ? '#EF4444' : percentage > 70 ? '#F59E0B' : '#628ECB'}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={progress}
            strokeLinecap="round"
          />
        </G>
      </Svg>
    );
  };

  // Mini Category Ring
  const MiniCategoryRing = ({ percentage, color, size = 80, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = ((100 - percentage) / 100) * circumference;

    return (
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            stroke="rgba(255, 255, 255, 0.3)"
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <Circle
            stroke={color}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={progress}
            strokeLinecap="round"
          />
        </G>
      </Svg>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchDashboardData} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>

        {/* SECTION 1: Active Budget Period Ring */}
        <View style={styles.glassCard}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>Active Budget</Text>
          </View>
          
          <Text style={styles.periodDatesText}>{formatPeriodDates()}</Text>

          <View style={styles.ringContainer}>
            <BigBudgetRing percentage={getBudgetPercentage()} />
            <View style={styles.ringCenter}>
              <Text style={styles.ringLabel}>Remaining</Text>
              <Text style={styles.ringAmount}>
                ${Math.abs(getBudgetRemaining()).toFixed(0)}
              </Text>
              <Text style={styles.ringSubtext}>of ${getBudgetAmount().toFixed(0)}</Text>
            </View>
          </View>
          
          <View style={styles.budgetInfo}>
            <View style={styles.budgetInfoItem}>
              <View style={styles.budgetDot} />
              <Text style={styles.budgetInfoLabel}>Spent: ${periodSpent.toFixed(2)}</Text>
            </View>
            <View style={styles.budgetInfoItem}>
              <View style={[styles.budgetDot, { backgroundColor: '#8AAEE0' }]} />
              <Text style={styles.budgetInfoLabel}>Budget: ${getBudgetAmount().toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: Category Breakdown */}
        {categoryData.length > 0 && (
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>Spending by Category</Text>
            
            <View style={styles.miniRingsGrid}>
              {categoryData.map((category, index) => {
                const budgetAmount = getBudgetAmount();
                const categoryPercent = budgetAmount > 0 
                  ? (category.amount / budgetAmount) * 100 
                  : 0;
                
                return (
                  <View key={index} style={styles.miniRingItem}>
                    <View style={styles.miniRingWrapper}>
                      <MiniCategoryRing 
                        percentage={categoryPercent} 
                        color={category.color}
                      />
                      <View style={styles.miniRingCenter}>
                        <Text style={styles.miniRingPercentage}>
                          {categoryPercent.toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.miniRingLabel} numberOfLines={1}>
                      {category.name}
                    </Text>
                    <Text style={styles.miniRingAmount}>
                      ${category.amount.toFixed(0)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* SECTION 3: Balance Chart */}
        {spendingOverTime.length > 0 && (
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>Balance</Text>
            
            <View style={styles.periodSelector}>
              {periods.map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && styles.periodButtonActive
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive
                  ]}>
                    {period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.chartWrapper}>
              <View style={styles.yAxis}>
                <Text style={styles.yAxisLabel}>5K</Text>
                <Text style={styles.yAxisLabel}>4K</Text>
                <Text style={styles.yAxisLabel}>2K</Text>
                <Text style={styles.yAxisLabel}>0</Text>
              </View>

              <View style={styles.barChartContainer}>
                {(() => {
                  const periodMonths = selectedPeriod === '2M' ? 2 
                    : selectedPeriod === '4M' ? 4 
                    : selectedPeriod === '6M' ? 6 
                    : selectedPeriod === '1Y' ? 12 
                    : selectedPeriod === '2Y' ? 24 
                    : spendingOverTime.length;
                  
                  const displayData = spendingOverTime.slice(-periodMonths);
                  const maxValue = Math.max(...displayData.map(d => d.amount), 5000);
                  
                  return displayData.map((item, index) => {
                    const barHeight = (item.amount / maxValue) * 150;
                    
                    return (
                      <View key={index} style={styles.barWrapper}>
                        <View style={styles.barContainer}>
                          <View style={[styles.bar, { height: Math.max(barHeight, 5) }]} />
                        </View>
                        <Text style={styles.barLabel}>{getMonthName(item.period)}</Text>
                      </View>
                    );
                  });
                })()}
              </View>
            </View>

            <View style={styles.balanceTotal}>
              <Text style={styles.balanceTotalAmount}>
                ${(() => {
                  const periodMonths = selectedPeriod === '2M' ? 2 
                    : selectedPeriod === '4M' ? 4 
                    : selectedPeriod === '6M' ? 6 
                    : selectedPeriod === '1Y' ? 12 
                    : selectedPeriod === '2Y' ? 24 
                    : spendingOverTime.length;
                  
                  const total = spendingOverTime
                    .slice(-periodMonths)
                    .reduce((sum, item) => sum + item.amount, 0);
                  
                  return total.toFixed(2);
                })()}
              </Text>
              <Text style={styles.balanceTotalLabel}>
                Last {selectedPeriod === '2M' ? '2 months' 
                  : selectedPeriod === '4M' ? '4 months' 
                  : selectedPeriod === '6M' ? '6 months' 
                  : selectedPeriod === '1Y' ? '12 months' 
                  : selectedPeriod === '2Y' ? '24 months' 
                  : 'all time'}
              </Text>
            </View>
          </View>
        )}

        {/* Empty State */}
        {!activeBudgetPeriod && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyText}>No active budget period</Text>
            <Text style={styles.emptySubtext}>
              Set a budget period in the Budget tab to see analytics
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(177, 201, 239, 0.35)',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Glass Card
  glassCard: {
    backgroundColor: 'rgba(138, 174, 224, 0.35)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.35)',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  periodDatesText: {
    fontSize: 13,
    color: '#E8F0FF',
    marginBottom: 20,
    fontWeight: '500',
  },
  
  // Budget Ring
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    marginVertical: 16,
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringLabel: {
    fontSize: 13,
    color: '#E8F0FF',
    marginBottom: 4,
  },
  ringAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ringSubtext: {
    fontSize: 13,
    color: '#E8F0FF',
    marginTop: 4,
  },
  budgetInfo: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 16,
    justifyContent: 'center',
  },
  budgetInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  budgetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#628ECB',
  },
  budgetInfoLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  periodButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  periodButtonActive: {
    backgroundColor: '#628ECB',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8F0FF',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  
  // Bar Chart
  chartWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  yAxis: {
    justifyContent: 'space-between',
    height: 180,
    marginRight: 10,
    paddingTop: 4,
  },
  yAxisLabel: {
    fontSize: 11,
    color: '#E8F0FF',
    fontWeight: '600',
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 180,
    flex: 1,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    width: 36,
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 36,
    backgroundColor: '#628ECB',
    borderRadius: 18,
  },
  barLabel: {
    fontSize: 11,
    color: '#E8F0FF',
    marginTop: 6,
    fontWeight: '600',
  },
  balanceTotal: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  balanceTotalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  balanceTotalLabel: {
    fontSize: 12,
    color: '#E8F0FF',
    fontWeight: '600',
  },

  // Category Mini Rings
  miniRingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-around',
  },
  miniRingItem: {
    alignItems: 'center',
    width: (width - 88) / 3,
  },
  miniRingWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  miniRingCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniRingPercentage: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  miniRingLabel: {
    fontSize: 11,
    color: '#E8F0FF',
    textAlign: 'center',
    marginBottom: 3,
    fontWeight: '600',
  },
  miniRingAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#E8F0FF',
    textAlign: 'center',
  },
});