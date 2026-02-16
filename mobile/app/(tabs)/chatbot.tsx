import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/services/api';

const API_URL = 'http://192.168.12.195:5000/api';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatbotScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeBudgetPeriod, setActiveBudgetPeriod] = useState(null);
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Reset chat when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Clear messages and start fresh
      setMessages([]);
      setInputText('');
      
      // Send welcome message
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: "Hi! I'm your expense assistant. How may I help you?",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      
      // Fetch active budget
      fetchActiveBudgetPeriod();
      
      return () => {
        // Cleanup when leaving screen
        setMessages([]);
      };
    }, [])
  );

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
        }
      }
    } catch (error) {
      console.error('Error fetching active budget period:', error);
    }
  };

  const addBotMessage = async (text: string, userQuery?: string) => {
    const botMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, botMessage]);
    
    console.log('📝 addBotMessage called:', { userQuery, hasQuery: !!userQuery });
    
    // Save to backend if this is a response to a user query
    if (userQuery) {
      console.log('💾 Attempting to save chat history...');
      try {
        const response = await api.post('/chatbot/history', {
          query_text: userQuery,
          response_text: text
        });
        console.log('✅ Chat history saved successfully:', response.data);
      } catch (error) {
        console.log('❌ Failed to save chat history:', error);
      }
    } else {
      console.log('⏭️ Skipping save (no userQuery provided)');
    }
  };

  const addUserMessage = (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const query = inputText.trim();
    addUserMessage(query);
    setInputText('');

    // Process query and respond - pass query directly
    setTimeout(async () => {
      await processQuery(query.toLowerCase(), query);
    }, 500);
  };

  const processQuery = async (query: string, originalQuery: string) => {
    try {
      // PATTERN 1: Today's spending
      if (query.includes('today') || query.includes('spent today')) {
        const today = new Date().toISOString().split('T')[0];
        const response = await api.get(`/transactions?start_date=${today}&end_date=${today}`);
        const transactions = response.data.data || [];
        const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        if (transactions.length === 0) {
          await addBotMessage("You haven't spent anything today! 🎉", originalQuery);
        } else {
          await addBotMessage(`You spent $${total.toFixed(2)} today across ${transactions.length} transaction${transactions.length > 1 ? 's' : ''}.`, originalQuery);
        }
        return;
      }

      // PATTERN 2: Yesterday's spending
      if (query.includes('yesterday')) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const response = await api.get(`/transactions?start_date=${yesterday}&end_date=${yesterday}`);
        const transactions = response.data.data || [];
        const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        if (transactions.length === 0) {
          await addBotMessage("You didn't spend anything yesterday.", originalQuery);
        } else {
          await addBotMessage(`Yesterday you spent $${total.toFixed(2)} across ${transactions.length} transaction${transactions.length > 1 ? 's' : ''}.`, originalQuery);
        }
        return;
      }

      // PATTERN 3: This week's spending
      if (query.includes('week') || query.includes('this week')) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        const response = await api.get(`/transactions?start_date=${weekAgo}&end_date=${today}`);
        const transactions = response.data.data || [];
        const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        await addBotMessage(`This week you've spent $${total.toFixed(2)} across ${transactions.length} transaction${transactions.length > 1 ? 's' : ''}.`, originalQuery);
        return;
      }

      // PATTERN 4: This month's spending
      if (query.includes('month') || query.includes('this month')) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        const response = await api.get(`/transactions?start_date=${firstDay}&end_date=${lastDay}`);
        const transactions = response.data.data || [];
        const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        await addBotMessage(`This month you've spent $${total.toFixed(2)} across ${transactions.length} transaction${transactions.length > 1 ? 's' : ''}.`, originalQuery);
        return;
      }

      // PATTERN 5: Budget status
      if (query.includes('budget') || query.includes('over budget') || query.includes('remaining')) {
        if (!activeBudgetPeriod) {
          await addBotMessage("You don't have an active budget period set. Go to the Budget tab to create one!", originalQuery);
          return;
        }

        const startDate = activeBudgetPeriod.start_date.split('T')[0];
        const endDate = activeBudgetPeriod.end_date.split('T')[0];
        
        const response = await api.get(`/transactions?start_date=${startDate}&end_date=${endDate}`);
        const transactions = response.data.data || [];
        const spent = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const budget = parseFloat(activeBudgetPeriod.amount);
        const remaining = budget - spent;

        if (remaining < 0) {
          await addBotMessage(`⚠️ You're over budget! You've spent $${spent.toFixed(2)} out of your $${budget.toFixed(2)} budget. You're $${Math.abs(remaining).toFixed(2)} over.`, originalQuery);
        } else {
          await addBotMessage(`✅ You have $${remaining.toFixed(2)} remaining out of your $${budget.toFixed(2)} budget. You've spent $${spent.toFixed(2)} so far.`, originalQuery);
        }
        return;
      }

      // PATTERN 6: Category spending (food, groceries, transportation, etc.)
      const categories = ['food', 'grocery', 'groceries', 'transportation', 'uber', 'shopping', 'entertainment', 'bills', 'utilities'];
      const matchedCategory = categories.find(cat => query.includes(cat));
      
      if (matchedCategory) {
        const response = await api.get('/transactions?limit=100');
        const transactions = response.data.data || [];
        
        const categoryTransactions = transactions.filter(t => 
          t.category_name?.toLowerCase().includes(matchedCategory)
        );
        
        const total = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        if (categoryTransactions.length === 0) {
          await addBotMessage(`You haven't spent anything on ${matchedCategory} yet.`, originalQuery);
        } else {
          await addBotMessage(`You've spent $${total.toFixed(2)} on ${matchedCategory} across ${categoryTransactions.length} transaction${categoryTransactions.length > 1 ? 's' : ''}.`, originalQuery);
        }
        return;
      }

      // PATTERN 7: Biggest/largest expense
      if (query.includes('biggest') || query.includes('largest') || query.includes('most expensive')) {
        const response = await api.get('/transactions?limit=100');
        const transactions = response.data.data || [];
        
        if (transactions.length === 0) {
          await addBotMessage("You don't have any transactions yet.", originalQuery);
          return;
        }

        const biggest = transactions.reduce((max, t) => 
          parseFloat(t.amount) > parseFloat(max.amount) ? t : max
        );
        
        const date = new Date(biggest.transaction_date).toLocaleDateString();
        await addBotMessage(`Your biggest expense was $${parseFloat(biggest.amount).toFixed(2)} at ${biggest.merchant_name} on ${date}.`, originalQuery);
        return;
      }

      // PATTERN 8: Transaction count
      if (query.includes('how many') || query.includes('number of')) {
        const response = await api.get('/transactions?limit=100');
        const transactions = response.data.data || [];
        await addBotMessage(`You have ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} recorded.`, originalQuery);
        return;
      }

      // PATTERN 9: Average daily spending
      if (query.includes('average') || query.includes('avg')) {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        const response = await api.get(`/transactions?start_date=${monthAgo}&end_date=${today}`);
        const transactions = response.data.data || [];
        const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const avgDaily = total / 30;
        
        await addBotMessage(`Your average daily spending over the last 30 days is $${avgDaily.toFixed(2)}.`, originalQuery);
        return;
      }

      // DEFAULT: Didn't understand
      await addBotMessage(
        "I didn't quite understand that. Try asking:\n\n• How much did I spend today?\n• What's my biggest expense?\n• Show me food spending\n• Am I over budget?",
        originalQuery
      );
      
    } catch (error) {
      console.error('Error processing query:', error);
      await addBotMessage("Sorry, I encountered an error processing your request. Please try again.", originalQuery);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>💬</Text>
            <Text style={styles.headerTitle}>Chat</Text>
          </View>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => router.push('/')}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Ask me about your spending</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.isUser ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text style={[
              styles.messageText,
              message.isUser ? styles.userText : styles.botText,
            ]}>
              {message.text}
            </Text>
            <Text style={[
              styles.timestamp,
              message.isUser ? styles.userTimestamp : styles.botTimestamp,
            ]}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your spending..."
            placeholderTextColor="#B1C9EF"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          {inputText.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setInputText('')}
            >
              <Ionicons name="close-circle" size={20} color="#B1C9EF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#E8F0FF',
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#628ECB',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(138, 174, 224, 0.4)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  botTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 100,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: 'rgba(138, 174, 224, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 40,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(98, 142, 203, 0.35)',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#628ECB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});