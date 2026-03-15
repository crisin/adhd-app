import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme/tokens';
import { PermissionKind, Permissions } from '../services/permissions';

interface PermissionGateProps {
  permission: PermissionKind;
  enabled: boolean;
  featureLabel: string;
  description: string;
  /** Icon name from Ionicons */
  icon: string;
  onEnable: () => void;
  children: React.ReactNode;
}

/**
 * Wraps feature UI. When disabled, shows an enable prompt instead of the children.
 * When the feature is not available on the current platform, shows an info message.
 */
export function PermissionGate({
  permission,
  enabled,
  featureLabel,
  description,
  icon,
  onEnable,
  children,
}: PermissionGateProps) {
  const available = Permissions.isAvailable(permission);

  if (!available) {
    return (
      <View style={styles.container}>
        <Ionicons name={icon as any} size={32} color={colors.textMuted} />
        <Text style={styles.title}>{featureLabel}</Text>
        <Text style={styles.description}>
          Not available on {Platform.OS === 'web' ? 'web' : 'this platform'}.
          {Platform.OS === 'web' && ' Use the iOS or Android app for this feature.'}
        </Text>
      </View>
    );
  }

  if (!enabled) {
    return (
      <View style={styles.container}>
        <Ionicons name={icon as any} size={32} color={colors.primaryDark} />
        <Text style={styles.title}>{featureLabel}</Text>
        <Text style={styles.description}>{description}</Text>
        <TouchableOpacity style={styles.enableBtn} onPress={onEnable} activeOpacity={0.8}>
          <Text style={styles.enableBtnText}>Enable {featureLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  enableBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  enableBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryDark,
  },
});
