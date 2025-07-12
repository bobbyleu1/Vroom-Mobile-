import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Camera, CameraType, VideoQuality } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-video';

export default function UploadScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [recording, setRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [durationLimit, setDurationLimit] = useState(60);
  const cameraRef = useRef(null);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const mediaStatus = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === 'granted' && mediaStatus.status === 'granted');
    })();
  }, []);

  const handleRecord = async () => {
    if (!cameraRef.current || !cameraReady) return;

    if (recording) {
      cameraRef.current.stopRecording();
      return;
    }

    try {
      setRecording(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: durationLimit,
        quality: VideoQuality['480p'],
      });

      if (video?.uri) setRecordedUri(video.uri);
    } catch (e) {
      console.error('Recording error:', e);
      Alert.alert('Error', 'Failed to record video.');
    } finally {
      setRecording(false);
    }
  };

  const handleFlip = () => {
    setCameraType(prev =>
      prev === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  const uploadVideo = async () => {
    if (!recordedUri) return;
    setUploading(true);
    try {
      const response = await fetch(recordedUri);
      const blob = await response.blob();
      const filename = `video_${Date.now()}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filename, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'video/mp4',
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('posts').getPublicUrl(filename);
      const publicUrl = publicData?.publicUrl;

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user?.id) throw new Error('Unable to fetch user session');

      const userId = session.user.id;

      const { error: insertError } = await supabase.from('posts').insert({
        media_url: publicUrl,
        content: caption,
        author_id: userId,
        file_type: 'video',
      });

      if (insertError) throw insertError;

      Alert.alert('Upload Successful', 'Your video has been uploaded.');
      navigation.navigate('Feed');
    } catch (error) {
      console.error(error);
      Alert.alert('Upload Failed', error.message || 'An unknown error occurred.');
    } finally {
      setUploading(false);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.center}><ActivityIndicator color="#00BFFF" size="large" /></View>;
  }

  if (hasPermission === false) {
    return <View style={styles.center}><Text style={{ color: '#fff' }}>No access to camera</Text></View>;
  }

  if (recordedUri) {
    return (
      <View style={styles.container}>
        <Video
          source={{ uri: recordedUri }}
          style={{ flex: 1 }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
        />
        <TextInput
          placeholder="Add a caption (optional)"
          placeholderTextColor="#aaa"
          style={styles.input}
          value={caption}
          onChangeText={setCaption}
        />
        <View style={styles.row}>
          <TouchableOpacity onPress={() => setRecordedUri(null)} style={styles.retakeButton}>
            <Text style={{ color: '#fff' }}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={uploadVideo} style={styles.uploadButton} disabled={uploading}>
            <Text style={{ color: '#fff' }}>{uploading ? 'Uploading...' : 'Upload'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Camera
        style={{ flex: 1 }}
        type={cameraType}
        ref={cameraRef}
        ratio="16:9"
        onCameraReady={() => setCameraReady(true)}
      >
        <TouchableOpacity onPress={handleFlip} style={styles.flipButton}>
          <Ionicons name="camera-reverse" size={32} color="#fff" />
        </TouchableOpacity>

        <View style={styles.durationContainer}>
          {[600, 60, 15].map(limit => (
            <TouchableOpacity key={limit} onPress={() => setDurationLimit(limit)}>
              <Text style={[styles.durationText, durationLimit === limit && { color: '#00BFFF', fontWeight: 'bold' }]}>
                {limit === 600 ? '10m' : limit === 60 ? '60s' : '15s'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.recordContainer}>
          <TouchableOpacity onPress={handleRecord} style={styles.recordButton}>
            <View style={styles.recordCircle} />
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  flipButton: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
  durationContainer: { position: 'absolute', bottom: 150, alignSelf: 'center', flexDirection: 'row', gap: 15 },
  durationText: { color: '#fff', fontSize: 18 },
  recordContainer: { position: 'absolute', bottom: 60, alignSelf: 'center' },
  recordButton: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  recordCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'red' },
  input: { backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 8, marginTop: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  retakeButton: { backgroundColor: '#555', padding: 12, borderRadius: 8, flex: 0.48, alignItems: 'center' },
  uploadButton: { backgroundColor: '#00BFFF', padding: 12, borderRadius: 8, flex: 0.48, alignItems: 'center' },
});
