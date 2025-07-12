import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, FlatList, Dimensions, Image, Share, ActivityIndicator } from 'react-native';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Video } from 'expo-av';
import { Ionicons, Feather, Entypo } from '@expo/vector-icons';
import { Animated } from 'react-native';
import UploadScreen from './screens/UploadScreen';

import { supabase } from './utils/supabase';
import EditProfileScreen from './screens/EditProfileScreen';
import ProfileScreen from './screens/ProfileScreen';

import heartIcon from './assets/icons/heart.png';
import commentIcon from './assets/icons/comment.png';
import shareIcon from './assets/icons/share.png';

const { height } = Dimensions.get('window');
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (isSignUp) => {
    setLoading(true);
    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      Alert.alert('Success', isSignUp ? 'Check your email to confirm signup' : 'Logged in');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vroom 🚗</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        value={email}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        onChangeText={setPassword}
        value={password}
      />
      <TouchableOpacity style={styles.button} onPress={() => handleAuth(false)} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Log In'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => handleAuth(true)} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Sign Up'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ActionBar({ post, onLikePress }) {
  return (
    <View style={styles.actionBar}>
      <TouchableOpacity onPress={() => onLikePress(post.id)} style={styles.actionButton}>
        <Image source={heartIcon} style={styles.actionIcon} />
        <Text style={styles.actionText}>{post.like_count}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Alert.alert('Comments', 'Coming soon')} style={styles.actionButton}>
        <Image source={commentIcon} style={styles.actionIcon} />
        <Text style={styles.actionText}>{post.comment_count}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Share.share({ message: post.media_url })} style={styles.actionButton}>
        <Image source={shareIcon} style={styles.actionIcon} />
        <Text style={styles.actionText}>Share</Text>
      </TouchableOpacity>
    </View>
  );
}
function FeedScreen() {
  const [videos, setVideos] = useState([]);
  const videoRefs = useRef([]);
  const [loading, setLoading] = useState(true);
  const [heartScale] = useState(new Animated.Value(0));

  const animateHeart = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  const handleDoubleTap = (postId) => {
    animateHeart();
    // TODO: add Supabase like logic here if you want to increment likes
    console.log("Double tapped:", postId);
  };

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase
  .from('posts')
  .select(`
    id,
    media_url,
    content,
    like_count,
    comment_count,
    view_count,
    author_id,
    profiles (
      username,
      avatar_url
    )
  `)

  .eq('file_type', 'video')
  .order('created_at', { ascending: false });

      if (!error) setVideos(data || []);
      setLoading(false);
    };
    fetchVideos();
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      videoRefs.current.forEach((ref, idx) => {
        if (ref) idx === index ? ref.playAsync() : ref.pauseAsync();
      });
    }
  }).current;

  useFocusEffect(() => {
    return () => {
      videoRefs.current.forEach(ref => {
        if (ref) ref.pauseAsync().catch(() => {});
      });
    };
  });

  if (loading) return <ActivityIndicator size="large" color="#00BFFF" style={{ flex: 1, backgroundColor: '#000' }} />;

  return (
    <FlatList
      data={videos}
      keyExtractor={item => item.id}
      pagingEnabled
      snapToInterval={height}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
      renderItem={({ item, index }) => (
        
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => handleDoubleTap(item.id)}
          style={{ height, backgroundColor: '#000' }}
        >
          <Video
          
            ref={ref => (videoRefs.current[index] = ref)}
            source={{ uri: item.media_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            isLooping
          />
            {item.profiles?.username && (
  <View style={{ position: 'absolute', bottom: 160, left: 10, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
      @{item.profiles.username}
    </Text>
  </View>
)}

          {/* Caption overlay */}
          {item.content ? (
            <View style={{ position: 'absolute', bottom: height * 0.15, left: 10, padding: 5 }}>
              <Text style={{ color: '#fff', fontSize: 16 }}>{item.content}</Text>
            </View>
          ) : null}

{item.profiles?.avatar_url && (
  <Image
    source={{ uri: item.profiles.avatar_url }}
    style={{
      position: 'absolute',
      right: 12, // near the action bar's x position
      bottom: 400, // adjust to sit above like button (tweak as needed)
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: '#00BFFF',
      backgroundColor: '#333', // fallback color while loading
    }}
  />
)}

          {/* Animated Heart Overlay */}
          <Animated.Image
            source={heartIcon}
            style={{
              position: 'absolute',
              alignSelf: 'center',
              top: '40%',
              width: 100,
              height: 100,
              opacity: heartScale,
              transform: [{ scale: heartScale }],
              tintColor: 'white',
            }}
          />

          <ActionBar post={item} onLikePress={() => handleDoubleTap(item.id)} />
        </TouchableOpacity>
      )}
    />
  );
}


function FriendsScreen() {
  const [videos, setVideos] = useState([]);
  const videoRefs = useRef([]);
  const [loading, setLoading] = useState(true);
  const [heartScale] = useState(new Animated.Value(0));

  const animateHeart = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  const handleDoubleTap = (postId) => {
    animateHeart();
    // TODO: add Supabase like logic here if you want to increment likes
    console.log("Double tapped:", postId);
  };

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase
  .from('posts')
  .select(`
    id,
    media_url,
    content,
    like_count,
    comment_count,
    view_count,
    author_id,
    profiles (
      username,
      avatar_url
    )
  `)

  .eq('file_type', 'video')
  .order('created_at', { ascending: false });

      if (!error) setVideos(data || []);
      setLoading(false);
    };
    fetchVideos();
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      videoRefs.current.forEach((ref, idx) => {
        if (ref) idx === index ? ref.playAsync() : ref.pauseAsync();
      });
    }
  }).current;

  useFocusEffect(() => {
    return () => {
      videoRefs.current.forEach(ref => {
        if (ref) ref.pauseAsync().catch(() => {});
      });
    };
  });

  if (loading) return <ActivityIndicator size="large" color="#00BFFF" style={{ flex: 1, backgroundColor: '#000' }} />;

  return (
    <FlatList
      data={videos}
      keyExtractor={item => item.id}
      pagingEnabled
      snapToInterval={height}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
      renderItem={({ item, index }) => (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => handleDoubleTap(item.id)}
          style={{ height, backgroundColor: '#000' }}
        >
          <Video
            ref={ref => (videoRefs.current[index] = ref)}
            source={{ uri: item.media_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            isLooping
          />
          {item.profiles?.username && (
               <View style={{ position: 'absolute', bottom: 160, left: 10, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              @{item.profiles.username}
                </Text>
              </View>
                )}

          {/* Caption overlay */}
          {item.content ? (
            <View style={{ position: 'absolute', bottom: 120, left: 10, padding: 10 }}>
              <Text style={{ color: '#fff', fontSize: 16 }}>{item.content}</Text>
            </View>
          ) : null}

{item.profiles?.avatar_url && (
  <Image
    source={{ uri: item.profiles.avatar_url }}
    style={{
      position: 'absolute',
      right: 12, // near the action bar's x position
      bottom: 400, // adjust to sit above like button (tweak as needed)
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: '#00BFFF',
      backgroundColor: '#333', // fallback color while loading
    }}
  />
)}


          {/* Animated Heart Overlay */}
          <Animated.Image
            source={heartIcon}
            style={{
              position: 'absolute',
              alignSelf: 'center',
              top: '40%',
              width: 100,
              height: 100,
              opacity: heartScale,
              transform: [{ scale: heartScale }],
              tintColor: 'white',
            }}
          />

          <ActionBar post={item} onLikePress={() => handleDoubleTap(item.id)} />
        </TouchableOpacity>
      )}
    />
  );
}





function MoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>More</Text>
    </View>
  );
}

function MainApp() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#000', height: 70, borderTopWidth: 0 },
        tabBarActiveTintColor: '#00BFFF',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'Feed') return <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />;
          if (route.name === 'Friends') return <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />;
          if (route.name === 'Upload') return (
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#00BFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 30 }}>
              <Entypo name="plus" size={32} color="#000" />
            </View>
          );
          if (route.name === 'More') return <Feather name="more-horizontal" size={size} color={color} />;
          if (route.name === 'Profile') return <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      setChecking(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
      setChecking(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (checking) return <ActivityIndicator size="large" color="#00BFFF" style={{ flex: 1, backgroundColor: '#000' }} />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {loggedIn ? (
          <>
            <Stack.Screen name="MainApp" component={MainApp} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, color: '#fff', marginBottom: 20 },
  input: { backgroundColor: '#222', color: '#fff', width: '100%', padding: 12, borderRadius: 8, marginVertical: 6 },
  button: { backgroundColor: '#00BFFF', padding: 12, borderRadius: 8, marginTop: 10, width: '100%', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16 },
  actionBar: { position: 'absolute', right: 15, bottom: 120, alignItems: 'center' },
  actionButton: { alignItems: 'center', marginBottom: 20 },
  actionIcon: { width: 40, height: 40, tintColor: 'white', marginBottom: 4 },
  actionText: { color: 'white', fontSize: 14 },
});
