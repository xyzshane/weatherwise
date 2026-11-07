import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchToday } from '../../lib/api';
import { getHere } from '../../lib/location';
import { decide, psiBand, rank } from '../../lib/rules';
import { PLACES } from '../../data/places';
import { colors, fonts } from '../../theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDay(d) {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

const BANNER = { bad: colors.bad, warn: colors.warn, good: colors.good };
const LIST_TITLE = { indoor: 'Picked for you, indoors', outdoor: 'Picked for you, outdoors', either: 'Picked for you' };

export default function Today() {
  const [state, setState] = useState({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const here = await getHere();
      const conditions = await fetchToday(here);
      const decision = decide(conditions);
      const picks = rank(PLACES, decision, here);
      setState({ status: 'ready', here, conditions, decision, picks });
    } catch (e) {
      setState({ status: 'error', message: e.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {state.status === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.ink} />
            <Text style={styles.muted}>Checking PSI and rain near you…</Text>
          </View>
        )}

        {state.status === 'error' && (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Couldn’t reach data.gov.sg</Text>
            <Text style={styles.muted}>{state.message}</Text>
            <Pressable style={styles.button} onPress={load} accessibilityRole="button">
              <Text style={styles.buttonText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {state.status === 'ready' && <Ready {...state} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function Ready({ here, conditions, decision, picks }) {
  const place = here.fallback ? 'Central Singapore' : conditions.area;
  return (
    <>
      <Text style={styles.dateLine}>
        {formatDay(new Date())} · {place}
      </Text>
      {here.fallback && <Text style={styles.note}>Location is off or outside Singapore, so this shows City Hall.</Text>}

      <View style={[styles.banner, { backgroundColor: BANNER[decision.tone] }]}>
        <Text style={styles.headline}>{decision.headline}</Text>
        <Text style={styles.bannerDetail}>{decision.detail}</Text>
      </View>
      <Text style={styles.stats}>
        PSI {conditions.psi} ({psiBand(conditions.psi)}) · {conditions.forecast}
      </Text>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{LIST_TITLE[decision.mode]}</Text>
        <Text style={styles.small}>Updated {formatTime(conditions.updatedAt)}</Text>
      </View>

      {picks.map((p, i) => (
        <View key={p.id} style={[styles.row, i < picks.length - 1 && styles.rowLine]}>
          <Text style={styles.rank}>{i + 1}</Text>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <View style={styles.nameWrap}>
                <View style={[styles.dot, { backgroundColor: p.setting === 'indoor' ? colors.indoor : colors.good }]} />
                <Text style={styles.name}>{p.name}</Text>
              </View>
              <Text style={[styles.small, styles.km]} numberOfLines={1}>{p.km < 10 ? p.km.toFixed(1) : Math.round(p.km)} km</Text>
            </View>
            <Text style={styles.reason}>{p.reason}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.footer}>Weather and PSI: NEA via data.gov.sg. Pull down to refresh.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 24, paddingBottom: 40 },
  center: { alignItems: 'center', gap: 12, paddingTop: 120 },
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
  errorTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  button: { height: 48, paddingHorizontal: 20, backgroundColor: colors.ink, justifyContent: 'center' },
  buttonText: { fontFamily: fonts.bold, fontSize: 15, color: colors.paper },

  dateLine: { fontFamily: fonts.body, fontSize: 14, color: colors.faint, marginTop: 8 },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginTop: 4 },
  banner: { marginTop: 16, paddingVertical: 24, paddingHorizontal: 22, gap: 10 },
  headline: { fontFamily: fonts.display, fontSize: 52, lineHeight: 50, color: colors.ink },
  bannerDetail: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
  stats: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 10 },

  sectionHead: {
    marginTop: 28,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
  small: { fontFamily: fonts.body, fontSize: 12, color: colors.faint },
  km: { flexShrink: 0, paddingTop: 3 },

  row: { flexDirection: 'row', gap: 16, paddingVertical: 18 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  rank: { fontFamily: fonts.display, fontSize: 30, color: '#6B6B6B', width: 18 },
  rowBody: { flex: 1, gap: 6 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, flexShrink: 1 },
  reason: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },

  footer: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginTop: 24 },
});
