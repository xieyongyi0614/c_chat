import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import durationPlugin from 'dayjs/plugin/duration';
import 'dayjs/locale/zh-cn';

// 加载插件
dayjs.extend(relativeTime);
dayjs.extend(calendar);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(durationPlugin);
dayjs.locale('zh-cn');

/**
 * IM 时间格式化工具类
 */
export class ImTimeFormatter {
  /**
   * 格式化时间戳为相对时间
   * @param timestamp 时间戳（毫秒）
   * @returns 相对时间字符串（如："刚刚"、"5分钟前"、"昨天 14:30"）
   */
  static formatRelativeTime(timestamp: number | string): string {
    const now = dayjs();
    const targetTime = dayjs(Number(timestamp));

    if (targetTime.isSame(now, 'day')) {
      // 今天：显示相对时间
      return targetTime.fromNow();
    } else if (targetTime.isSame(now.subtract(1, 'day'), 'day')) {
      // 昨天：显示"昨天 HH:mm"
      return `昨天 ${targetTime.format('HH:mm')}`;
    } else if (targetTime.isSame(now, 'year')) {
      // 今年：显示"MM-DD HH:mm"
      return targetTime.format('MM-DD HH:mm');
    } else {
      // 其他年份：显示"YYYY-MM-DD HH:mm"
      return targetTime.format('YYYY-MM-DD HH:mm');
    }
  }

  /**
   * 格式化时间为聊天消息时间
   * @param timestamp 时间戳（毫秒）
   * @returns 适合聊天消息的时间字符串
   */
  static formatChatTime(timestamp: number | string): string {
    const now = dayjs();
    const targetTime = dayjs(Number(timestamp));

    if (targetTime.isSame(now, 'day')) {
      return targetTime.format('HH:mm');
    } else if (targetTime.isSame(now, 'week')) {
      return targetTime.calendar(null, {
        sameDay: '[今天] HH:mm',
        nextDay: '[明天] HH:mm',
        nextWeek: 'dddd HH:mm',
        lastDay: '[昨天] HH:mm',
        lastWeek: '[上周] dddd HH:mm',
        sameElse: 'MM-DD HH:mm',
      });
    } else {
      return targetTime.format('MM-DD HH:mm');
    }
  }

  /**
   * 格式化时间为详细信息
   * @param timestamp 时间戳（毫秒）
   * @returns 详细时间信息对象
   */
  static formatDetailedTime(timestamp: number | string): {
    relative: string; // 相对时间
    absolute: string; // 绝对时间
    date: string; // 日期部分
    time: string; // 时间部分
    isToday: boolean; // 是否今天
    isYesterday: boolean; // 是否昨天
  } {
    const targetTime = dayjs(Number(timestamp));
    const now = dayjs();

    return {
      relative: this.formatRelativeTime(timestamp),
      absolute: targetTime.format('YYYY-MM-DD HH:mm:ss'),
      date: targetTime.format('YYYY-MM-DD'),
      time: targetTime.format('HH:mm:ss'),
      isToday: targetTime.isSame(now, 'day'),
      isYesterday: targetTime.isSame(now.subtract(1, 'day'), 'day'),
    };
  }

  /**
   * 计算时间差
   * @param startTime 开始时间戳
   * @param endTime 结束时间戳（默认为当前时间）
   * @returns 时间差信息
   */
  static calculateTimeDiff(
    startTime: number | string,
    endTime?: number | string,
  ): {
    milliseconds: number;
    seconds: number;
    minutes: number;
    hours: number;
    days: number;
    formatted: string;
  } {
    const start = dayjs(Number(startTime));
    const end = endTime ? dayjs(Number(endTime)) : dayjs();

    const diff = end.diff(start);
    const duration = dayjs.duration(diff);

    return {
      milliseconds: diff,
      seconds: Math.floor(diff / 1000),
      minutes: Math.floor(diff / (1000 * 60)),
      hours: Math.floor(diff / (1000 * 60 * 60)),
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      formatted: duration.humanize(),
    };
  }

  /**
   * 检查时间是否在指定范围内
   * @param timestamp 时间戳
   * @param rangeMinutes 范围（分钟）
   * @param referenceTime 参考时间（默认为当前时间）
   * @returns 是否在范围内
   */
  static isWithinRange(
    timestamp: number | string,
    rangeMinutes: number,
    referenceTime?: number | string,
  ): boolean {
    const targetTime = dayjs(Number(timestamp));
    const refTime = referenceTime ? dayjs(Number(referenceTime)) : dayjs();

    const diffMinutes = Math.abs(targetTime.diff(refTime, 'minute'));
    return diffMinutes <= rangeMinutes;
  }

  /**
   * 格式化在线状态时间
   * @param lastSeenTimestamp 最后活跃时间戳
   * @returns 在线状态描述
   */
  static formatOnlineStatus(lastSeenTimestamp: number | string): string {
    const now = dayjs();
    const lastSeen = dayjs(Number(lastSeenTimestamp));

    if (lastSeen.isAfter(now.subtract(5, 'minute'))) {
      return '在线';
    } else if (lastSeen.isAfter(now.subtract(30, 'minute'))) {
      return `最近 30 分钟内`;
    } else if (lastSeen.isAfter(now.subtract(1, 'hour'))) {
      return `最近 1 小时内`;
    } else if (lastSeen.isAfter(now.subtract(1, 'day'))) {
      return `最近 1 天内`;
    } else {
      return `最近: ${lastSeen.format('MM-DD')}`;
    }
  }

  /**
   * 格式化消息发送时间（紧凑版）
   * @param timestamp 时间戳
   * @returns 紧凑的时间格式
   */
  static formatCompactTime(timestamp: number | string): string {
    const targetTime = dayjs(Number(timestamp));
    const now = dayjs();

    if (targetTime.isSame(now, 'day')) {
      return targetTime.format('HH:mm');
    } else if (targetTime.isSame(now, 'week')) {
      return targetTime.format('ddd HH:mm');
    } else if (targetTime.isSame(now, 'year')) {
      return targetTime.format('MM-DD');
    } else {
      return targetTime.format('YY-MM-DD');
    }
  }

  /**
   * 获取时间范围内的所有日期
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 日期数组
   */
  static getDatesInRange(startDate: string | number, endDate: string | number): string[] {
    const start = dayjs(Number(startDate));
    const end = dayjs(Number(endDate));
    const dates: string[] = [];

    let currentDate = start.startOf('day');
    while (currentDate.isSameOrBefore(end, 'day')) {
      dates.push(currentDate.format('YYYY-MM-DD'));
      currentDate = currentDate.add(1, 'day');
    }

    return dates;
  }

  static getDateKey(timestamp: number | string): string {
    const date = dayjs(Number(timestamp));
    return date.format('D MMM, YYYY');
  }
}

// 导出常用函数的便捷别名
export const {
  formatRelativeTime,
  formatChatTime,
  formatDetailedTime,
  calculateTimeDiff,
  isWithinRange,
  formatOnlineStatus,
  formatCompactTime,
  getDateKey,
} = ImTimeFormatter;

// 使用示例
/*
// 相对时间格式化
console.log(formatRelativeTime(Date.now() - 60000)); // "1分钟前"

// 聊天时间格式化
console.log(formatChatTime(Date.now() - 86400000)); // "昨天 14:30"

// 详细时间信息
console.log(formatDetailedTime(Date.now()));

// 在线状态
console.log(formatOnlineStatus(Date.now() - 300000)); // "在线"
*/
