/**
 * Availability utility function.
 * - If no schedule is set at all → donor is always available.
 * - If a day has NO entry in the schedule → donor is FREE ALL DAY on that day.
 * - If a day HAS an entry → donor is only available within that time window.
 */
export function isUserAvailableNow(schedule: any, currentDateTime: Date = new Date()): boolean {
    if (!schedule || Object.keys(schedule).length === 0) return true;

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[currentDateTime.getDay()];

    const daySchedule = schedule[currentDay];

    // Day has no restriction → free all day
    if (!daySchedule || !daySchedule.start || !daySchedule.end) {
        return true;
    }

    const currentHours = String(currentDateTime.getHours()).padStart(2, '0');
    const currentMinutes = String(currentDateTime.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    return currentTimeStr >= daySchedule.start && currentTimeStr <= daySchedule.end;
}
