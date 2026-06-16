import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Pet, MedicalRecord, Frequency } from '../types';
import { getUpcomingEvents, isActiveMedication } from './events';

// Lembretes são exibidos mesmo com o app aberto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const REMINDER_HOUR = 9;

let permissionAsked = false;
let lastSyncSignature: string | null = null;

// Horários de dose por frequência
const FREQUENCY_TIMES: Record<Frequency, { hour: number; minute: number }[]> = {
  once_daily:  [{ hour: 8, minute: 0 }],
  twice_daily: [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }],
  every_8h:    [{ hour: 7, minute: 0 }, { hour: 15, minute: 0 }, { hour: 23, minute: 0 }],
  every_12h:   [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }],
  continuous:  [{ hour: 9, minute: 0 }],
};

export async function ensureNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (!settings.canAskAgain) return false;
  if (permissionAsked) return false;
  permissionAsked = true;
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (!settings.canAskAgain) return false;
  permissionAsked = true;
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undecided'> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return 'granted';
  if (!settings.canAskAgain) return 'denied';
  return 'undecided';
}

function triggerAt(dateISO: string, daysBefore: number): Date | null {
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m || !d) return null;
  const when = new Date(y, m - 1, d - daysBefore, REMINDER_HOUR, 0, 0);
  return when.getTime() > Date.now() ? when : null;
}

function yearlyTriggerAt(dateISO: string): Notifications.CalendarTriggerInput | null {
  const [, m, d] = dateISO.split('-').map(Number);
  if (!m || !d) return null;
  return {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    month: m,
    day: d,
    hour: REMINDER_HOUR,
    minute: 0,
    repeats: true,
  };
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Reagenda todas as notificações locais a partir dos eventos futuros.
 * Inclui: lembretes de eventos, doses diárias de remédios, digest matinal,
 * aniversário de chegada e memórias recorrentes.
 */
export async function syncEventNotifications(
  pets: Pet[],
  records: MedicalRecord[],
): Promise<void> {
  if (Platform.OS === 'web') return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const events = getUpcomingEvents(pets, records);
  const recordById = new Map(records.map(r => [r.id, r]));
  const memories = records.filter(r => r.type === 'memory');
  const activeMeds = records.filter(
    r => r.type === 'medication' && isActiveMedication(r) && r.frequency,
  );

  const signature = JSON.stringify([
    events.map(e => [e.recordId, e.date, recordById.get(e.recordId)?.reminderDays ?? null]),
    pets.map(p => [p.id, p.createdAt]),
    memories.map(m => [m.id, m.date, m.title]),
    activeMeds.map(m => [m.id, m.date, m.endDate, m.frequency]),
  ]);
  if (signature === lastSyncSignature) return;
  lastSyncSignature = signature;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('doses', {
      name: 'Doses de remédio',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  // 1. Lembretes de eventos (reforço, retorno, fim de tratamento)
  for (const event of events) {
    const record = recordById.get(event.recordId);
    const reminderDays = record?.reminderDays?.length ? record.reminderDays : [0];
    for (const daysBefore of reminderDays) {
      const when = triggerAt(event.date, daysBefore);
      if (!when) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🐾 ${event.petName}: ${event.title}`,
          body:
            daysBefore === 0
              ? 'É hoje! Abra o PetCare para ver os detalhes.'
              : `Faltam ${daysBefore} ${daysBefore === 1 ? 'dia' : 'dias'}. Abra o PetCare para ver os detalhes.`,
          data: { petId: event.petId, recordId: event.recordId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: 'reminders',
        },
      });
    }
  }

  // 2. Lembretes de dose diária para remédios ativos (até 14 dias à frente)
  const today = todayISO();
  for (const med of activeMeds) {
    const pet = pets.find(p => p.id === med.petId);
    const times = med.frequency ? FREQUENCY_TIMES[med.frequency] : [{ hour: 8, minute: 0 }];
    const endDate = med.endDate ?? addDays(today, 365);
    for (let i = 0; i <= 14; i++) {
      const dayISO = addDays(today, i);
      if (dayISO > endDate) break;
      const [y, m, d] = dayISO.split('-').map(Number);
      for (const { hour, minute } of times) {
        const when = new Date(y, m - 1, d, hour, minute, 0);
        if (when.getTime() <= Date.now()) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 Dose de ${med.title}`,
            body: `${pet?.name ?? 'Seu pet'} precisa tomar${med.dosage ? ` ${med.dosage}` : ''} agora.`,
            data: { petId: med.petId, recordId: med.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: when,
            channelId: 'doses',
          },
        });
      }
    }
  }

  // 3. Digest matinal (amanhã às 9h) — só quando há itens pendentes ou próximos
  const overdueEvents = events.filter(e => e.pending);
  const soonEvents = events.filter(e => !e.pending && e.daysUntil >= 0 && e.daysUntil <= 7);
  if (overdueEvents.length > 0 || soonEvents.length > 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(REMINDER_HOUR, 0, 0, 0);

    const overdueCount = overdueEvents.length;
    const soonCount = soonEvents.length;
    let body = '';
    if (overdueCount > 0 && soonCount > 0)
      body = `${overdueCount} ${overdueCount === 1 ? 'item atrasado' : 'itens atrasados'} e ${soonCount} ${soonCount === 1 ? 'evento esta semana' : 'eventos esta semana'}.`;
    else if (overdueCount > 0)
      body = `${overdueCount} ${overdueCount === 1 ? 'item está atrasado' : 'itens estão atrasados'}. Verifique agora.`;
    else
      body = `${soonCount} ${soonCount === 1 ? 'evento chegando esta semana' : 'eventos chegando esta semana'}. Fique preparado!`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🐾 Resumo PetCare do dia',
        body,
        data: {},
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: tomorrow,
        channelId: 'reminders',
      },
    });
  }

  // 4. Aniversário de chegada ao lar (recorrente, todo ano)
  for (const pet of pets) {
    if (!pet.createdAt) continue;
    const trigger = yearlyTriggerAt(pet.createdAt.slice(0, 10));
    if (!trigger) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎉 Aniversário de chegada de ${pet.name}!`,
        body: `Hoje é o dia em que ${pet.name} chegou na sua família. Que tal guardar essa memória no PetCare?`,
        data: { petId: pet.id },
      },
      trigger,
    });
  }

  // 5. Memórias marcantes (recorrente, todo ano)
  for (const memory of memories) {
    const trigger = yearlyTriggerAt(memory.date);
    if (!trigger) continue;
    const pet = pets.find(p => p.id === memory.petId);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `❤️ Memória de ${pet?.name ?? 'seu pet'}`,
        body: `Há algum tempo: "${memory.title}". Reviva esse momento na Linha da Vida!`,
        data: { petId: memory.petId, recordId: memory.id },
      },
      trigger,
    });
  }
}
