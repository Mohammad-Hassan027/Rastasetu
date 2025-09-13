import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Post } from '@/types';
import { colors, spacing, fontSize, borderRadius } from '@/styles/common';

const { width } = Dimensions.get('window');

interface Props {
  post: Post;
  onLike: (isLiked: boolean) => void;
}

const PostCard: React.FC<Props> = ({ post, onLike }) => {
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  return (
    <View style={styles.container}>
      {/* User Header */}
      <View style={styles.header}>
        <Image
          source={{
            uri: post.user.profilePicture || 'https://via.placeholder.com/40x40?text=U',
          }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{post.user.username}</Text>
          <Text style={styles.fullName}>{post.user.fullName}</Text>
        </View>
        <Text style={styles.timestamp}>{formatTimeAgo(post.createdAt)}</Text>
      </View>

      {/* Post Content */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Post Images */}
      {post.images && post.images.length > 0 && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: post.images[0] }}
            style={styles.postImage}
            resizeMode="cover"
          />
          {post.images.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCountText}>
                +{post.images.length - 1}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Location */}
      {post.location && (
        <View style={styles.locationContainer}>
          <Icon name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.locationText}>{post.location.name}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onLike(post.isLiked)}
        >
          <Icon
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={post.isLiked ? colors.error : colors.textSecondary}
          />
          <Text style={styles.actionText}>{post.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="chatbubble-outline" size={24} color={colors.textSecondary} />
          <Text style={styles.actionText}>{post.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="share-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  username: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  fullName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timestamp: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  content: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  postImage: {
    width: width - spacing.md * 4,
    height: 200,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  imageCounter: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  imageCountText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
});

export default PostCard;