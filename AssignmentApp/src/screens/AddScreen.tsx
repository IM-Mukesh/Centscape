import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { API_PREVIEW } from '../config';
import { saveItem } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Add'>;

export default function AddScreen({ route, navigation }: Props) {
  const incomingUrl = route?.params?.url;
  const [url, setUrl] = useState<string>(incomingUrl ?? '');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);

  useEffect(() => {
    if (incomingUrl) {
      setUrl(String(incomingUrl));
      setTimeout(() => {
        fetchPreview(incomingUrl);
      }, 300);
    }
  }, [incomingUrl]);

  async function fetchPreview(toFetch?: string) {
    const u = toFetch ?? url;
    if (!u) {
      Alert.alert('Please enter a URL');
      return;
    }
    setPreview(null);
    setLoadingPreview(true);
    try {
      const res = await fetch(API_PREVIEW, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u }),
      });
      const json = await res.json();
      if (!res.ok) {
        Alert.alert('Preview error', json.error ?? 'Failed to fetch preview');
        setLoadingPreview(false);
        return;
      }
      setPreview(json);
    } catch (e: any) {
      console.warn(e);
      Alert.alert('Network error', e.message ?? 'Failed to fetch');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function onAdd() {
    if (!preview) {
      Alert.alert('No preview', 'Fetch a preview before adding');
      return;
    }
    const saved = await saveItem({
      title: preview.title ?? 'Untitled',
      image: preview.image ?? null,
      price: preview.price ?? null,
      currency: preview.currency ?? null,
      siteName: preview.siteName ?? null,
      sourceUrl: preview.sourceUrl ?? url,
      normalizedUrl: preview.sourceUrl ? null : null,
    }).catch(e => {
      console.warn(e);
      return null;
    });

    if (saved === null) {
      Alert.alert('Duplicate', 'This item already exists in your wishlist.');
      return;
    }
    navigation.navigate('Wishlist');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Product URL</Text>

        <View style={styles.inputRow}>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://example.com/product/..."
            placeholderTextColor={'#CFCFCF'}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="url"
            accessibilityLabel="Product URL input"
          />
          {url.length > 0 && (
            <TouchableOpacity
              onPress={() => setUrl('')}
              style={styles.clearButton}
              accessibilityLabel="Clear input"
            >
              <Text style={styles.clearText}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => fetchPreview()}
          accessibilityLabel="Fetch preview"
        >
          <Text style={styles.buttonText}>Fetch preview</Text>
        </TouchableOpacity>

        {loadingPreview && (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>Loading preview…</Text>
          </View>
        )}

        {preview && (
          <View style={styles.previewCard}>
            <Image
              source={{
                uri:
                  preview.image ??
                  'https://via.placeholder.com/150?text=No+Image',
              }}
              style={styles.previewImage}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.previewTitle}>
                {preview.title ?? 'Untitled'}
              </Text>
              <Text style={styles.previewSite}>
                {preview.siteName ?? 'Unknown'}
              </Text>
              <Text style={styles.previewPrice}>{preview.price ?? 'N/A'}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, { marginTop: 12 }]}
          onPress={onAdd}
          accessibilityLabel="Add to wishlist"
        >
          <Text style={styles.buttonText}>Add to wishlist</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff', flexGrow: 1 },
  label: { fontWeight: '600', marginBottom: 8 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    padding: 10,
  },
  clearButton: {
    padding: 6,
  },
  clearText: {
    fontSize: 18,
    color: '#888',
    fontWeight: 'bold',
  },

  button: {
    backgroundColor: '#0a84ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  center: { alignItems: 'center', marginTop: 12 },
  previewCard: {
    flexDirection: 'row',
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f6f7fb',
    alignItems: 'center',
  },
  previewImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  previewTitle: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  previewSite: { color: '#666', marginBottom: 6 },
  previewPrice: { fontWeight: '700' },
});
