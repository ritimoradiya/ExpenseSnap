import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BudgetAlert {
  type: string;
  level: string;
  emoji: string;
  message: string;
  color: string;
  percentage: number;
  spent: number;
  budget: number | string;  // Can be number or string
  remaining: number;
  periodName: string;
  timestamp: string;
}

interface BudgetAlertBannerProps {
  alert: BudgetAlert | null;
  onDismiss: () => void;
}

const BudgetAlertBanner: React.FC<BudgetAlertBannerProps> = ({ alert, onDismiss }) => {
  const [slideAnim] = useState(new Animated.Value(-100));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (alert) {
      setIsVisible(true);
      // Slide down animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleDismiss = () => {
    // Slide up animation
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onDismiss();
    });
  };

  if (!alert || !isVisible) return null;

  // Determine background color based on alert level
  const backgroundColor = 
    alert.level === 'over_budget' ? 'rgba(239, 68, 68, 0.95)' :  // Red
    alert.level === 'critical' ? 'rgba(249, 115, 22, 0.95)' :     // Orange
    'rgba(245, 158, 11, 0.95)';                                   // Amber/Yellow

  // Parse values to ensure they're numbers
  const spentAmount = typeof alert.spent === 'number' ? alert.spent : parseFloat(alert.spent || '0');
  const budgetAmount = typeof alert.budget === 'number' ? alert.budget : parseFloat(alert.budget || '0');
  const percentageAmount = typeof alert.percentage === 'number' ? alert.percentage : parseFloat(alert.percentage || '0');

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          transform: [{ translateY: slideAnim }],
          backgroundColor 
        }
      ]}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.emoji}>{alert.emoji}</Text>
        </View>

        {/* Message */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Budget Alert</Text>
          <Text style={styles.message}>{alert.message}</Text>
          
          <View style={styles.detailsRow}>
            <Text style={styles.details}>
              ${spentAmount.toFixed(2)} of ${budgetAmount.toFixed(2)} ({percentageAmount.toFixed(0)}%)
            </Text>
          </View>
        </View>

        {/* Close button */}
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  emoji: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    lineHeight: 20,
  },
  detailsRow: {
    marginTop: 6,
  },
  details: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default BudgetAlertBanner;