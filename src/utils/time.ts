export function formatThaiDateTime(value: string | number | Date | null | undefined) {
  if (value == null || value === '') return '-';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '-';
  }

  try {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok',
    }).format(date);
  } catch {
    return date.toLocaleString('th-TH', {
      hour12: false,
      timeZone: 'Asia/Bangkok',
    });
  }
}

export function formatThaiTime(value: string | number | Date | null | undefined) {
  if (value == null || value === '') return '-';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '-';
  }

  try {
    return new Intl.DateTimeFormat('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok',
    }).format(date);
  } catch {
    return date.toLocaleTimeString('th-TH', {
      hour12: false,
      timeZone: 'Asia/Bangkok',
    });
  }
}
