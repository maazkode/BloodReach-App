/**
 * Availability utility function
 * Checks if the current day and time falls within the user's scheduled range.
 */
export function isUserAvailableNow(schedule: any, currentDateTime: Date): boolean {
    if (!schedule) return false;

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[currentDateTime.getUTCDay()];

    const daySchedule = schedule[currentDay];
    if (!daySchedule || !daySchedule.start || !daySchedule.end) {
        return false;
    }

    const currentHours = String(currentDateTime.getUTCHours()).padStart(2, '0');
    const currentMinutes = String(currentDateTime.getUTCMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    return currentTimeStr >= daySchedule.start && currentTimeStr <= daySchedule.end;
}
