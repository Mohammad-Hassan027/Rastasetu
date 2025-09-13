import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Coupon, User } from '@/types';
import ApiService from '@/services/api';
import { getCurrentUser } from '@/utils/auth';
import { commonStyles, colors, spacing, fontSize, borderRadius } from '@/styles/common';

const CouponsScreen: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [userCoupons, setUserCoupons] = useState<Coupon[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'redeemed'>('available');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [couponsData, userCouponsData, userData] = await Promise.all([
        ApiService.getCoupons(),
        ApiService.getUserCoupons(),
        getCurrentUser(),
      ]);
      setCoupons(couponsData);
      setUserCoupons(userCouponsData);
      setUser(userData);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load coupons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRedeemCoupon = async (coupon: Coupon) => {
    if (!user || user.points < coupon.pointsCost) {
      Alert.alert('Insufficient Points', 'You don\'t have enough points to redeem this coupon.');
      return;
    }

    Alert.alert(
      'Redeem Coupon',
      `Are you sure you want to redeem "${coupon.title}" for ${coupon.pointsCost} points?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Redeem',
          onPress: async () => {
            try {
              await ApiService.redeemCoupon(coupon.id);
              Alert.alert('Success', 'Coupon redeemed successfully!');
              loadData(); // Refresh data
            } catch (error: any) {
              Alert.alert('Error', 'Failed to redeem coupon. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderAvailableCoupon = ({ item }: { item: Coupon }) => (
    <View style={styles.couponCard}>
      <View style={styles.couponHeader}>
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{item.discount}</Text>
        </View>
        <View style={styles.pointsBadge}>
          <Icon name="star" size={14} color={colors.accent} />
          <Text style={styles.pointsText}>{item.pointsCost}</Text>
        </View>
      </View>
      
      <Text style={styles.couponTitle}>{item.title}</Text>
      <Text style={styles.couponDescription}>{item.description}</Text>
      
      <View style={styles.couponFooter}>
        <View style={styles.validityContainer}>
          <Icon name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.validityText}>Valid until {formatDate(item.validUntil)}</Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.redeemButton,
            (!user || user.points < item.pointsCost) && styles.redeemButtonDisabled,
          ]}
          onPress={() => handleRedeemCoupon(item)}
          disabled={!user || user.points < item.pointsCost}
        >
          <Text style={[
            styles.redeemButtonText,
            (!user || user.points < item.pointsCost) && styles.redeemButtonTextDisabled,
          ]}>
            {!user || user.points < item.pointsCost ? 'Insufficient Points' : 'Redeem'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRedeemedCoupon = ({ item }: { item: Coupon }) => (
    <View style={[styles.couponCard, styles.redeemedCouponCard]}>
      <View style={styles.couponHeader}>
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{item.discount}</Text>
        </View>
        <View style={styles.redeemedBadge}>
          <Text style={styles.redeemedBadgeText}>REDEEMED</Text>
        </View>
      </View>
      
      <Text style={styles.couponTitle}>{item.title}</Text>
      <Text style={styles.couponDescription}>{item.description}</Text>
      
      <View style={styles.couponFooter}>
        <View style={styles.validityContainer}>
          <Icon name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.validityText}>Valid until {formatDate(item.validUntil)}</Text>
        </View>
      </View>
    </View>
  );

  const TabButton = ({ title, isActive, onPress }: { title: string; isActive: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon
        name={activeTab === 'available' ? 'gift-outline' : 'ticket-outline'}
        size={48}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyTitle}>
        {activeTab === 'available' ? 'No Coupons Available' : 'No Redeemed Coupons'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'available'
          ? 'Check back later for new coupons!'
          : 'Start redeeming coupons to see them here.'}
      </Text>
    </View>
  );

  if (loading && coupons.length === 0 && userCoupons.length === 0) {
    return (
      <SafeAreaView style={commonStyles.centerContainer}>
        <Text>Loading coupons...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Coupons & Rewards</Text>
        {user && (
          <View style={styles.pointsContainer}>
            <Icon name="star" size={20} color={colors.accent} />
            <Text style={styles.pointsValue}>{user.points}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TabButton
          title="Available"
          isActive={activeTab === 'available'}
          onPress={() => setActiveTab('available')}
        />
        <TabButton
          title="My Coupons"
          isActive={activeTab === 'redeemed'}
          onPress={() => setActiveTab('redeemed')}
        />
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === 'available' ? coupons : userCoupons}
        renderItem={activeTab === 'available' ? renderAvailableCoupon : renderRedeemedCoupon}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.couponsList,
          (activeTab === 'available' ? coupons : userCoupons).length === 0 && styles.emptyList,
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  pointsValue: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  couponsList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
  },
  couponCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...commonStyles.shadow,
  },
  redeemedCouponCard: {
    opacity: 0.8,
    borderWidth: 1,
    borderColor: colors.success,
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  discountBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  discountText: {
    color: colors.surface,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  pointsText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.xs,
  },
  redeemedBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  redeemedBadgeText: {
    color: colors.surface,
    fontSize: fontSize.xs,
    fontWeight: 'bold',
  },
  couponTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  couponDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  couponFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  validityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  validityText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  redeemButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  redeemButtonDisabled: {
    backgroundColor: colors.border,
  },
  redeemButtonText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  redeemButtonTextDisabled: {
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default CouponsScreen;