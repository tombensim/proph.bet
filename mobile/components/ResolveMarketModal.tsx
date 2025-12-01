import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { launchCamera, launchImageLibrary, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import { theme } from '@/lib/theme';
import { useResolveMarket } from '@/hooks/useMarkets';
import { storageApi } from '@/lib/api';

interface Option {
  id: string;
  text: string;
}

interface ResolveMarketModalProps {
  visible: boolean;
  onClose: () => void;
  marketId: string;
  marketTitle: string;
  options: Option[];
}

export function ResolveMarketModal({ 
  visible, 
  onClose, 
  marketId,
  marketTitle,
  options 
}: ResolveMarketModalProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [evidenceImage, setEvidenceImage] = useState<{ uri: string; type: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);

  const resolveMarket = useResolveMarket();

  const resetForm = () => {
    setSelectedOptionId(null);
    setEvidenceImage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const takePhoto = async () => {
    try {
      console.log('[Camera] Starting takePhoto with react-native-image-picker...');
      
      // Request camera permission on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Proph.bet needs access to your camera to take photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
      }
      
      const options: CameraOptions = {
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
        cameraType: 'back',
      };

      launchCamera(options, (response) => {
        console.log('[Camera] Response:', response.didCancel ? 'canceled' : 'success');
        
        if (response.didCancel) {
          return;
        }
        
        if (response.errorCode) {
          console.error('[Camera] Error:', response.errorCode, response.errorMessage);
          Alert.alert('Camera Error', response.errorMessage || 'Failed to open camera');
          return;
        }
        
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setEvidenceImage({
            uri: asset.uri!,
            type: asset.type || 'image/jpeg',
          });
        }
      });
    } catch (error) {
      console.error('[Camera] Error:', error);
      Alert.alert('Camera Error', `Failed to open camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const pickFromLibrary = async () => {
    try {
      const options: ImageLibraryOptions = {
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      };

      launchImageLibrary(options, (response) => {
        if (response.didCancel) {
          return;
        }
        
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Failed to open photo library');
          return;
        }
        
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setEvidenceImage({
            uri: asset.uri!,
            type: asset.type || 'image/jpeg',
          });
        }
      });
    } catch (error) {
      console.error('Library error:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
    }
  };

  const pickImage = () => {
    setShowImagePickerModal(true);
  };

  const handleImagePickerSelect = useCallback((action: 'camera' | 'library') => {
    // Close modal first
    setShowImagePickerModal(false);
    
    // Wait for modal to fully close, then trigger the action
    setTimeout(() => {
      if (action === 'camera') {
        takePhoto();
      } else {
        pickFromLibrary();
      }
    }, 300);
  }, []);

  const uploadImage = async (): Promise<string | null> => {
    if (!evidenceImage) return null;

    setIsUploadingImage(true);
    try {
      const urlResponse = await storageApi.getUploadUrl(evidenceImage.type, 'resolution-evidence');
      if (!urlResponse.success || !urlResponse.data) {
        throw new Error(urlResponse.error || 'Failed to get upload URL');
      }

      const { uploadUrl, publicUrl } = urlResponse.data;

      const imageResponse = await fetch(evidenceImage.uri);
      const blob = await imageResponse.blob();

      await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': evidenceImage.type,
        },
      });

      return publicUrl;
    } catch (error) {
      console.error('Image upload failed:', error);
      Alert.alert('Upload Failed', 'Failed to upload evidence image. The resolution will proceed without it.');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedOptionId) {
      Alert.alert('Error', 'Please select a winning option');
      return;
    }

    Alert.alert(
      'Confirm Resolution',
      'Are you sure you want to resolve this market? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          style: 'destructive',
          onPress: async () => {
            try {
              let imageUrl: string | null = null;
              if (evidenceImage) {
                imageUrl = await uploadImage();
              }

              await resolveMarket.mutateAsync({
                marketId,
                winningOptionId: selectedOptionId,
                resolutionImage: imageUrl || undefined,
              });

              Alert.alert('Success', 'Market resolved successfully!', [
                { text: 'OK', onPress: handleClose }
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to resolve market');
            }
          },
        },
      ]
    );
  };

  const isSubmitting = resolveMarket.isPending || isUploadingImage;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>Resolve Market</Text>
          <Pressable
            onPress={handleResolve}
            disabled={isSubmitting || !selectedOptionId}
            style={[styles.submitButton, (isSubmitting || !selectedOptionId) && styles.submitButtonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.colors.destructiveForeground} />
            ) : (
              <Text style={styles.submitButtonText}>Resolve</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Market Title */}
          <View style={styles.marketTitleContainer}>
            <Ionicons name="help-circle-outline" size={24} color={theme.colors.warning} />
            <Text style={styles.marketTitle}>{marketTitle}</Text>
          </View>

          {/* Warning */}
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={20} color={theme.colors.warning} />
            <Text style={styles.warningText}>
              This action is irreversible. Please verify the winning option before resolving.
            </Text>
          </View>

          {/* Options Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Winning Option</Text>
            <View style={styles.optionsContainer}>
              {options.map((option) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.optionCard,
                    selectedOptionId === option.id && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedOptionId(option.id)}
                >
                  <View style={styles.optionContent}>
                    <View style={[
                      styles.radioOuter,
                      selectedOptionId === option.id && styles.radioOuterSelected
                    ]}>
                      {selectedOptionId === option.id && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[
                      styles.optionText,
                      selectedOptionId === option.id && styles.optionTextSelected
                    ]}>
                      {option.text}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Evidence Image */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence (Optional)</Text>
            <Text style={styles.hint}>
              Add a screenshot or photo as proof of the resolution
            </Text>
            <Pressable onPress={pickImage} style={styles.imagePicker}>
              {evidenceImage ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: evidenceImage.uri }} style={styles.evidenceImage} />
                  <Pressable 
                    style={styles.removeImageButton}
                    onPress={() => setEvidenceImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.colors.destructive} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={theme.colors.mutedForeground} />
                  <Text style={styles.imagePlaceholderText}>Tap to add evidence</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <Pressable 
          style={styles.imagePickerOverlay} 
          onPress={() => setShowImagePickerModal(false)}
        >
          <View style={styles.imagePickerSheet}>
            <Text style={styles.imagePickerTitle}>Add Evidence Image</Text>
            <Text style={styles.imagePickerSubtitle}>Choose how you want to add evidence</Text>
            
            <Pressable 
              style={styles.imagePickerOption}
              onPress={() => handleImagePickerSelect('camera')}
            >
              <Ionicons name="camera-outline" size={24} color={theme.colors.foreground} />
              <Text style={styles.imagePickerOptionText}>Take Photo</Text>
            </Pressable>
            
            <Pressable 
              style={styles.imagePickerOption}
              onPress={() => handleImagePickerSelect('library')}
            >
              <Ionicons name="images-outline" size={24} color={theme.colors.foreground} />
              <Text style={styles.imagePickerOptionText}>Choose from Library</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.imagePickerOption, styles.imagePickerCancel]}
              onPress={() => setShowImagePickerModal(false)}
            >
              <Text style={styles.imagePickerCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    padding: theme.spacing.sm,
    marginLeft: -theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.foreground,
  },
  submitButton: {
    backgroundColor: theme.colors.destructive,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: theme.colors.destructiveForeground,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.sm,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  marketTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warningLight,
    borderRadius: theme.borderRadius.lg,
  },
  marketTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
    lineHeight: theme.typography.fontSize.base * 1.4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.destructive + '15',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xl,
  },
  warningText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.destructive,
    lineHeight: theme.typography.fontSize.sm * 1.5,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
  },
  hint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing.md,
  },
  optionsContainer: {
    gap: theme.spacing.sm,
  },
  optionCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  optionCardSelected: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.successLight,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: theme.colors.success,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.success,
  },
  optionText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.foreground,
  },
  optionTextSelected: {
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.success,
  },
  imagePicker: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  evidenceImage: {
    width: '100%',
    height: 180,
    borderRadius: theme.borderRadius.lg,
  },
  removeImageButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: theme.colors.muted,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  imagePlaceholderText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  bottomSpace: {
    height: 40,
  },
  // Image Picker Modal
  imagePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  imagePickerSheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius['2xl'],
    borderTopRightRadius: theme.borderRadius['2xl'],
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing['2xl'],
  },
  imagePickerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.foreground,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  imagePickerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  imagePickerOptionText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
  },
  imagePickerCancel: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  imagePickerCancelText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
});

