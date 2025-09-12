import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { RootStackParamList, CreatePostData } from '@/types';
import ApiService from '@/services/api';
import { commonStyles, colors, spacing, fontSize, borderRadius } from '@/styles/common';

type CreatePostScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreatePost'>;

interface Props {
  navigation: CreatePostScreenNavigationProp;
}

const CreatePostScreen: React.FC<Props> = ({ navigation }) => {
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [location, setLocation] = useState<{
    name: string;
    coordinates: { latitude: number; longitude: number };
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImagePicker = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      allowsEditing: true,
      selectionLimit: 5 - selectedImages.length, // Limit total to 5 images
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets) {
        const newImages = response.assets
          .map(asset => asset.uri)
          .filter((uri): uri is string => uri !== undefined);
        
        setSelectedImages(prev => [...prev, ...newImages]);
      }
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddLocation = () => {
    // For demo purposes, we'll add a static location
    // In a real app, you'd use location services
    Alert.prompt(
      'Add Location',
      'Enter location name:',
      (locationName) => {
        if (locationName) {
          setLocation({
            name: locationName,
            coordinates: {
              latitude: 10.8505, // Kerala coordinates
              longitude: 76.2711,
            },
          });
        }
      }
    );
  };

  const removeLocation = () => {
    setLocation(null);
  };

  const handleCreatePost = async () => {
    if (!content.trim() && selectedImages.length === 0) {
      Alert.alert('Error', 'Please add some content or images to your post.');
      return;
    }

    setLoading(true);
    try {
      // Upload images first if any
      let uploadedImageUrls: string[] = [];
      if (selectedImages.length > 0) {
        uploadedImageUrls = await Promise.all(
          selectedImages.map(imageUri => ApiService.uploadImage(imageUri))
        );
      }

      const postData: CreatePostData = {
        content: content.trim(),
        images: uploadedImageUrls,
        location,
      };

      await ApiService.createPost(postData);
      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderImagePreview = (uri: string, index: number) => (
    <View key={index} style={styles.imagePreview}>
      <Image source={{ uri }} style={styles.previewImage} />
      <TouchableOpacity
        style={styles.removeImageButton}
        onPress={() => removeImage(index)}
      >
        <Icon name=\"close-circle\" size={24} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Content Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.contentInput}
              placeholder=\"What's on your mind? Share your Kerala travel experience...\"
              placeholderTextColor={colors.textSecondary}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical=\"top\"
            />
          </View>

          {/* Image Previews */}
          {selectedImages.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagePreviewContainer}
              contentContainerStyle={styles.imagePreviewContent}
            >
              {selectedImages.map((uri, index) => renderImagePreview(uri, index))}
            </ScrollView>
          )}

          {/* Location Display */}
          {location && (
            <View style={styles.locationContainer}>
              <Icon name=\"location\" size={20} color={colors.primary} />
              <Text style={styles.locationText}>{location.name}</Text>
              <TouchableOpacity onPress={removeLocation}>
                <Icon name=\"close-circle-outline\" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleImagePicker}
              disabled={selectedImages.length >= 5}
            >
              <Icon name=\"camera-outline\" size={24} color={colors.primary} />
              <Text style={styles.actionButtonText}>
                Photos ({selectedImages.length}/5)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddLocation}
            >
              <Icon name=\"location-outline\" size={24} color={colors.primary} />
              <Text style={styles.actionButtonText}>
                {location ? 'Change Location' : 'Add Location'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Create Post Button */}
          <TouchableOpacity
            style={[
              commonStyles.button,
              styles.createButton,
              loading && styles.createButtonDisabled,
            ]}
            onPress={handleCreatePost}
            disabled={loading}
          >
            <Text style={commonStyles.buttonText}>
              {loading ? 'Creating Post...' : 'Share Post'}
            </Text>
          </TouchableOpacity>

          {/* Post Guidelines */}
          <View style={styles.guidelinesContainer}>
            <Text style={styles.guidelinesTitle}>Posting Guidelines:</Text>
            <Text style={styles.guidelinesText}>
              • Share authentic travel experiences from Kerala{'\n'}
              • Be respectful to local communities and culture{'\n'}
              • Avoid spam and promotional content{'\n'}
              • Include relevant location tags to help other travelers
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    minHeight: 120,
    ...commonStyles.shadow,
  },
  contentInput: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
    textAlignVertical: 'top',
    flex: 1,
  },
  imagePreviewContainer: {
    marginBottom: spacing.lg,
  },
  imagePreviewContent: {
    paddingHorizontal: spacing.xs,
  },
  imagePreview: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  locationText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  actionsContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...commonStyles.shadow,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  createButton: {
    marginBottom: spacing.xl,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  guidelinesContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...commonStyles.shadow,
  },
  guidelinesTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  guidelinesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default CreatePostScreen;