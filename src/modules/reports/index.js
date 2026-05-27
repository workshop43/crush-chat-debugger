/**
 * 报告类型注册表。
 *
 * 新增一种诊断风格 = 新建一个报告模块文件 + 在这里登记一行，其余代码不用动。
 */
import { incidentReport } from './incident.js';
import { growthReport } from './growth.js';
import { hrReport } from './hr.js';
import { vcReport } from './vc.js';

/** 键即下拉框的 value，对象顺序即下拉框顺序（第一个为默认）。 */
export const REPORTS = {
  programmer: incidentReport,
  pm: growthReport,
  hr: hrReport,
  vc: vcReport,
};

/** 取报告模块，未知键回退到第一个。 */
export function getReport(key) {
  return REPORTS[key] ?? incidentReport;
}
