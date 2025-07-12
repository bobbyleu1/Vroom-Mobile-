import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Dimensions, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '../utils/supabase';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const navigation = useNavigation();
    const [profile, setProfile] = useState(null);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchProfileData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const userId = session.user.id;
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const { data: userVideos } = await supabase
                .from('posts')
                .select('*')
                .eq('author_id', userId)
                .order('created_at', { ascending: false });

            if (isMounted) {
                setProfile(userProfile);
                setVideos(userVideos || []);
                setLoading(false);
            }
        };

        fetchProfileData();

        return () => { isMounted = false; };
    }, []);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#00BFFF" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={{ height: 80 }} /> {/* Safe area spacer */}
                {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, { backgroundColor: '#333' }]} />
                )}
                <Text style={styles.username}>{profile?.username || 'No Username'}</Text>

                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => navigation.navigate('EditProfile')}
                >
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>

                {profile?.bio ? (
                    <Text style={styles.bio}>{profile.bio}</Text>
                ) : (
                    <Text style={styles.bio}>No bio yet.</Text>
                )}

                {profile?.location ? (
                    <Text style={styles.location}>📍 {profile.location}</Text>
                ) : null}
            </View>

            {/* Spacer between bio and grid */}
            <View style={{ height: 20 }} />

            <View style={styles.gridContainer}>
                {videos.length > 0 ? (
                    videos.map(video => (
                        <View key={video.id} style={styles.videoContainer}>
                            <Image
                                source={{ uri: video.thumbnail_url || video.media_url }}
                                style={styles.videoThumbnail}
                            />
                        </View>
                    ))
                ) : (
                    <View style={{ width: '100%', alignItems: 'center', marginVertical: 20 }}>
                        <Text style={styles.noVideosText}>No videos posted yet.</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    headerContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#00BFFF',
    },
    username: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10,
    },
    bio: {
        color: '#aaa',
        fontSize: 14,
        marginTop: 6,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    location: {
        color: '#555',
        fontSize: 13,
        marginTop: 4,
    },
    editButton: {
        backgroundColor: '#00BFFF',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 6,
        marginTop: 10,
    },
    editButtonText: {
        color: '#fff',
        fontWeight: '500',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    videoContainer: {
        width: width / 3,
        height: width / 3,
        padding: 0.5,
    },
    videoThumbnail: {
        width: '100%',
        height: '100%',
    },
    noVideosText: {
        color: '#555',
        fontSize: 16,
    },
});
