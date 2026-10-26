/** Summary micro-strings (DESIGN §6.2). Owner: WP-05. */
import type { Lang } from '../../core/types';

export interface SummaryStrings {
  ledgerCaption: string;
  nowIn: string;
  /** Local time line: {city} and {time} are replaced. */
  localTime: string;
  overlapping: string;
  intersect: string;
  vanishing: string;
  institution: string;
  cities: Readonly<Record<string, string>>;
}

export const strings: Readonly<Record<Lang, SummaryStrings>> = {
  ja: {
    ledgerCaption: '職歴：会社、役職、期間、主な担当', nowIn: '現地時刻', localTime: '{city}は今 {time}', overlapping: '重なっている時間',
    intersect: '交差', vanishing: '消点', institution: 'メトロポリタン美術館',
    cities: { 'Europe/Berlin': 'ベルリン', 'America/Los_Angeles': 'ロサンゼルス' },
  },
  en: {
    ledgerCaption: 'Career ledger: company, role, dates and scope', nowIn: 'now', localTime: 'now {time} in {city}', overlapping: 'overlapping now',
    intersect: 'intersect', vanishing: 'vanishing point', institution: 'The Metropolitan Museum of Art',
    cities: { 'Europe/Berlin': 'Berlin', 'America/Los_Angeles': 'Los Angeles' },
  },
  zh: {
    ledgerCaption: '工作经历：公司、职位、时间与主要职责', nowIn: '当地时间', localTime: '{city}此刻 {time}', overlapping: '正处于重叠时段',
    intersect: '交叉', vanishing: '消失点', institution: '大都会艺术博物馆',
    cities: { 'Europe/Berlin': '柏林', 'America/Los_Angeles': '洛杉矶' },
  },
};

export const display: Partial<Record<Lang, string>> = {};
