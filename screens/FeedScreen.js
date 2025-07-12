// Vroom FeedScreen with TikTok-style ActionStack, clean styling, and working handleLike integration
import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { supabase } from './supabaseClient';
import ActionStack from './ActionStack'; // You will use the ActionStack we structured

const FeedScreen = ({ userId }) => {
  const [videos, setVideos] = useState([]);
  const [likedPostIds, setLikedPostIds] = useState(new Set());

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Fetch error:', error);
      } else {
        setVideos(data);
      }
    };
    fetchVideos();
  }, []);

  const handleLike = async (postId) => {
    if (!userId) {
      Alert.alert('Login Required', 'Please log in to like posts.');
      return;
    }
    try {
      const hasLiked = likedPostIds.has(postId);

      if (hasLiked) {
        const { data: existing, error: existingError } = await supabase
          .from('post_likes')
          .select('id')
          .eq('user_id', userId)
          .eq('post_id', postId)
          .single();

        if (existingError) throw existingError;

        const { error: deleteError } = await supabase
          .from('post_likes')
          .delete()
          .eq('id', existing.id);
        if (deleteError) throw deleteError;

        const { data: post, error: postError } = await supabase
          .from('posts')
          .select('like_count')
          .eq('id', postId)
          .single();
        if (postError) throw postError;

        const newLikeCount = Math.max((post.like_count || 1) - 1, 0);

        const { error: updateError } = await supabase
          .from('posts')
          .update({ like_count: newLikeCount })
          .eq('id', postId);
        if (updateError) throw updateError;

        setLikedPostIds((prev) => {
          const updated = new Set(prev);
          updated.delete(postId);
          return updated;
        });

        setVideos((prev) =>
          prev.map((video) =>
            video.id === postId ? { ...video, like_count: newLikeCount } : video
          )
        );
      } else {
        const { error: insertError } = await supabase
          .from('post_likes')
          .insert({ user_id: userId, post_id: postId });
        if (insertError) throw insertError;

        const { data: post, error: postError } = await supabase
          .from('posts')
          .select('like_count')
          .eq('id', postId)
          .single();
        if (postError) throw postError;

        const newLikeCount = (post.like_count || 0) + 1;

        const { error: updateError } = await supabase
          .from('posts')
          .update({ like_count: newLikeCount })
          .eq('id', postId);
        if (updateError) throw updateError;

        setLikedPostIds((prev) => new Set(prev).add(postId));

        setVideos((prev) =>
          prev.map((video) =>
            video.id === postId ? { ...video, like_count: newLikeCount } : video
          )
        );
      }
    } catch (error) {
      console.error('Like error:', error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {videos.map((video) => (
        <View key={video.id} style={styles.videoContainer}>
          <Video
            source={{ uri: video.video_url }}
            style={styles.video}
            resizeMode="cover"
            shouldPlay
            isLooping
          />

          <ActionStack
            profilePic={video.author_profile_pic || 'https://placehold.co/100x100'}
            likes={video.like_count || 0}
            comments={video.comment_count || 0}
            saves={video.save_count || 0}
            shares={video.share_count || 0}
            onLike={() => handleLike(video.id)}
          />

          <View style={styles.captionContainer}>
            <Text style={styles.caption}>{video.caption}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  videoContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  video: {
    flex: 1,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 40,
    left: 10,
    right: 80,
  },
  caption: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default FeedScreen;
