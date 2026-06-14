import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Pet, MedicalRecord } from '../types';
import { getUpcomingEvents } from './events';

// Lembretes são exibidos mesmo com o app aberto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const REMINDER_HOUR = 9; // notificações sempre às 9h da manhã

let permissionAsked = false;
let lastSyncSignature: string | null = null;

export async function ensureNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (!settings.canAskAgain) return false;
  if (permissionAsked) return false;
  permissionAsked = true;
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

function triggerAt(dateISO: string, daysBefore: number): Date | null {
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m || !d) return null;
  const when = new Date(y, m - 1, d - daysBefore, REMINDER_HOUR, 0, 0);
  return when.getTime() > Date.now() ? when : null;
}

/** Trigger anual recorrente no mesmo dia/mês da data informada. */
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

/**
 * Reagenda todas as notificações locais a partir dos eventos futuros
 * (reforço de vacina, retorno, fim de tratamento, próxima dose).
 * Usa os `reminderDays` configurados no registro, ou o dia do evento.
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

  // Evita cancelar e reagendar tudo de novo se nada relevante mudou desde a última sincronização.
  const signature = JSON.stringify([
    events.map(e => [e.recordId, e.date, recordById.get(e.recordId)?.reminderDays ?? null]),
    pets.map(p => [p.id, p.createdAt]),
    memories.map(m => [m.id, m.date, m.title]),
  ]);
  if (signature === lastSyncSignature) return;
  lastSyncSignature = signature;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

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

  // Aniversário de chegada ao lar (recorrente, todo ano).
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

  // Memórias com data marcante (recorrente, todo ano).
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
