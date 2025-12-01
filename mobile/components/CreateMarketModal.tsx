import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoImagePicker from 'expo-image-picker';
import { launchCamera, launchImageLibrary, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '@/lib/theme';
import { useCreateMarket, CreateMarketData } from '@/hooks/useArenas';
import { aiApi, storageApi } from '@/lib/api';

interface CreateMarketModalProps {
  visible: boolean;
  onClose: () => void;
  arenaId: string;
}

type MarketType = 'BINARY' | 'MULTIPLE_CHOICE' | 'NUMERIC_RANGE';

const MARKET_TYPES: { value: MarketType; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'BINARY', label: 'Yes/No', description: 'Simple yes or no question', icon: 'checkmark-circle-outline' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', description: 'Multiple options to choose from', icon: 'list-outline' },
  { value: 'NUMERIC_RANGE', label: 'Numeric Range', description: 'Predict a number within a range', icon: 'analytics-outline' },
];

export function CreateMarketModal({ visible, onClose, arenaId }: CreateMarketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<MarketType>('BINARY');
  const [resolutionDate, setResolutionDate] = useState<Date>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default: 30 days from now
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [options, setOptions] = useState<string[]>(['', '']);
  
  // Numeric range state
  const [numericMin, setNumericMin] = useState('');
  const [numericMax, setNumericMax] = useState('');
  const [numericStep, setNumericStep] = useState('1');
  
  // Cover image state
  const [coverImage, setCoverImage] = useState<{ uri: string; type: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // AI generation state
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  
  // Image picker modal state
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);

  const createMarket = useCreateMarket(arenaId);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('BINARY');
    setResolutionDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setOptions(['', '']);
    setNumericMin('');
    setNumericMax('');
    setNumericStep('1');
    setCoverImage(null);
    setShowDatePicker(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setResolutionDate(selectedDate);
    }
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
          console.log('[Camera] User cancelled');
          return;
        }
        
        if (response.errorCode) {
          console.error('[Camera] Error:', response.errorCode, response.errorMessage);
          Alert.alert('Camera Error', response.errorMessage || 'Failed to open camera');
          return;
        }
        
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          console.log('[Camera] Got image:', asset.uri);
          setCoverImage({
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
          setCoverImage({
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
    // Using 300ms to ensure fade animation completes
    setTimeout(() => {
      if (action === 'camera') {
        takePhoto();
      } else {
        pickFromLibrary();
      }
    }, 300);
  }, []);

  const uploadImage = async (): Promise<string | null> => {
    if (!coverImage) return null;

    setIsUploadingImage(true);
    try {
      // Get pre-signed upload URL
      const urlResponse = await storageApi.getUploadUrl(coverImage.type, 'market-assets');
      if (!urlResponse.success || !urlResponse.data) {
        throw new Error(urlResponse.error || 'Failed to get upload URL');
      }

      const { uploadUrl, publicUrl } = urlResponse.data;

      // Upload the image
      const imageResponse = await fetch(coverImage.uri);
      const blob = await imageResponse.blob();

      await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': coverImage.type,
        },
      });

      return publicUrl;
    } catch (error) {
      console.error('Image upload failed:', error);
      Alert.alert('Upload Failed', 'Failed to upload cover image. The market will be created without it.');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const generateDescription = async () => {
    if (title.trim().length < 10) {
      Alert.alert('Title Required', 'Please enter a title with at least 10 characters before generating a description.');
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const optionsForAI = type === 'MULTIPLE_CHOICE' 
        ? options.filter(o => o.trim()) 
        : undefined;

      const response = await aiApi.generateDescription({
        title: title.trim(),
        type,
        options: optionsForAI,
        resolutionDate: resolutionDate.toISOString(),
        arenaId,
      });

      if (response.success && response.data?.description) {
        setDescription(response.data.description);
      } else {
        throw new Error(response.error || 'Failed to generate description');
      }
    } catch (error) {
      Alert.alert('Generation Failed', error instanceof Error ? error.message : 'Failed to generate description');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const validateForm = (): string | null => {
    if (!title.trim()) {
      return 'Please enter a title for your market';
    }

    if (resolutionDate <= new Date()) {
      return 'Resolution date must be in the future';
    }

    if (type === 'MULTIPLE_CHOICE') {
      const validOptions = options.filter(o => o.trim());
      if (validOptions.length < 2) {
        return 'Please provide at least 2 options';
      }
    }

    if (type === 'NUMERIC_RANGE') {
      const min = parseFloat(numericMin);
      const max = parseFloat(numericMax);
      const step = parseFloat(numericStep);

      if (isNaN(min) || isNaN(max)) {
        return 'Please enter valid min and max values for the numeric range';
      }
      if (min >= max) {
        return 'Maximum must be greater than minimum';
      }
      if (isNaN(step) || step <= 0) {
        return 'Please enter a valid step value';
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    // Upload cover image if present
    let coverUrl: string | null = null;
    if (coverImage) {
      coverUrl = await uploadImage();
    }

    const marketData: CreateMarketData & { assets?: { type: string; url: string }[] } = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      resolutionDate: resolutionDate.toISOString(),
    };

    if (type === 'MULTIPLE_CHOICE') {
      marketData.options = options.filter(o => o.trim());
    } else if (type === 'NUMERIC_RANGE') {
      // For numeric range, we create options based on the range
      const min = parseFloat(numericMin);
      const max = parseFloat(numericMax);
      const step = parseFloat(numericStep);
      
      // Generate numeric options
      const numericOptions: string[] = [];
      for (let i = min; i <= max; i += step) {
        numericOptions.push(i.toString());
        if (numericOptions.length >= 10) break; // Limit to 10 options
      }
      marketData.options = numericOptions;
    }

    if (coverUrl) {
      marketData.assets = [{ type: 'IMAGE', url: coverUrl }];
    }

    try {
      await createMarket.mutateAsync(marketData);
      Alert.alert('Success', 'Market created successfully!', [
        { text: 'OK', onPress: handleClose }
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create market');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
          <Text style={styles.headerTitle}>Create Market</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={createMarket.isPending || isUploadingImage}
            style={[styles.submitButton, (createMarket.isPending || isUploadingImage) && styles.submitButtonDisabled]}
          >
            {createMarket.isPending || isUploadingImage ? (
              <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
            ) : (
              <Text style={styles.submitButtonText}>Create</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Cover Image */}
          <View style={styles.field}>
            <Text style={styles.label}>Cover Image</Text>
            <Pressable onPress={pickImage} style={styles.coverImagePicker}>
              {coverImage ? (
                <View style={styles.coverImageContainer}>
                  <Image source={{ uri: coverImage.uri }} style={styles.coverImage} />
                  <Pressable 
                    style={styles.removeCoverButton}
                    onPress={() => setCoverImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.colors.destructive} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.coverImagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color={theme.colors.mutedForeground} />
                  <Text style={styles.coverImageText}>Tap to add cover image</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Title Input */}
          <View style={styles.field}>
            <Text style={styles.label}>Question *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Will there be a US recession in 2025?"
              placeholderTextColor={theme.colors.mutedForeground}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Market Type Selection */}
          <View style={styles.field}>
            <Text style={styles.label}>Market Type</Text>
            <View style={styles.typeContainer}>
              {MARKET_TYPES.map((marketType) => (
                <Pressable
                  key={marketType.value}
                  style={[
                    styles.typeOption,
                    type === marketType.value && styles.typeOptionSelected,
                  ]}
                  onPress={() => setType(marketType.value)}
                >
                  <View style={styles.typeHeader}>
                    <View style={[
                      styles.typeIconContainer,
                      type === marketType.value && styles.typeIconContainerSelected,
                    ]}>
                      <Ionicons 
                        name={marketType.icon} 
                        size={20} 
                        color={type === marketType.value ? theme.colors.primaryForeground : theme.colors.mutedForeground} 
                      />
                    </View>
                    <View style={styles.typeTextContainer}>
                      <Text style={[
                        styles.typeLabel,
                        type === marketType.value && styles.typeLabelSelected,
                      ]}>
                        {marketType.label}
                      </Text>
                      <Text style={styles.typeDescription}>{marketType.description}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Multiple Choice Options */}
          {type === 'MULTIPLE_CHOICE' && (
            <View style={styles.field}>
              <Text style={styles.label}>Options</Text>
              {options.map((option, index) => (
                <View key={index} style={styles.optionRow}>
                  <TextInput
                    style={[styles.input, styles.optionInput]}
                    value={option}
                    onChangeText={(value) => updateOption(index, value)}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={theme.colors.mutedForeground}
                  />
                  {options.length > 2 && (
                    <Pressable
                      onPress={() => removeOption(index)}
                      style={styles.removeOptionButton}
                    >
                      <Ionicons name="close-circle" size={24} color={theme.colors.destructive} />
                    </Pressable>
                  )}
                </View>
              ))}
              {options.length < 6 && (
                <Pressable onPress={addOption} style={styles.addOptionButton}>
                  <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.addOptionText}>Add Option</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Numeric Range Options */}
          {type === 'NUMERIC_RANGE' && (
            <View style={styles.field}>
              <Text style={styles.label}>Range Settings</Text>
              <View style={styles.numericRow}>
                <View style={styles.numericField}>
                  <Text style={styles.numericLabel}>Min</Text>
                  <TextInput
                    style={styles.input}
                    value={numericMin}
                    onChangeText={setNumericMin}
                    placeholder="0"
                    placeholderTextColor={theme.colors.mutedForeground}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.numericField}>
                  <Text style={styles.numericLabel}>Max</Text>
                  <TextInput
                    style={styles.input}
                    value={numericMax}
                    onChangeText={setNumericMax}
                    placeholder="100"
                    placeholderTextColor={theme.colors.mutedForeground}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.numericField}>
                  <Text style={styles.numericLabel}>Step</Text>
                  <TextInput
                    style={styles.input}
                    value={numericStep}
                    onChangeText={setNumericStep}
                    placeholder="1"
                    placeholderTextColor={theme.colors.mutedForeground}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <Text style={styles.hint}>
                Options will be generated from min to max with the specified step
              </Text>
            </View>
          )}

          {/* Resolution Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Resolution Date *</Text>
            <Pressable 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.colors.mutedForeground} />
              <Text style={styles.dateButtonText}>{formatDate(resolutionDate)}</Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.mutedForeground} />
            </Pressable>
            <Text style={styles.hint}>When should this market be resolved?</Text>
            
            {showDatePicker && (
              <DateTimePicker
                value={resolutionDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
                style={Platform.OS === 'ios' ? styles.iosDatePicker : undefined}
              />
            )}
            
            {Platform.OS === 'ios' && showDatePicker && (
              <Pressable 
                style={styles.closeDatePickerButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.closeDatePickerText}>Done</Text>
              </Pressable>
            )}
          </View>

          {/* Description Input with AI Button */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Description</Text>
              <Pressable 
                onPress={generateDescription}
                disabled={isGeneratingDescription}
                style={styles.aiButton}
              >
                {isGeneratingDescription ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                    <Text style={styles.aiButtonText}>Generate with AI</Text>
                  </>
                )}
              </Pressable>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add resolution criteria and details..."
              placeholderTextColor={theme.colors.mutedForeground}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
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
            <Text style={styles.imagePickerTitle}>Add Cover Image</Text>
            <Text style={styles.imagePickerSubtitle}>Choose how you want to add a cover image</Text>
            
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
    backgroundColor: theme.colors.primary,
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
    color: theme.colors.primaryForeground,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.sm,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  field: {
    marginBottom: theme.spacing.xl,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.foreground,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.mutedForeground,
    marginTop: theme.spacing.xs,
  },
  // Cover Image
  coverImagePicker: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  coverImageContainer: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 160,
    borderRadius: theme.borderRadius.lg,
  },
  removeCoverButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
  },
  coverImagePlaceholder: {
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
  coverImageText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  // AI Button
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: `${theme.colors.primary}15`,
  },
  aiButtonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  // Market Types
  typeContainer: {
    gap: theme.spacing.sm,
  },
  typeOption: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  typeOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}08`,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIconContainerSelected: {
    backgroundColor: theme.colors.primary,
  },
  typeTextContainer: {
    flex: 1,
  },
  typeLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.foreground,
    marginBottom: 2,
  },
  typeLabelSelected: {
    color: theme.colors.primary,
  },
  typeDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  // Options
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  optionInput: {
    flex: 1,
  },
  removeOptionButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  addOptionText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  // Numeric Range
  numericRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  numericField: {
    flex: 1,
  },
  numericLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing.xs,
  },
  // Date Picker
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  dateButtonText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.foreground,
  },
  iosDatePicker: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
  },
  closeDatePickerButton: {
    alignSelf: 'flex-end',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  closeDatePickerText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
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
