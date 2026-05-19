import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Modal, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  apiGetMyAvailability, apiSetMyAvailability, DayAvailability,
} from '../../services/artistAvailabilityService';
import { Colors } from '../../constants/colors';

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_SCHEDULE: DayAvailability[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  is_available: i >= 1 && i <= 5,
  start_time: '09:00',
  end_time: '18:00',
}));

function timeToDate(t: string): Date {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h!, m!, 0, 0);
  return d;
}

function dateToTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AvailabilityScreen() {
  const [schedule, setSchedule] = useState<DayAvailability[]>(DEFAULT_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ day: number; field: 'start' | 'end' } | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  useEffect(() => {
    apiGetMyAvailability()
      .then((data) => {
        if (data.length > 0) {
          const map = new Map(data.map((d) => [d.day_of_week, d]));
          setSchedule(DEFAULT_SCHEDULE.map((def) => map.get(def.day_of_week) ?? def));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateDay = (day: number, patch: Partial<DayAvailability>) => {
    setSchedule((prev) => prev.map((s) => s.day_of_week === day ? { ...s, ...patch } : s));
  };

  const openTimePicker = (day: number, field: 'start' | 'end') => {
    const entry = schedule.find((s) => s.day_of_week === day);
    const current = field === 'start' ? (entry?.start_time ?? '09:00') : (entry?.end_time ?? '18:00');
    setPickerDate(timeToDate(current));
    setPickerTarget({ day, field });
    setPickerVisible(true);
  };

  const confirmPicker = (date?: Date) => {
    if (date && pickerTarget) {
      const time = dateToTime(date);
      updateDay(pickerTarget.day, pickerTarget.field === 'start' ? { start_time: time } : { end_time: time });
    }
    setPickerVisible(false);
  };

  const handleSave = async () => {
    for (const s of schedule) {
      if (s.is_available && s.start_time >= s.end_time) {
        Alert.alert('时间设置有误', `${DAY_NAMES[s.day_of_week]} 的结束时间必须晚于开始时间`);
        return;
      }
    }
    setSaving(true);
    try {
      await apiSetMyAvailability(schedule);
      Alert.alert('保存成功', '可预约时间已更新');
    } catch {
      Alert.alert('失败', '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.hint}>设置每天的可预约时间，顾客预约时将参考此时间段。</Text>

        <View style={s.card}>
          {DAY_ORDER.map((dayIdx, i) => {
            const entry = schedule.find((x) => x.day_of_week === dayIdx)!;
            return (
              <View key={dayIdx}>
                {i > 0 && <View style={s.divider} />}
                <View style={s.row}>
                  <Text style={s.dayName}>{DAY_NAMES[dayIdx]}</Text>
                  <Switch
                    value={entry.is_available}
                    onValueChange={(v) => updateDay(dayIdx, { is_available: v })}
                    trackColor={{ true: Colors.primary, false: '#E5E7EB' }}
                    thumbColor="#fff"
                  />
                  {entry.is_available ? (
                    <View style={s.timeRange}>
                      <TouchableOpacity style={s.timeBtn} onPress={() => openTimePicker(dayIdx, 'start')}>
                        <Text style={s.timeText}>{entry.start_time}</Text>
                      </TouchableOpacity>
                      <Text style={s.timeSep}>-</Text>
                      <TouchableOpacity style={s.timeBtn} onPress={() => openTimePicker(dayIdx, 'end')}>
                        <Text style={s.timeText}>{entry.end_time}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={s.unavailableText}>不可预约</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={s.saveBtnText}>保存设置</Text>
              </>}
        </TouchableOpacity>
      </ScrollView>

      {/* Time picker modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {pickerTarget
                  ? `${DAY_NAMES[pickerTarget.day]} ${pickerTarget.field === 'start' ? '开始' : '结束'}时间`
                  : '选择时间'}
              </Text>
              <TouchableOpacity onPress={() => confirmPicker(pickerDate)}>
                <Text style={s.modalDone}>完成</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={pickerDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour
              onChange={(_, date) => {
                if (date) setPickerDate(date);
                if (Platform.OS === 'android') confirmPicker(date);
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, lineHeight: 18 },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  dayName: { fontSize: 15, fontWeight: '600', color: Colors.text, width: 36 },
  timeRange: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  timeBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#FFF0F5', borderRadius: 8,
  },
  timeText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  timeSep: { fontSize: 14, color: Colors.textSecondary },
  unavailableText: { fontSize: 13, color: Colors.textSecondary, marginLeft: 'auto' },
  divider: { height: 1, backgroundColor: '#F2F2F7', marginLeft: 16 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 24, paddingVertical: 16, borderRadius: 16,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  modalDone: { fontSize: 16, fontWeight: '700', color: Colors.primary },
});
