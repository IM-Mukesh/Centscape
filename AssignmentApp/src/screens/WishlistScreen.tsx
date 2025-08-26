// src/screens/WishlistScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { getAllItems } from '../utils/storage';
import { WishlistItem } from '../types';
import { useIsFocused } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'Wishlist'>;

const FALLBACK = 'https://via.placeholder.com/150?text=No+Image';

export default function WishlistScreen({ navigation }: Props) {
  const [items, setItems] = useState<WishlistItem[] | null>(null);
  const isFocused = useIsFocused();

  const load = useCallback(async () => {
    setItems(null);
    try {
      const all = await getAllItems();
      setItems(all);
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to load wishlist');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    // load on mount, and whenever screen is focused (after adding)
    load();
  }, [isFocused, load]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Wishlist</Text>

      {items === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No items yet — tap + to add</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <View
              style={styles.row}
              accessible
              accessibilityLabel={`Wishlist item ${item.title}`}
            >
              <Image
                source={{ uri: item.image ?? FALLBACK }}
                style={styles.thumb}
              />
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.site}>{item.siteName ?? 'Unknown'}</Text>
                <Text style={styles.price}>{item.price ?? 'N/A'}</Text>
                <Text style={styles.ts}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Add')}
        accessibilityLabel="Add item to wishlist"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#666' },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
  },
  thumb: { width: 80, height: 80, borderRadius: 6, backgroundColor: '#eee' },
  info: { flex: 1, marginLeft: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  site: { color: '#666', marginTop: 4 },
  price: { marginTop: 6, fontWeight: '700' },
  ts: { marginTop: 4, fontSize: 12, color: '#999' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 30 },
});
