import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { uploadPhoto } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import { colors, radius, spacing, typography } from '@/theme';

const log = createLogger('photo');

export interface Attachment {
  fileId: string;
  uri: string;
}

/**
 * Photo evidence capture. Uploads immediately to /files/upload and hands the
 * caller the file ids, because every GRID-X write takes `photographFileIds`
 * rather than the image itself.
 */
export function PhotoPicker({
  category,
  attachments,
  onChange,
  label = 'Photo evidence',
  max = 4,
}: {
  category: string;
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
  label?: string;
  max?: number;
}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(
    async (fromCamera: boolean) => {
      setError(null);
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(fromCamera ? 'Camera permission is required' : 'Photo access is required');
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      if (!asset) return;
      setBusy(true);
      try {
        const uploaded = await uploadPhoto(asset.uri, category, asset.fileName ?? 'evidence.jpg');
        onChange([...attachments, { fileId: uploaded.id, uri: asset.uri }]);
      } catch (err) {
        log.warn('upload failed', { category });
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setBusy(false);
      }
    },
    [attachments, category, onChange],
  );

  const canAdd = attachments.length < max && !busy;

  return (
    <View style={styles.container}>
      <Text style={typography.label}>{label}</Text>
      <View style={styles.row}>
        {attachments.map((attachment) => (
          <View key={attachment.fileId} style={styles.thumb}>
            <Image source={{ uri: attachment.uri }} style={styles.image} />
            <Pressable
              style={styles.remove}
              hitSlop={8}
              onPress={() => onChange(attachments.filter((item) => item.fileId !== attachment.fileId))}
            >
              <Ionicons name="close" size={12} color={colors.foreground} />
            </Pressable>
          </View>
        ))}
        {canAdd ? (
          <>
            <Pressable style={styles.add} onPress={() => void add(true)}>
              <Ionicons name="camera-outline" size={20} color={colors.mutedForeground} />
              <Text style={typography.caption}>Camera</Text>
            </Pressable>
            <Pressable style={styles.add} onPress={() => void add(false)}>
              <Ionicons name="images-outline" size={20} color={colors.mutedForeground} />
              <Text style={typography.caption}>Gallery</Text>
            </Pressable>
          </>
        ) : null}
        {busy ? (
          <View style={styles.add}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
            <Text style={typography.caption}>Uploading</Text>
          </View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: 68, height: 68, borderRadius: radius.input, overflow: 'hidden', position: 'relative' },
  image: { width: '100%', height: '100%' },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: 68,
    height: 68,
    borderRadius: radius.input,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  error: { color: colors.destructive, fontSize: 12 },
});
