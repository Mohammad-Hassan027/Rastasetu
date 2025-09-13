import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { User } from '@/types';
import ApiService from '@/services/api';
import { getCurrentUser, clearAuthData } from '@/utils/auth';
import { commonStyles, colors, spacing, fontSize, borderRadius } from '@/styles/common';

const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const updatedUser = await ApiService.getCurrentUser();
        setUser(updatedUser);
      }
    } catch (error: any) {
      // If API call fails, try to get user from storage
      const storageUser = await getCurrentUser();
      if (storageUser) {
        setUser(storageUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.logout();
            } catch (error) {
              // Continue with logout even if API call fails
            } finally {
              await clearAuthData();
              // Navigation will be handled by the auth state change in RootNavigator
            }
          },
        },
      ]
    );
  };

  const StatCard = ({ title, value, icon }: { title: string; value: number; icon: string }) => (
    <View style={styles.statCard}>
      <Icon name={icon} size={24} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const MenuOption = ({ 
    title, 
    icon, 
    onPress, 
    showBorder = true, 
    textColor = colors.text 
  }: { 
    title: string; 
    icon: string; 
    onPress: () => void; 
    showBorder?: boolean;
    textColor?: string;
  }) => (
    <TouchableOpacity
      style={[styles.menuOption, !showBorder && styles.menuOptionNoBorder]}
      onPress={onPress}
    >
      <Icon name={icon} size={24} color={textColor} />
      <Text style={[styles.menuOptionText, { color: textColor }]}>{title}</Text>
      <Icon name="chevron-forward-outline" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.centerContainer}>
        <Text>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={commonStyles.centerContainer}>
        <Text>Error loading profile</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.settingsButton}>
            <Icon name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <Image
            source={{
              uri: user.profilePicture || 'https://via.placeholder.com/120x120?text=User',
            }}
            style={styles.avatar}
          />
          <Text style={styles.fullName}>{user.fullName}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
          
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <StatCard title="Posts" value={0} icon="images-outline\" />
          <StatCard title="Followers" value={user.followers} icon="people-outline" />
          <StatCard title="Following" value={user.following} icon="person-add-outline" />
          <StatCard title="Points" value={user.points} icon="star-outline" />
        </View>

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <MenuOption
            title="My Posts"
            icon="images-outline"
            onPress={() => {}}
          />
          <MenuOption
            title="Saved Places"
            icon="bookmark-outline"
            onPress={() => {}}
          />
          <MenuOption
            title="Travel History"
            icon="map-outline"
            onPress={() => {}}
          />
          <MenuOption
            title="Notifications"
            icon="notifications-outline"
            onPress={() => {}}
          />
          <MenuOption
            title="Privacy Settings"
            icon="lock-closed-outline"
            onPress={() => {}}
          />
          <MenuOption
            title="Help & Support"
            icon="help-circle-outline"
            onPress={() => {}}
          />
          <MenuOption
            title="About Kerala Connect"
            icon="information-circle-outline"
            onPress={() => {}}
          />
          <MenuOption
            title="Logout"
            icon="log-out-outline"
            onPress={handleLogout}
            showBorder={false}
            textColor={colors.error}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  fullName: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  username: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  bio: {
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  editButtonText: {
    color: colors.surface,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    ...commonStyles.shadow,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  statTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  menuSection: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    ...commonStyles.shadow,
    marginBottom: spacing.xl,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuOptionNoBorder: {
    borderBottomWidth: 0,
  },
  menuOptionText: {
    flex: 1,
    fontSize: fontSize.md,
    marginLeft: spacing.md,
    fontWeight: '500',
  },
});

export default ProfileScreen;