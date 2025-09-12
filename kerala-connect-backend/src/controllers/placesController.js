const Place = require('../models/Place');
const Post = require('../models/Post');

// Get all places with filters
const getPlaces = async (req, res) => {
  try {
    const {
      category,
      district,
      minRating,
      page = 1,
      limit = 10,
      sortBy = 'rating',
      search
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    let query = { isActive: true };
    
    // Apply filters
    if (category) query.category = category;
    if (district) query['location.district'] = new RegExp(district, 'i');
    if (minRating) query['rating.average'] = { $gte: parseFloat(minRating) };
    
    let places;
    
    if (search) {
      places = await Place.searchPlaces(search, {
        category,
        district,
        minRating: parseFloat(minRating) || 0,
        limit: parseInt(limit),
        skip
      });
    } else {
      // Sort options
      let sortOptions = {};
      switch (sortBy) {
        case 'rating':
          sortOptions = { 'rating.average': -1, 'rating.count': -1 };
          break;
        case 'popular':
          sortOptions = { 'stats.views': -1, 'stats.postsCount': -1 };
          break;
        case 'newest':
          sortOptions = { createdAt: -1 };
          break;
        case 'alphabetical':
          sortOptions = { name: 1 };
          break;
        default:
          sortOptions = { 'rating.average': -1 };
      }
      
      places = await Place.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('verifiedBy', 'username fullName');
    }
    
    res.json({
      success: true,
      data: places,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: places.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get places error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get places'
    });
  }
};

// Get trending places
const getTrendingPlaces = async (req, res) => {
  try {
    const { limit = 10, category } = req.query;
    
    let trendingPlaces = await Place.getTrending(parseInt(limit));
    
    // Filter by category if specified
    if (category) {
      trendingPlaces = trendingPlaces.filter(place => place.category === category);
    }
    
    res.json({
      success: true,
      data: trendingPlaces
    });
  } catch (error) {
    console.error('Get trending places error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending places'
    });
  }
};

// Get place by ID
const getPlace = async (req, res) => {
  try {
    const { id } = req.params;
    
    const place = await Place.findById(id)
      .populate('verifiedBy', 'username fullName')
      .populate('nearbyPlaces.place', 'name location.address rating images');
    
    if (!place || !place.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Place not found'
      });
    }
    
    // Increment views
    await place.incrementViews();
    
    res.json({
      success: true,
      data: place
    });
  } catch (error) {
    console.error('Get place error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get place'
    });
  }
};

// Get places nearby
const getNearbyPlaces = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50000, category, limit = 20 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }
    
    let places = await Place.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(radius)
    );
    
    // Filter by category if specified
    if (category) {
      places = places.filter(place => place.category === category);
    }
    
    // Limit results
    places = places.slice(0, parseInt(limit));
    
    // Calculate distances
    const placesWithDistance = places.map(place => {
      const placeObj = place.toObject();
      placeObj.distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        place.location.coordinates.coordinates[1],
        place.location.coordinates.coordinates[0]
      );
      return placeObj;
    });
    
    res.json({
      success: true,
      data: placesWithDistance
    });
  } catch (error) {
    console.error('Get nearby places error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nearby places'
    });
  }
};

// Get place categories
const getPlaceCategories = async (req, res) => {
  try {
    const categories = await Place.distinct('category', { isActive: true });
    
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Place.countDocuments({ 
          category, 
          isActive: true 
        });
        return { name: category, count };
      })
    );
    
    res.json({
      success: true,
      data: categoriesWithCount
    });
  } catch (error) {
    console.error('Get place categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories'
    });
  }
};

// Get place districts
const getPlaceDistricts = async (req, res) => {
  try {
    const districts = await Place.distinct('location.district', { isActive: true });
    
    const districtsWithCount = await Promise.all(
      districts.map(async (district) => {
        const count = await Place.countDocuments({ 
          'location.district': district,
          isActive: true 
        });
        return { name: district, count };
      })
    );
    
    res.json({
      success: true,
      data: districtsWithCount.sort((a, b) => a.name.localeCompare(b.name))
    });
  } catch (error) {
    console.error('Get place districts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get districts'
    });
  }
};

// Get posts for a place
const getPlacePosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Verify place exists
    const place = await Place.findById(id);
    if (!place || !place.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Place not found'
      });
    }
    
    // Find posts that mention this place
    const posts = await Post.find({
      'location.name': new RegExp(place.name, 'i'),
      isActive: true
    })
    .populate('author', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
    // Add isLiked field if user is authenticated
    let postsWithLikeStatus = posts;
    if (req.user) {
      postsWithLikeStatus = posts.map(post => {
        const postObj = post.toObject();
        postObj.isLiked = post.isLikedBy(req.user._id);
        return postObj;
      });
    }
    
    res.json({
      success: true,
      data: postsWithLikeStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: posts.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get place posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get place posts'
    });
  }
};

// Rate a place
const ratePlace = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user._id;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }
    
    const place = await Place.findById(id);
    if (!place || !place.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Place not found'
      });
    }
    
    const updatedRating = await place.addRating(parseInt(rating), userId);
    
    res.json({
      success: true,
      message: 'Rating added successfully',
      data: {
        rating: updatedRating,
        userRating: parseInt(rating)
      }
    });
  } catch (error) {
    console.error('Rate place error:', error);
    
    if (error.message === 'Rating must be between 1 and 5') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to rate place'
    });
  }
};

// Check in at a place
const checkInAtPlace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const place = await Place.findById(id);
    if (!place || !place.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Place not found'
      });
    }
    
    // Award points for check-in
    await req.user.addPoints(10, `Check-in at ${place.name}`);
    
    // Increment check-in count
    place.stats.checkIns += 1;
    await place.save();
    
    res.json({
      success: true,
      message: 'Check-in successful! +10 points earned',
      data: {
        place: {
          id: place._id,
          name: place.name,
          checkInsCount: place.stats.checkIns
        },
        pointsEarned: 10
      }
    });
  } catch (error) {
    console.error('Check-in at place error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check-in'
    });
  }
};

// Get popular destinations by stats
const getPopularDestinations = async (req, res) => {
  try {
    const { limit = 10, timeframe = 'all' } = req.query;
    
    let matchStage = { isActive: true };
    
    // Apply timeframe filter
    if (timeframe === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      matchStage.updatedAt = { $gte: weekAgo };
    } else if (timeframe === 'month') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      matchStage.updatedAt = { $gte: monthAgo };
    }
    
    const popularPlaces = await Place.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          popularityScore: {
            $add: [
              { $multiply: ['$stats.views', 1] },
              { $multiply: ['$stats.postsCount', 5] },
              { $multiply: ['$stats.checkIns', 3] },
              { $multiply: ['$rating.average', '$rating.count'] }
            ]
          }
        }
      },
      { $sort: { popularityScore: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          popularityScore: 0
        }
      }
    ]);
    
    res.json({
      success: true,
      data: popularPlaces
    });
  } catch (error) {
    console.error('Get popular destinations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular destinations'
    });
  }
};

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = {
  getPlaces,
  getTrendingPlaces,
  getPlace,
  getNearbyPlaces,
  getPlaceCategories,
  getPlaceDistricts,
  getPlacePosts,
  ratePlace,
  checkInAtPlace,
  getPopularDestinations
};