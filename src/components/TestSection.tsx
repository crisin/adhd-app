import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme/tokens';
import { PermissionKind, Permissions, PermissionStatus } from '../services/permissions';

// ─── Permission Status Badge ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<PermissionStatus, { label: string; color: string; icon: string }> = {
  granted: { label: 'Granted', color: '#10B981', icon: 'checkmark-circle' },
  denied: { label: 'Denied', color: '#EF4444', icon: 'close-circle' },
  limited: { label: 'Limited', color: '#F59E0B', icon: 'alert-circle' },
  undetermined: { label: 'Not Requested', color: '#94A3B8', icon: 'help-circle' },
};

interface PermissionStatusBadgeProps {
  permission: PermissionKind;
}

export function PermissionStatusBadge({ permission }: PermissionStatusBadgeProps) {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [checked, setChecked] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    Permissions.check(permission).then((result) => {
      if (mounted) {
        setStatus(result.status);
        setChecked(true);
      }
    });
    return () => { mounted = false; };
  }, [permission]);

  const config = STATUS_CONFIG[status];

  return (
    <View style={statusStyles.container}>
      <Ionicons name={config.icon as any} size={16} color={config.color} />
      <Text style={[statusStyles.label, { color: config.color }]}>
        {checked ? config.label : 'Checking...'}
      </Text>
    </View>
  );
}

const statusStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// ─── Platform Availability ───────────────────────────────────────────────────

interface PlatformAvailabilityProps {
  features: { label: string; ios: boolean; android: boolean; web: boolean }[];
}

export function PlatformAvailability({ features }: PlatformAvailabilityProps) {
  const current = Platform.OS;

  return (
    <View style={platformStyles.container}>
      <Text style={platformStyles.title}>Platform Support</Text>
      {features.map((f) => (
        <View key={f.label} style={platformStyles.row}>
          <Text style={platformStyles.featureLabel}>{f.label}</Text>
          <View style={platformStyles.icons}>
            <PlatformDot label="iOS" available={f.ios} active={current === 'ios'} />
            <PlatformDot label="Android" available={f.android} active={current === 'android'} />
            <PlatformDot label="Web" available={f.web} active={current === 'web'} />
          </View>
        </View>
      ))}
    </View>
  );
}

function PlatformDot({ label, available, active }: { label: string; available: boolean; active: boolean }) {
  const color = available ? '#10B981' : '#94A3B8';
  return (
    <View style={[platformStyles.dot, active && platformStyles.dotActive]}>
      <Ionicons
        name={available ? 'checkmark' : 'close'}
        size={10}
        color={color}
      />
      <Text style={[platformStyles.dotLabel, { color }]}>{label}</Text>
    </View>
  );
}

const platformStyles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  featureLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  icons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    opacity: 0.5,
  },
  dotActive: {
    opacity: 1,
  },
  dotLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});

// ─── Test Output Area ────────────────────────────────────────────────────────

interface TestOutputProps {
  lines: string[];
}

export function TestOutput({ lines }: TestOutputProps) {
  if (lines.length === 0) return null;

  return (
    <View style={outputStyles.container}>
      <Text style={outputStyles.title}>Output</Text>
      {lines.map((line, i) => (
        <Text key={i} style={outputStyles.line}>{line}</Text>
      ))}
    </View>
  );
}

const outputStyles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  line: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
