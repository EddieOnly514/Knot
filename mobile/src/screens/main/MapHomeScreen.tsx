/**
 * Map Home Screen
 * Uber-style map + search integration with bottom sheet
 */

import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Animated,
    Dimensions,
    TextInput,
    Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, X, ChevronUp, Clock, MapPin, Navigation } from 'lucide-react-native';
import { MapProvider, useMap } from '../../contexts/MapContext';
import { SmartMap } from '../../components/map/SmartMap';
import { DestinationSearch } from '../../components/search/DestinationSearch';
import { colors, spacing, borderRadius, shadows } from '../../design';
import { Destination } from '../../types/destination';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SEARCH_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

function MapHomeContent() {
    const navigation = useNavigation<NavigationProp>();
    const {
        mapState,
        setSearching,
        setPreviewDestination,
        setSelectedDestination,
        clearDestination,
        returnToIdle,
        selectedDestination
    } = useMap();

    const [showSearch, setShowSearch] = useState(false);
    const searchSheetAnim = useRef(new Animated.Value(0)).current;

    // Open search sheet
    const handleOpenSearch = () => {
        setShowSearch(true);
        setSearching();
        Animated.spring(searchSheetAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    // Close search sheet
    const handleCloseSearch = () => {
        Keyboard.dismiss();
        Animated.spring(searchSheetAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
        }).start(() => {
            setShowSearch(false);
            returnToIdle();
        });
    };

    // Handle destination selected from search
    const handleDestinationSelected = (destination: Destination) => {
        // First preview, then auto-select after animation
        setPreviewDestination(destination);

        // Auto-select after short delay
        setTimeout(() => {
            setSelectedDestination(destination);
            handleCloseSearch();
        }, 500);
    };

    // Proceed to trip setup
    const handleConfirmDestination = () => {
        if (selectedDestination) {
            navigation.navigate('TripSearch', {
                destination: selectedDestination,
            });
        }
    };

    // Cancel destination
    const handleCancelDestination = () => {
        clearDestination();
    };

    const translateY = searchSheetAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_HEIGHT, 0],
    });

    return (
        <View style={styles.container}>
            {/* Map */}
            <SmartMap style={styles.map} />

            {/* Top Search Bar (when not in full search mode) */}
            {!showSearch && mapState !== 'DESTINATION_SELECTED' && (
                <SafeAreaView style={styles.topBar}>
                    <TouchableOpacity
                        style={styles.searchBarCollapsed}
                        onPress={handleOpenSearch}
                        activeOpacity={0.9}
                    >
                        <Search size={20} color={colors.text.muted} />
                        <Text style={styles.searchPlaceholder}>Where to?</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            )}

            {/* Destination Selected Bottom Sheet */}
            {mapState === 'DESTINATION_SELECTED' && selectedDestination && (
                <View style={styles.destinationSheet}>
                    <View style={styles.destinationContent}>
                        <View style={styles.destinationHeader}>
                            <View style={styles.destinationIcon}>
                                <MapPin size={20} color={colors.primary} />
                            </View>
                            <View style={styles.destinationInfo}>
                                <Text style={styles.destinationName} numberOfLines={1}>
                                    {selectedDestination.name}
                                </Text>
                                <Text style={styles.destinationAddress} numberOfLines={1}>
                                    {selectedDestination.address}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCancelDestination}
                            >
                                <X size={20} color={colors.text.muted} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={handleConfirmDestination}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.confirmButtonText}>Set pickup options</Text>
                            <ChevronUp size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Full Search Sheet */}
            {showSearch && (
                <Animated.View
                    style={[
                        styles.searchSheet,
                        { transform: [{ translateY }] }
                    ]}
                >
                    <SafeAreaView style={styles.searchSheetInner}>
                        {/* Search Header */}
                        <View style={styles.searchHeader}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleCloseSearch}
                            >
                                <X size={24} color={colors.text.main} />
                            </TouchableOpacity>
                            <Text style={styles.searchTitle}>Enter destination</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        {/* Search Component */}
                        <DestinationSearch
                            placeholder="Where are you going?"
                            onDestinationSelected={handleDestinationSelected}
                            autoFocus
                        />
                    </SafeAreaView>
                </Animated.View>
            )}
        </View>
    );
}

// Wrap with MapProvider
export function MapHomeScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const handleDestinationSelected = (destination: Destination) => {
        console.log('[MapHomeScreen] Destination selected:', destination.name);
    };

    return (
        <MapProvider onDestinationSelected={handleDestinationSelected}>
            <MapHomeContent />
        </MapProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    map: {
        flex: 1,
    },
    // Top search bar
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    searchBarCollapsed: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        ...shadows.card,
    },
    searchPlaceholder: {
        flex: 1,
        fontSize: 16,
        color: colors.text.muted,
    },
    // Destination sheet
    destinationSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        ...shadows.card,
    },
    destinationContent: {
        padding: spacing.lg,
    },
    destinationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    destinationIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primaryAlpha[10],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    destinationInfo: {
        flex: 1,
    },
    destinationName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.main,
        marginBottom: 2,
    },
    destinationAddress: {
        fontSize: 14,
        color: colors.text.muted,
    },
    cancelButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.slate[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    // Search sheet
    searchSheet: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background,
    },
    searchSheetInner: {
        flex: 1,
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.main,
        textAlign: 'center',
    },
});
