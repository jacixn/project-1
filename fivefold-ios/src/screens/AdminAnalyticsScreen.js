import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail } from '../config/admin';
import SheetHeader from '../components/SheetHeader';
import { hapticFeedback } from '../utils/haptics';
import { fetchAdminAnalytics } from '../services/adminAnalyticsService';
import { relativeTime, formatDate, formatClock, ATTRIBUTION_LABELS } from '../utils/adminAnalytics';

// Admin User Analytics. Native pull-to-dismiss modal stacked over Settings
// (registered in RootNavigator with presentation:'modal', so no Modal wrapper
// and no PanResponder, and no pull-to-refresh control: it fights the native
// pull-down dismiss). Editorial layout: big numerals, hairlines, no cards.

const TABULAR = { fontVariant: ['tabular-nums'] };

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// TikTok's brand colour is black, which vanishes on a dark background.
const sourceColor = (item, isDark) => {
  if (item.id === 'tiktok') return isDark ? '#FFFFFF' : '#000000';
  return item.color;
};

const AdminAnalyticsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [board, setBoard] = useState('season');

  const hairline = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
  const tertiary = theme.textTertiary || theme.textSecondary;

  const load = useCallback(async (viaPull) => {
    if (!isAdmin) return;
    if (viaPull) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminAnalytics();
      setData(result);
    } catch (e) {
      console.error('[AdminAnalytics] load failed:', e);
      setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(false); }, [load]);

  const onRefreshPress = () => {
    hapticFeedback.light();
    load(true);
  };

  const styles = useMemo(() => makeStyles(theme, hairline, tertiary), [theme, hairline, tertiary]);

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <SheetHeader title="User Analytics" leftLabel="Done" onLeft={() => navigation.goBack()} />
        <Text style={[styles.subline, { padding: 20 }]}>Admin only.</Text>
      </View>
    );
  }

  const renderBody = () => {
    if (loading && !data) {
      return (
        <View style={{ paddingVertical: 80, alignItems: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      );
    }
    if (error && !data) {
      return (
        <View style={{ paddingVertical: 80, alignItems: 'center' }}>
          <Text style={styles.subline}>Could not load analytics.</Text>
          <Pressable onPress={() => load(false)} hitSlop={12} style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.primary }}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    if (!data) return null;

    const {
      total, newThisWeek, newThisMonth, active, lastSeen, recent,
      topSeason, topAllTime, attribution, answered, notAnswered,
      referrals, season, daysLeft, fetchedAt,
    } = data;
    const topReferrers = referrals ? referrals.topReferrers : [];
    const recentReferrals = referrals ? referrals.recent : [];
    const totalReferred = referrals ? referrals.totalReferred : 0;
    const now = fetchedAt;
    const monthPct = total > 0 ? Math.round((active.month / total) * 100) : 0;
    const maxSource = attribution.length ? attribution[0].count : 0;
    const top = attribution[0];
    const rows = board === 'season' ? topSeason : topAllTime;

    return (
      <>
        {/* 1. Hero */}
        <View style={styles.heroRow}>
          <Text style={styles.heroNumber}>{total}</Text>
          <Text style={styles.heroWord}>users</Text>
        </View>
        <Text style={[styles.subline, { fontSize: 14, marginTop: 6 }]}>
          {newThisWeek} joined this week, {newThisMonth} this month.
        </Text>
        <Text style={styles.tertiaryLine}>Updated {formatClock(fetchedAt)}</Text>

        {/* 2. Active */}
        <View style={styles.section}>
          <Text style={styles.headline}>Active</Text>
          <Text style={styles.subline}>Counted from the last time each account synced.</Text>

          <View style={styles.figureRow}>
            <Figure value={active.day} label="Today" styles={styles} />
            <Figure value={active.week} label="This week" styles={styles} />
            <Figure value={active.month} label="This month" styles={styles} />
          </View>

          <View style={styles.barRow}>
            <View style={styles.thinTrack}>
              <View style={[styles.thinFill, { width: `${monthPct}%` }]} />
            </View>
            <Text style={[styles.subline, TABULAR, { marginTop: 0, marginLeft: 12 }]}>
              {monthPct}% of all users in 30 days
            </Text>
          </View>

          <Text style={styles.subLabel}>Last seen</Text>
          {lastSeen.length === 0 ? (
            <Text style={[styles.subline, { marginTop: 8 }]}>Nobody has synced yet.</Text>
          ) : (
            lastSeen.map((u, i) => (
              <View key={u.uid} style={[styles.row, i < lastSeen.length - 1 && styles.rowLine]}>
                <Text style={[styles.rowName, { flex: 1 }]}>{u.displayName}</Text>
                <Text style={[styles.rowRight, TABULAR]}>{relativeTime(u.lastSeen, now)}</Text>
              </View>
            ))
          )}
        </View>

        {/* 3. New accounts */}
        <View style={styles.section}>
          <Text style={styles.headline}>New accounts</Text>
          <Text style={styles.subline}>Most recent first</Text>

          <View style={{ marginTop: 10 }}>
            {recent.length === 0 ? (
              <Text style={[styles.subline, { marginTop: 8 }]}>No accounts yet.</Text>
            ) : (
              recent.map((u, i) => {
                const via = u.attribution ? ` via ${ATTRIBUTION_LABELS[u.attribution] || u.attribution}` : '';
                const handle = u.username ? `@${u.username}` : (u.email || 'no username');
                return (
                  <View key={u.uid} style={[styles.row, i < recent.length - 1 && styles.rowLine]}>
                    <View style={{ flex: 1, flexShrink: 1, paddingRight: 12 }}>
                      <Text style={[styles.rowName, { fontWeight: '700' }]}>{u.displayName}</Text>
                      <Text style={styles.rowMeta}>{handle}{via}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.rowStrongRight, TABULAR]}>
                        {u.createdAt ? relativeTime(u.createdAt, now) : 'unknown'}
                      </Text>
                      <Text style={[styles.rowDate, TABULAR]}>
                        {u.createdAt ? formatDate(u.createdAt) : 'no signup date'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* 4. Referrals */}
        <View style={styles.section}>
          <Text style={styles.headline}>Referrals</Text>
          {totalReferred === 0 ? (
            <Text style={styles.subline}>No account has named a referrer yet.</Text>
          ) : (
            <>
              <Text style={styles.subline}>
                {totalReferred} of {total} accounts came through a referral.
              </Text>

              <Text style={styles.subLabel}>Top referrers</Text>
              {topReferrers.map((ref, i) => {
                const rank = i + 1;
                const handle = ref.resolved
                  ? (ref.username ? `@${ref.username}` : 'no username')
                  : 'account no longer exists';
                const drift = ref.resolved && ref.storedCount !== ref.count ? `, counter says ${ref.storedCount}` : '';
                return (
                  <View key={ref.uid} style={i < topReferrers.length - 1 && styles.rowLine}>
                    <View style={[styles.row, { paddingTop: rank === 1 ? 16 : 12, paddingBottom: 8 }]}>
                      <Text style={[styles.rank, TABULAR, { color: rank <= 3 ? theme.primary : tertiary }]}>{rank}</Text>
                      <View style={{ flex: 1, flexShrink: 1, paddingRight: 12 }}>
                        <Text style={[styles.rowName, { fontWeight: rank === 1 ? '800' : '600' }]}>{ref.displayName}</Text>
                        <Text style={[styles.rowMeta, { fontSize: 12 }]}>{handle}{drift}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                        <Text style={[styles.points, TABULAR]}>{ref.count.toLocaleString('en-US')}</Text>
                        <Text style={styles.pts}>referred</Text>
                      </View>
                    </View>
                    <View style={styles.referredList}>
                      {ref.referred.map((r) => (
                        <View key={r.uid} style={styles.referredRow}>
                          <Text style={styles.referredName}>{r.displayName}</Text>
                          <Text style={[styles.rowRight, TABULAR]}>
                            {r.referralDate ? formatDate(r.referralDate) : 'date unknown'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}

              <Text style={styles.subLabel}>Who referred who</Text>
              {recentReferrals.map((r, i) => (
                <View key={r.uid} style={[styles.row, i < recentReferrals.length - 1 && styles.rowLine]}>
                  <View style={{ flex: 1, flexShrink: 1, paddingRight: 12 }}>
                    <Text style={[styles.rowName, { fontWeight: '700' }]}>{r.displayName}</Text>
                    <Text style={styles.rowMeta}>referred by {r.referrerName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.rowStrongRight, TABULAR]}>
                      {r.referralDate ? relativeTime(r.referralDate, now) : 'unknown'}
                    </Text>
                    <Text style={[styles.rowDate, TABULAR]}>
                      {r.referralDate ? formatDate(r.referralDate) : 'no date'}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* 5. Top points */}
        <View style={styles.section}>
          <Text style={styles.headline}>Top points</Text>
          <Text style={styles.subline}>
            {season.name} {season.year}, {plural(daysLeft, 'day left', 'days left')}
          </Text>

          <View style={styles.toggleRow}>
            <ToggleOption
              label="This season"
              active={board === 'season'}
              onPress={() => { if (board !== 'season') { hapticFeedback.selection(); setBoard('season'); } }}
              styles={styles}
            />
            <ToggleOption
              label="All time"
              active={board === 'all'}
              onPress={() => { if (board !== 'all') { hapticFeedback.selection(); setBoard('all'); } }}
              styles={styles}
            />
          </View>

          {rows.length === 0 ? (
            <Text style={[styles.subline, { marginTop: 14 }]}>
              {board === 'season' ? 'No points yet this season.' : 'No points yet.'}
            </Text>
          ) : (
            rows.map((u, i) => {
              const rank = i + 1;
              const points = board === 'season' ? u.seasonalPoints : u.totalPoints;
              const streak = u.currentStreak > 0 ? `, ${u.currentStreak} day streak` : '';
              return (
                <View
                  key={u.uid}
                  style={[
                    styles.row,
                    { paddingVertical: rank === 1 ? 16 : 12 },
                    i < rows.length - 1 && styles.rowLine,
                  ]}
                >
                  <Text style={[styles.rank, TABULAR, { color: rank <= 3 ? theme.primary : tertiary }]}>{rank}</Text>
                  <View style={{ flex: 1, flexShrink: 1, paddingRight: 12 }}>
                    <Text style={[styles.rowName, { fontWeight: rank === 1 ? '800' : '600' }]}>{u.displayName}</Text>
                    <Text style={[styles.rowMeta, { fontSize: 12 }]}>Level {u.level}{streak}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={[styles.points, TABULAR]}>{points.toLocaleString('en-US')}</Text>
                    <Text style={styles.pts}>pts</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* 6. Where users come from */}
        <View style={styles.section}>
          <Text style={styles.headline}>Where users come from</Text>
          <Text style={styles.subline}>{answered} of {total} answered during onboarding.</Text>
          {top ? (
            <Text style={[styles.subline, { marginTop: 3 }]}>
              {top.label} brings {top.pctOfAnswered}% of the people who answered.
            </Text>
          ) : null}

          <View style={{ marginTop: 18 }}>
            {attribution.length === 0 ? (
              <Text style={styles.subline}>Nobody has answered yet.</Text>
            ) : (
              attribution.map((item) => {
                const width = maxSource > 0 ? Math.round((item.count / maxSource) * 100) : 0;
                return (
                  <View key={item.id} style={{ marginBottom: 14 }}>
                    <View style={styles.sourceLabelRow}>
                      <Text style={styles.sourceLabel}>{item.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={[styles.sourceCount, TABULAR]}>{item.count}</Text>
                        <Text style={[styles.subline, TABULAR, { marginTop: 0 }]}> {item.pctOfAnswered}%</Text>
                      </View>
                    </View>
                    <View style={styles.thickTrack}>
                      <View style={[styles.thickFill, { width: `${width}%`, backgroundColor: sourceColor(item, isDark) }]} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
          <Text style={[styles.tertiaryLine, { marginTop: 4 }]}>
            {plural(notAnswered, 'person skipped the question.', 'people skipped the question.')}
          </Text>
        </View>
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SheetHeader
        title="User Analytics"
        leftLabel="Done"
        onLeft={() => navigation.goBack()}
        rightLabel="Refresh"
        onRight={onRefreshPress}
        rightDisabled={loading || refreshing}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {renderBody()}
      </ScrollView>
    </View>
  );
};

const Figure = ({ value, label, styles }) => (
  <View style={{ flex: 1 }}>
    <Text style={[styles.figure, TABULAR]}>{value}</Text>
    <Text style={styles.subline}>{label}</Text>
  </View>
);

const ToggleOption = ({ label, active, onPress, styles }) => (
  <Pressable onPress={onPress} hitSlop={8}>
    <Text style={active ? styles.toggleActive : styles.toggleInactive}>{label}</Text>
    <View style={[styles.toggleBar, { backgroundColor: active ? styles.toggleBar.backgroundColor : 'transparent' }]} />
  </Pressable>
);

const makeStyles = (theme, hairline, tertiary) => StyleSheet.create({
  section: { marginTop: 36 },
  headline: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: theme.text },
  subline: { fontSize: 13, color: theme.textSecondary, marginTop: 3 },
  tertiaryLine: { fontSize: 13, color: tertiary, marginTop: 6 },
  subLabel: { fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginTop: 18 },

  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 4 },
  heroNumber: {
    fontSize: 76,
    fontWeight: '800',
    letterSpacing: -3,
    lineHeight: 80,
    color: theme.text,
    fontVariant: ['tabular-nums'],
  },
  heroWord: { fontSize: 22, fontWeight: '600', color: theme.textSecondary, paddingBottom: 12 },

  figureRow: { flexDirection: 'row', marginTop: 18 },
  figure: { fontSize: 36, fontWeight: '800', letterSpacing: -1, color: theme.text },

  barRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  thinTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: hairline, overflow: 'hidden' },
  thinFill: { height: 6, borderRadius: 3, backgroundColor: theme.primary },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: hairline },
  rowName: { fontSize: 16, fontWeight: '600', color: theme.text, flexShrink: 1 },
  rowMeta: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  rowRight: { fontSize: 14, color: theme.textSecondary, textAlign: 'right', marginLeft: 12 },
  rowStrongRight: { fontSize: 14, fontWeight: '600', color: theme.text, textAlign: 'right' },
  rowDate: { fontSize: 12, color: tertiary, textAlign: 'right', marginTop: 2 },

  toggleRow: { flexDirection: 'row', gap: 20, marginTop: 16 },
  toggleActive: { fontSize: 15, fontWeight: '800', color: theme.text },
  toggleInactive: { fontSize: 15, fontWeight: '600', color: theme.textSecondary },
  toggleBar: { height: 2, marginTop: 6, backgroundColor: theme.primary },

  rank: { width: 34, fontSize: 18, fontWeight: '800' },
  referredList: { marginLeft: 34, paddingBottom: 12 },
  referredRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  referredName: { fontSize: 14, fontWeight: '500', color: theme.text, flex: 1, flexShrink: 1, paddingRight: 12 },
  points: { fontSize: 17, fontWeight: '800', color: theme.text },
  pts: { fontSize: 11, fontWeight: '600', color: theme.textSecondary },

  sourceLabelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  sourceLabel: { fontSize: 15, fontWeight: '600', color: theme.text, flexShrink: 1, paddingRight: 12 },
  sourceCount: { fontSize: 15, fontWeight: '800', color: theme.text },
  thickTrack: { height: 10, borderRadius: 3, backgroundColor: hairline, overflow: 'hidden' },
  thickFill: { height: 10, borderRadius: 3 },
});

export default AdminAnalyticsScreen;
