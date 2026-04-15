/**
 * Convert backend enum-like values (e.g., "case_study", "in_progress")
 * into user-friendly title case labels for UI rendering.
 */
export function formatLabel(value: string): string {
	return value
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}
