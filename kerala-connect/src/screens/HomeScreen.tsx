import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { Post, RootStackParamList } from '@/types';
import ApiService from '@/services/api';
import { commonStyles, colors, spacing, fontSize, borderRadius } from '@/styles/common';
import PostCard from '@/components/PostCard';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      }

      const newPosts = await ApiService.getFeed(pageNum);
      
      if (refresh || pageNum === 1) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      setHasMore(newPosts.length === 10); // Assuming 10 posts per page
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to load feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadFeed(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadFeed(nextPage);
    }
  };

  const handleLikePost = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await ApiService.unlikePost(postId);
      } else {
        await ApiService.likePost(postId);
      }

      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                isLiked: !isLiked,
                likes: isLiked ? post.likes - 1 : post.likes + 1,
              }
            : post
        )
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onLike={(isLiked) => handleLikePost(item.id, isLiked)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="images-outline" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Posts Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start following users or create your first post!
      </Text>
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={commonStyles.centerContainer}>
        <Text>Loading feed...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kerala Connect</Text>
        <Text style={styles.headerSubtitle}>Travel Feed</Text>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={posts.length === 0 ? styles.emptyList : undefined}
      />
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <Icon name="add" size={28} color={colors.surface} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyList: {
    flexGrow: 1,
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
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...commonStyles.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default HomeScreen;