import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import MapView, { Marker } from 'react-native-maps';
import { Place } from '@/types';
import ApiService from '@/services/api';
import { commonStyles, colors, spacing, fontSize, borderRadius } from '@/styles/common';

const ExploreScreen: React.FC = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [trendingPlaces, setTrendingPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const categories = ['Beach', 'Mountains', 'Backwaters', 'Wildlife', 'Heritage', 'Adventure'];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery || selectedCategory) {
      searchPlaces();
    } else {
      loadData();
    }
  }, [searchQuery, selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [placesData, trendingData] = await Promise.all([
        ApiService.getPlaces(),
        ApiService.getTrendingPlaces(),
      ]);
      setPlaces(placesData);
      setTrendingPlaces(trendingData);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load places');
    } finally {
      setLoading(false);
    }
  };

  const searchPlaces = async () => {
    try {
      setLoading(true);
      const results = await ApiService.getPlaces(selectedCategory, searchQuery);
      setPlaces(results);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to search places');
    } finally {
      setLoading(false);
    }
  };

  const renderPlaceCard = ({ item }: { item: Place }) => (
    <TouchableOpacity style={styles.placeCard}>
      <Image source={{ uri: item.images[0] }} style={styles.placeImage} />
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{item.name}</Text>
        <Text style={styles.placeDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.placeDetails}>
          <View style={styles.rating}>
            <Icon name="star\" size={14} color={colors.accent} />
            <Text style={styles.ratingText}>
              {item.rating} ({item.reviews} reviews)
            </Text>
          </View>
          <Text style={styles.category}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTrendingPlace = ({ item }: { item: Place }) => (
    <TouchableOpacity style={styles.trendingCard}>
      <Image source={{ uri: item.images[0] }} style={styles.trendingImage} />
      <Text style={styles.trendingName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderCategory = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryChip,
        selectedCategory === category && styles.categoryChipSelected,
      ]}
      onPress={() =>
        setSelectedCategory(selectedCategory === category ? '' : category)
      }
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === category && styles.categoryTextSelected,
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );

  const MapViewComponent = () => (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: 10.8505,
        longitude: 76.2711,
        latitudeDelta: 3.0,
        longitudeDelta: 3.0,
      }}
    >
      {places.map((place) => (
        <Marker
          key={place.id}
          coordinate={place.coordinates}
          title={place.name}
          description={place.description}
        />
      ))}
    </MapView>
  );

  if (loading && places.length === 0) {
    return (
      <SafeAreaView style={commonStyles.centerContainer}>
        <Text>Loading places...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore Kerala</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Icon name="list-outline" size={20} color={viewMode === 'list' ? colors.surface : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
            onPress={() => setViewMode('map')}
          >
            <Icon name="map-outline" size={20} color={viewMode === 'map' ? colors.surface : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search places in Kerala..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={categories}
          renderItem={({ item }) => renderCategory(item)}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {viewMode === 'map' ? (
        <MapViewComponent />
      ) : (
        <>
          {/* Trending Places */}
          {trendingPlaces.length > 0 && !searchQuery && !selectedCategory && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trending Places</Text>
              <FlatList
                horizontal
                data={trendingPlaces}
                renderItem={renderTrendingPlace}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.trendingList}
              />
            </View>
          )}

          {/* Places List */}
          <FlatList
            data={places}
            renderItem={renderPlaceCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.placesList}
          />
        </>
      )}
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
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  categoriesContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
  },
  categoriesList: {
    paddingHorizontal: spacing.lg,
  },
  categoryChip: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: colors.surface,
  },
  section: {
    marginVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  trendingList: {
    paddingHorizontal: spacing.lg,
  },
  trendingCard: {
    marginRight: spacing.md,
    alignItems: 'center',
  },
  trendingImage: {
    width: 100,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  trendingName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 100,
  },
  placesList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  placeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  placeImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.border,
  },
  placeInfo: {
    padding: spacing.md,
  },
  placeName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  placeDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  placeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  category: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
});

export default ExploreScreen;